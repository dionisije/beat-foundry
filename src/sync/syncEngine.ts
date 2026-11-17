import { db, getMeta, setMeta, type Item } from '../db';

/**
 * Expected API contract (adapt to your service):
 *
 *   POST {API_BASE}/items/batch
 *     body:     { items: RemoteItem[] }
 *     response: 2xx on success
 *
 *   GET  {API_BASE}/items?since=<serverTime>
 *     response: { items: RemoteItem[], serverTime: number }
 *     Returns everything changed after `since`, including tombstones.
 *
 * RemoteItem = { id, name, notes, updatedAt, deleted }
 */
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 15_000;

export const isSyncConfigured = API_BASE.length > 0;

type RemoteItem = Omit<Item, 'pendingSync'>;

export interface SyncResult {
  pushed: number;
  pulled: number;
}

let inFlight: Promise<SyncResult> | null = null;

/** Runs one push-then-pull cycle. Concurrent calls share the same run. */
export function syncNow(): Promise<SyncResult> {
  if (!inFlight) {
    inFlight = runSync().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!res.ok) throw new Error(`Sync service responded ${res.status} for ${path}`);
  return res;
}

async function runSync(): Promise<SyncResult> {
  if (!isSyncConfigured) return { pushed: 0, pulled: 0 };

  // 1. Push local changes.
  const pending = await db.items.where('pendingSync').equals(1).toArray();
  if (pending.length > 0) {
    const payload: RemoteItem[] = pending.map(({ pendingSync: _ignored, ...rest }) => rest);
    await request('/items/batch', { method: 'POST', body: JSON.stringify({ items: payload }) });

    // Clear the flag only if the record wasn't edited again while we were pushing.
    await db.transaction('rw', db.items, async () => {
      for (const sent of pending) {
        const current = await db.items.get(sent.id);
        if (current && current.updatedAt === sent.updatedAt) {
          await db.items.update(sent.id, { pendingSync: 0 });
        }
      }
    });
  }

  // 2. Pull remote changes since the last server timestamp we saw.
  //    Using server time avoids problems with a device clock that is wrong.
  const since = (await getMeta<number>('lastPulledAt')) ?? 0;
  const res = await request(`/items?since=${since}`);
  const { items, serverTime } = (await res.json()) as { items: RemoteItem[]; serverTime: number };

  await db.transaction('rw', db.items, db.meta, async () => {
    for (const remote of items) {
      const local = await db.items.get(remote.id);
      // Last write wins: keep an unsynced local edit if it is newer.
      if (local?.pendingSync === 1 && local.updatedAt > remote.updatedAt) continue;
      await db.items.put({ ...remote, pendingSync: 0 });
    }
    await setMeta('lastPulledAt', serverTime);
  });

  // 3. Tombstones that the server has acknowledged are no longer needed.
  await db.items
    .where('deleted')
    .equals(1)
    .and((item) => item.pendingSync === 0)
    .delete();

  await setMeta('lastSyncedAt', Date.now());
  return { pushed: pending.length, pulled: items.length };
}
