import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { getDatabase, ref, onValue, update } from 'firebase/database';
import { db, setMeta } from '../db';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

let userId: string | null = null;
let isInitialized = false;

export function getCurrentUser() {
  return auth.currentUser;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    userId = user.uid;
    isInitialized = true;
    console.log('Signed in as:', email);

    listenToItems();
    listenToSongs();
    listenToSetlists();
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<void> {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    userId = user.uid;
    isInitialized = true;
    console.log('Account created:', email);

    listenToItems();
    listenToSongs();
    listenToSetlists();
  } catch (error) {
    console.error('Sign up failed:', error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
    userId = null;
    isInitialized = false;
    console.log('Signed out');
  } catch (error) {
    console.error('Sign out failed:', error);
    throw error;
  }
}

export async function initFirebase(): Promise<void> {
  if (isInitialized) return;

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();

      if (user) {
        userId = user.uid;
        isInitialized = true;
        console.log('Firebase initialized for user:', userId);

        listenToItems();
        listenToSongs();
        listenToSetlists();
      } else {
        isInitialized = true;
      }

      resolve();
    }, reject);
  });
}

// Listen to items changes in Firebase
function listenToItems() {
  if (!userId) return;

  const itemsRef = ref(database, `users/${userId}/items`);

  onValue(itemsRef, async (snapshot) => {
    const remoteItems = snapshot.val() || {};

    await db.transaction('rw', db.items, async () => {
      for (const [id, remoteItem] of Object.entries(remoteItems)) {
        const item = remoteItem as any;
        const local = await db.items.get(id);

        // Last write wins: keep local if it's newer and not synced yet
        if (local?.pendingSync === 1 && local.updatedAt > item.updatedAt) {
          continue;
        }

        await db.items.put({
          id,
          name: item.name,
          notes: item.notes,
          updatedAt: item.updatedAt,
          deleted: item.deleted,
          pendingSync: 0
        });
      }
    });
  });
}

// Listen to songs changes in Firebase
function listenToSongs() {
  if (!userId) return;

  const songsRef = ref(database, `users/${userId}/songs`);

  onValue(songsRef, async (snapshot) => {
    const remoteSongs = snapshot.val() || {};

    await db.transaction('rw', db.songs, async () => {
      for (const [id, remoteSong] of Object.entries(remoteSongs)) {
        const song = remoteSong as any;
        const local = await db.songs.get(id);

        if (local?.pendingSync === 1 && local.updatedAt > song.updatedAt) {
          continue;
        }

        await db.songs.put({
          id,
          name: song.name,
          bpm: song.bpm,
          updatedAt: song.updatedAt,
          deleted: song.deleted,
          pendingSync: 0
        });
      }
    });
  });
}

// Listen to setlists changes in Firebase
function listenToSetlists() {
  if (!userId) return;

  const setlistsRef = ref(database, `users/${userId}/setlists`);
  const setlistItemsRef = ref(database, `users/${userId}/setlistItems`);

  onValue(setlistsRef, async (snapshot) => {
    const remoteSetlists = snapshot.val() || {};

    await db.transaction('rw', db.setlists, async () => {
      for (const [id, remoteSetlist] of Object.entries(remoteSetlists)) {
        const setlist = remoteSetlist as any;
        const local = await db.setlists.get(id);

        if (local?.pendingSync === 1 && local.updatedAt > setlist.updatedAt) {
          continue;
        }

        await db.setlists.put({
          id,
          name: setlist.name,
          createdAt: setlist.createdAt,
          updatedAt: setlist.updatedAt,
          deleted: setlist.deleted,
          pendingSync: 0
        });
      }
    });
  });

  onValue(setlistItemsRef, async (snapshot) => {
    const remoteItems = snapshot.val() || {};

    await db.transaction('rw', db.setlistItems, async () => {
      for (const [id, remoteItem] of Object.entries(remoteItems)) {
        const item = remoteItem as any;
        const local = await db.setlistItems.get(id);

        if (local?.pendingSync === 1 && local.updatedAt > item.updatedAt) {
          continue;
        }

        await db.setlistItems.put({
          id,
          setlistId: item.setlistId,
          songId: item.songId,
          position: item.position,
          section: item.section,
          updatedAt: item.updatedAt,
          deleted: item.deleted,
          pendingSync: 0
        });
      }
    });
  });
}

