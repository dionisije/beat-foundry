import { Link } from 'react-router';
import { useLiveQuery } from 'dexie-react-hooks';
import { MAX_ITEMS, liveItemCount } from '../db';
import { describeStatus, useSync } from '../sync/SyncContext';
import { formatTime } from '../format';

export default function Home() {
  const count = useLiveQuery(liveItemCount, [], 0);
  const { status, pendingCount, lastSyncedAt } = useSync();

  return (
    <div className="stack">
      <section className="panel">
        <p className="figure">
          {count}
          <span className="figure-of"> of {MAX_ITEMS}</span>
        </p>
        <p className="muted">items in your list</p>
        <Link to="/items" className="btn btn-primary">
          Open list
        </Link>
      </section>

      <section className="panel">
        <h2>Sync</h2>
        <dl className="facts">
          <dt>Status</dt>
          <dd>{describeStatus(status, pendingCount)}</dd>
          <dt>Last synced</dt>
          <dd>{status === 'local-only' ? 'Not set up' : formatTime(lastSyncedAt)}</dd>
        </dl>
        <p className="muted">Everything works without a connection. Changes sync when one is available.</p>
      </section>
    </div>
  );
}
