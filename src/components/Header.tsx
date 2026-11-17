import { useLocation } from 'react-router';
import { Mail } from 'lucide-react';
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
      <div className="header-top">
        <h1>{title}</h1>
        <AuthPrompt onLogin={onLogin} onSignup={onSignup} onLogout={onLogout} currentUser={currentUser} isLoading={authLoading} error={authError} />
      </div>
      <div className="header-bottom">
        {currentUser && (
          <div className="auth-info">
            <Mail size={16} />
            <span>{currentUser}</span>
          </div>
        )}
        <div className="header-status">
          <InstallPrompt />
          <span className="sync-badge" data-status={status} role="status">
            <span className="sync-dot" aria-hidden="true" />
            {describeStatus(status, pendingCount)}
          </span>
        </div>
      </div>
    </header>
  );
}
