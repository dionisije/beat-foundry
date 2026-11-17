import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getMeta } from '../db';
import {
  initFirebase,
  syncWithFirebase,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  getCurrentUser
} from './firebase';

export type SyncStatus = 'local-only' | 'idle' | 'syncing' | 'offline' | 'error';

interface SyncContextValue {
  status: SyncStatus;
  error: string | null;
  pendingCount: number;
  lastSyncedAt: number | undefined;
  sync: () => Promise<void>;
  currentUser: string | null;
  authError: string | null;
  authLoading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

const SYNC_INTERVAL_MS = 5 * 60 * 1000;
const DEBOUNCE_AFTER_EDIT_MS = 2_000;

const isSyncConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

const SyncContext = createContext<SyncContextValue | null>(null);

/**
 * Sync is opportunistic: on launch, when the connection returns, when the app
 * comes back to the foreground, shortly after local edits, and on a timer.
 * Background Sync isn't available in Safari, so this foreground approach is
 * what works everywhere.
 */
export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>(
    !isSyncConfigured ? 'local-only' : navigator.onLine ? 'idle' : 'offline'
  );
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const pendingItems = useLiveQuery(() => db.items.where('pendingSync').equals(1).count(), [], 0);
  const pendingSongs = useLiveQuery(() => db.songs.where('pendingSync').equals(1).count(), [], 0);
  const pendingSetlists = useLiveQuery(() => db.setlists.where('pendingSync').equals(1).count(), [], 0);
  const pendingSetlistItems = useLiveQuery(() => db.setlistItems.where('pendingSync').equals(1).count(), [], 0);
  const pendingCount = pendingItems + pendingSongs + pendingSetlists + pendingSetlistItems;
  const lastSyncedAt = useLiveQuery(() => getMeta<number>('lastSyncedAt'), []);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithEmail(email, password);
      setCurrentUser(email);
      void sync();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Sign in failed');
      throw e;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleSignup = useCallback(async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signUpWithEmail(email, password);
      setCurrentUser(email);
      void sync();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Sign up failed');
      throw e;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setAuthLoading(true);
    try {
      await signOutUser();
      setCurrentUser(null);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Sign out failed');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const sync = useCallback(async () => {
    if (!isSyncConfigured) return;
    if (!navigator.onLine) {
      setStatus('offline');
      return;
    }
    setStatus('syncing');
    setError(null);
    try {
      await syncWithFirebase();
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (!isSyncConfigured) return;

    // Initialize Firebase and check if user is logged in
    initFirebase()
      .then(() => {
        const user = getCurrentUser();
        if (user) {
          setCurrentUser(user.email);
          void sync();
        }
      })
      .catch((err) => {
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      });

    const onOnline = () => void sync();
    const onOffline = () => setStatus('offline');
    const onVisible = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => void sync(), SYNC_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [sync]);

  // Push edits soon after they happen, batching rapid changes together.
  useEffect(() => {
    if (!isSyncConfigured || pendingCount === 0) return;
    const t = window.setTimeout(() => void sync(), DEBOUNCE_AFTER_EDIT_MS);
    return () => window.clearTimeout(t);
  }, [pendingCount, sync]);

  return (
    <SyncContext.Provider
      value={{
        status,
        error,
        pendingCount,
        lastSyncedAt,
        sync,
        currentUser,
        authError,
        authLoading,
        onLogin: handleLogin,
        onSignup: handleSignup,
        onLogout: handleLogout
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}

export function describeStatus(status: SyncStatus, pendingCount: number) {
  switch (status) {
    case 'local-only':
      return 'Saved on this device';
    case 'syncing':
      return 'Syncing…';
    case 'offline':
      return pendingCount > 0 ? `Offline, ${pendingCount} to sync` : 'Offline';
    case 'error':
      return 'Sync failed';
    default:
      return pendingCount > 0 ? `${pendingCount} to sync` : 'Synced';
  }
}
