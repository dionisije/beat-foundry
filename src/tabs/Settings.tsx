import { useEffect, useState } from 'react';
import { clearLocalData, clearAllSetlistData } from '../db';
import { describeStatus, useSync } from '../sync/SyncContext';
import { formatTime } from '../format';

export default function Settings() {
  const { status, error, pendingCount, lastSyncedAt, sync } = useSync();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<string>('');

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersisted);
    void navigator.storage?.estimate?.().then(({ usage = 0 }) => setUsage(`${(usage / 1024).toFixed(0)} KB`));
  }, []);

  async function handleClear() {
    const warning =
      pendingCount > 0
        ? `${pendingCount} changes haven't synced and will be lost. Clear all local data?`
        : 'Clear all data stored on this device?';
    if (!confirm(warning)) return;
    await clearLocalData();
    void sync();
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>Sync</h2>
        <dl className="facts">
          <dt>Status</dt>
          <dd>{describeStatus(status, pendingCount)}</dd>
          <dt>Last synced</dt>
          <dd>{formatTime(lastSyncedAt)}</dd>
        </dl>
        {error && <p className="error">{error}</p>}
        {status === 'local-only' ? (
          <p className="muted">No sync service is set. Add VITE_API_BASE to your .env file to turn sync on.</p>
        ) : (
          <button className="btn btn-primary" onClick={() => void sync()} disabled={status === 'syncing'}>
            Sync now
          </button>
        )}
      </section>

      <section className="panel">
        <h2>Storage</h2>
        <dl className="facts">
          <dt>Protected from clearing</dt>
          <dd>{persisted === null ? 'Unknown' : persisted ? 'Yes' : 'No'}</dd>
          <dt>Space used</dt>
          <dd>{usage || 'Unknown'}</dd>
        </dl>
        <p className="muted">
          If storage isn't protected, the browser may clear it when the device runs low on space. Installing the
          app to your home screen usually helps.
        </p>
        <div className="button-group">
          <button
            className="btn btn-danger"
            onClick={async () => {
              if (confirm('Clear all setlist data (songs will be preserved)?')) {
                await clearAllSetlistData();
                void sync();
              }
            }}
          >
            Clear setlist data
          </button>
          <button className="btn btn-danger" onClick={() => void handleClear()}>
            Clear all local data
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Install BeatFoundry</h2>
        <p className="muted">
          BeatFoundry is a Progressive Web App (PWA) that works offline and can be installed on your device.
        </p>

        <h3>How to Install</h3>

        <div className="install-instructions">
          <div className="instruction">
            <h4>iPhone / iPad</h4>
            <ol>
              <li>Open in Safari browser</li>
              <li>Tap the Share button (↑)</li>
              <li>Tap "Add to Home Screen"</li>
              <li>Name the app and tap "Add"</li>
            </ol>
          </div>

          <div className="instruction">
            <h4>Android Chrome</h4>
            <ol>
              <li>Open in Chrome browser</li>
              <li>Tap the menu button (⋮)</li>
              <li>Tap "Install app" or look for the install icon</li>
              <li>Confirm the installation</li>
            </ol>
          </div>

          <div className="instruction">
            <h4>Desktop (Chrome/Edge/Firefox)</h4>
            <ol>
              <li>Look for the install icon in the address bar</li>
              <li>Or right-click the app icon in your toolbar</li>
              <li>Click "Install" to add to your computer</li>
            </ol>
          </div>
        </div>

        <p className="muted">
          Once installed, BeatFoundry will work offline and load faster. Your data is always saved on this device.
        </p>
      </section>
    </div>
  );
}
