import Dexie, { type EntityTable } from 'dexie';

function generateId(): string {
  // Use crypto.randomUUID if available, otherwise fall back to a simple UUID v4-like generator
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback UUID v4-like generator that works in all environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * IndexedDB is the source of truth. The UI only ever reads and writes here;
 * the sync engine reconciles with the remote service in the background.
 *
 * IndexedDB cannot index booleans, so flags are stored as 0 | 1.
 */
export interface Item {
  id: string;
  name: string;
  notes: string;
  updatedAt: number; // ms since epoch, set on every local change
  deleted: 0 | 1; // soft-delete tombstone so deletions can be synced
  pendingSync: 0 | 1; // 1 = changed locally, not yet pushed
}

export interface Song {
  id: string;
  name: string;
  bpm: number;
  updatedAt: number;
  deleted: 0 | 1;
  pendingSync: 0 | 1;
}

export interface SetlistItem {
  id: string;
  setlistId: string;
  songId: string;
  position: number;
  section?: string; // 'Set 1', 'Set 2', 'Set 3', 'Encore'
  updatedAt: number;
  deleted: 0 | 1;
  pendingSync: 0 | 1;
}

export interface Setlist {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  deleted: 0 | 1;
  pendingSync: 0 | 1;
}

interface Meta {
  key: string;
  value: unknown;
}

export const MAX_ITEMS = 500;

export const db = new Dexie('beat-foundry') as Dexie & {
  items: EntityTable<Item, 'id'>;
  meta: EntityTable<Meta, 'key'>;
  songs: EntityTable<Song, 'id'>;
  setlists: EntityTable<Setlist, 'id'>;
  setlistItems: EntityTable<SetlistItem, 'id'>;
};

db.version(1).stores({
  items: 'id, name, updatedAt, deleted, pendingSync',
  meta: 'key'
});

db.version(2).stores({
  items: 'id, name, updatedAt, deleted, pendingSync',
  meta: 'key',
  songs: 'id, name, updatedAt, deleted, pendingSync',
  setlists: 'id, updatedAt, deleted, pendingSync',
  setlistItems: 'id, setlistId, songId, position, updatedAt, deleted, pendingSync'
});

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value });
}

export function liveItemCount() {
  return db.items.where('deleted').equals(0).count();
}

export async function createItem(input: { name: string; notes?: string }) {
  if ((await liveItemCount()) >= MAX_ITEMS) {
    throw new Error(`The list is full. Remove an item to add a new one (limit ${MAX_ITEMS}).`);
  }
  await db.items.add({
    id: generateId(),
    name: input.name.trim(),
    notes: input.notes?.trim() ?? '',
    updatedAt: Date.now(),
    deleted: 0,
    pendingSync: 1
  });
}

export async function updateItem(id: string, changes: Partial<Pick<Item, 'name' | 'notes'>>) {
  await db.items.update(id, { ...changes, updatedAt: Date.now(), pendingSync: 1 });
}

export async function deleteItem(id: string) {
  await db.items.update(id, { deleted: 1, updatedAt: Date.now(), pendingSync: 1 });
}

export async function clearLocalData() {
  await db.transaction('rw', db.items, db.meta, async () => {
    await db.items.clear();
    await db.meta.clear();
  });
}

// Song management
export async function createSong(input: { name: string; bpm: number }) {
  await db.songs.add({
    id: generateId(),
    name: input.name.trim(),
    bpm: input.bpm,
    updatedAt: Date.now(),
    deleted: 0,
    pendingSync: 1
  });
}

export async function updateSong(id: string, changes: Partial<Pick<Song, 'name' | 'bpm'>>) {
  await db.songs.update(id, { ...changes, updatedAt: Date.now(), pendingSync: 1 });
}

export async function deleteSong(id: string) {
  await db.songs.update(id, { deleted: 1, updatedAt: Date.now(), pendingSync: 1 });
}

// Setlist management
export async function createSetlist(input: { name: string }) {
  return await db.setlists.add({
    id: generateId(),
    name: input.name.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deleted: 0,
    pendingSync: 1
  });
}

export async function updateSetlist(id: string, changes: Partial<Pick<Setlist, 'name'>>) {
  await db.setlists.update(id, { ...changes, updatedAt: Date.now(), pendingSync: 1 });
}

export async function deleteSetlist(id: string) {
  await db.setlists.update(id, { deleted: 1, updatedAt: Date.now(), pendingSync: 1 });
}

// Setlist item management
export async function addSetlistItem(input: { setlistId: string; songId: string; position: number; section?: string }) {
  await db.setlistItems.add({
    id: generateId(),
    setlistId: input.setlistId,
    songId: input.songId,
    position: input.position,
    section: input.section,
    updatedAt: Date.now(),
    deleted: 0,
    pendingSync: 1
  });
}

export async function updateSetlistItem(id: string, changes: Partial<Pick<SetlistItem, 'position' | 'section'>>) {
  await db.setlistItems.update(id, { ...changes, updatedAt: Date.now(), pendingSync: 1 });
}

export async function deleteSetlistItem(id: string) {
  await db.setlistItems.update(id, { deleted: 1, updatedAt: Date.now(), pendingSync: 1 });
}