// Push items to Firebase
async function pushItems(): Promise<number> {
  if (!userId) return 0;

  const pending = await db.items.where('pendingSync').equals(1).toArray();

  if (pending.length === 0) return 0;

  const updates: Record<string, any> = {};
  pending.forEach((item) => {
    const { pendingSync: _, ...itemData } = item;
    const cleanData = Object.fromEntries(
      Object.entries(itemData).filter(([_, v]) => v !== undefined)
    );
    updates[`users/${userId}/items/${item.id}`] = cleanData;
  });

  await update(ref(database), updates);

  // Mark as synced
  await db.transaction('rw', db.items, async () => {
    for (const item of pending) {
      const current = await db.items.get(item.id);
      if (current && current.updatedAt === item.updatedAt) {
        await db.items.update(item.id, { pendingSync: 0 });
      }
    }
  });

  return pending.length;
}

// Push songs to Firebase
async function pushSongs(): Promise<number> {
  if (!userId) return 0;

  const pending = await db.songs.where('pendingSync').equals(1).toArray();

  if (pending.length === 0) return 0;

  const updates: Record<string, any> = {};
  pending.forEach((song) => {
    const { pendingSync: _, ...songData } = song;
    const cleanData = Object.fromEntries(
      Object.entries(songData).filter(([_, v]) => v !== undefined)
    );
    updates[`users/${userId}/songs/${song.id}`] = cleanData;
  });

  await update(ref(database), updates);

  // Mark as synced
  await db.transaction('rw', db.songs, async () => {
    for (const song of pending) {
      const current = await db.songs.get(song.id);
      if (current && current.updatedAt === song.updatedAt) {
        await db.songs.update(song.id, { pendingSync: 0 });
      }
    }
  });

  return pending.length;
}

// Push setlists to Firebase
async function pushSetlists(): Promise<number> {
  if (!userId) return 0;

  const pendingSetlists = await db.setlists.where('pendingSync').equals(1).toArray();
  const pendingItems = await db.setlistItems.where('pendingSync').equals(1).toArray();

  if (pendingSetlists.length === 0 && pendingItems.length === 0) return 0;

  const updates: Record<string, any> = {};

  pendingSetlists.forEach((setlist) => {
    const { pendingSync: _, ...data } = setlist;
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    updates[`users/${userId}/setlists/${setlist.id}`] = cleanData;
  });

  pendingItems.forEach((item) => {
    const { pendingSync: _, ...data } = item;
    // Remove undefined properties that Firebase can't store
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    updates[`users/${userId}/setlistItems/${item.id}`] = cleanData;
  });

  await update(ref(database), updates);

  // Mark as synced
  await db.transaction('rw', db.setlists, db.setlistItems, async () => {
    for (const setlist of pendingSetlists) {
      const current = await db.setlists.get(setlist.id);
      if (current && current.updatedAt === setlist.updatedAt) {
        await db.setlists.update(setlist.id, { pendingSync: 0 });
      }
    }
    for (const item of pendingItems) {
      const current = await db.setlistItems.get(item.id);
      if (current && current.updatedAt === item.updatedAt) {
        await db.setlistItems.update(item.id, { pendingSync: 0 });
      }
    }
  });

  return pendingSetlists.length + pendingItems.length;
}

// Main sync function
export async function syncWithFirebase() {
  try {
    // Push local changes
    const [itemsPushed, songsPushed, setlistsPushed] = await Promise.all([
      pushItems(),
      pushSongs(),
      pushSetlists()
    ]);

    await setMeta('lastSyncedAt', Date.now());

    return {
      pushed: itemsPushed + songsPushed + setlistsPushed,
      pulled: 0 // Firebase listeners handle pulling
    };
  } catch (error) {
    console.error('Firebase sync failed:', error);
    throw error;
  }
}

export { isInitialized };
