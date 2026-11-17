import { useLocation } from 'react-router';
import { TABS } from '../tabs';
import { describeStatus, useSync } from '../sync/SyncContext';
import InstallPrompt from './InstallPrompt';
import AuthPrompt from './AuthPrompt';

export default function Header() {
  const { pathname } = useLocation();
  const { status, pendingCount, currentUser, authError, authLoading, onLogin, onSignup, onLogout } = useSync();
  const title = TABS.find((t) => t.path === pathname)?.label ?? 'Home';

  return (
    <header className="header">
      <h1>{title}</h1>
      <div className="header-actions">
        {!currentUser && <AuthPrompt onLogin={onLogin} onSignup={onSignup} onLogout={onLogout} currentUser={currentUser} isLoading={authLoading} error={authError} />}
        {currentUser && <AuthPrompt onLogin={onLogin} onSignup={onSignup} onLogout={onLogout} currentUser={currentUser} isLoading={authLoading} error={authError} />}
        <InstallPrompt />
        <span className="sync-badge" data-status={status} role="status">
          <span className="sync-dot" aria-hidden="true" />
          {describeStatus(status, pendingCount)}
        </span>
      </div>
    </header>
  );
}
