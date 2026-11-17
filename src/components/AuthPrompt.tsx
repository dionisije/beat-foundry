import { useState } from 'react';
import { LogOut, Mail } from 'lucide-react';

interface AuthPromptProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignup: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  currentUser: string | null;
  isLoading: boolean;
  error: string | null;
}

export default function AuthPrompt({
  onLogin,
  onSignup,
  onLogout,
  currentUser,
  isLoading,
  error
}: AuthPromptProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (currentUser) {
    return (
      <div className="auth-status">
        <div className="auth-info">
          <Mail size={18} />
          <span>{currentUser}</span>
        </div>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => void onLogout()}
          disabled={isLoading}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);

    if (!email.trim() || !password.trim()) {
      setLocalError('Email and password required');
      return;
    }

    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onSignup(email, password);
      }
      setEmail('');
      setPassword('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }

  return (
    <div className="auth-prompt">
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={isLoading}
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            required
          />
        </label>

        {(error || localError) && (
          <p className="error">{error || localError}</p>
        )}

        <div className="auth-buttons">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <button
            className="btn"
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            disabled={isLoading}
          >
            {mode === 'login' ? 'Create account' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
