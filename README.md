# PWA Starter (React)

An offline-first React PWA with tab navigation and a small (≤500 row) list that
syncs with an external service when one is available. The app never depends on
the service: all reads and writes go to IndexedDB on the device.

## Stack

- **Vite** for dev server and build
- **vite-plugin-pwa** (Workbox) for the service worker and manifest
- **React Router** for tabs
- **Dexie.js** + `dexie-react-hooks` for IndexedDB with live queries
- **lucide-react** for tab icons

## Getting started

```bash
npm install
cp .env.example .env      # optional: set VITE_API_BASE to enable sync
npm run dev
```

The service worker is only generated in production builds. To test offline
behaviour and installation, run:

```bash
npm run build && npm run preview
```

Then in Chrome DevTools, use Application → Service workers → Offline.

If `npm install` complains about peer versions, update the version ranges in
`package.json` to the current releases.

## Project structure

```
src/
  db.ts                 Dexie schema and all data-changing functions
  sync/syncEngine.ts    One push-then-pull sync cycle
  sync/SyncContext.tsx  When to sync, and sync status for the UI
  tabs.ts               Tab list: add a tab by adding an entry here
  tabs/                 One component per tab
  components/           Header, tab bar, update prompt
```

## How sync works

1. Every local change sets `updatedAt` and `pendingSync = 1`.
2. Deletes are soft (`deleted = 1`) so they can be pushed, then purged.
3. A sync cycle pushes pending records, then pulls everything changed since the
   last `serverTime` the server returned.
4. Conflicts are last-write-wins by `updatedAt`.
5. Sync runs on launch, when the connection returns, when the app returns to
   the foreground, about two seconds after an edit, and every five minutes.

### API your service needs to provide

```
POST /items/batch          body: { items: RemoteItem[] }        → 2xx
GET  /items?since=<number> → { items: RemoteItem[], serverTime: number }

RemoteItem = { id: string, name: string, notes: string,
               updatedAt: number, deleted: 0 | 1 }
```

The server should upsert pushed items (honouring `updatedAt` if it wants
server-side conflict checks) and return tombstones in pulls so deletions reach
other devices. If your service has a different shape, only
`src/sync/syncEngine.ts` needs to change.

If the service is on a different origin, it must send CORS headers.

## Things to know

- **iOS/Safari has no Background Sync.** Sync only happens while the app is
  open, which is why this starter syncs in the foreground on several triggers.
- **Storage can be evicted.** The app requests persistent storage at launch; the
  Settings tab shows whether it was granted. The remote copy is your recovery
  path if local data is lost.
- **Last-write-wins uses device clocks** for conflicts. That's fine for one user
  across a few devices. For multiple people editing the same rows, consider
  server-assigned versions, or a sync engine such as Dexie Cloud, RxDB or
  PowerSync.
- **Updates prompt rather than auto-reload**, so a new version never interrupts
  someone mid-edit.
