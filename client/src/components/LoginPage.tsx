import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, setup, setupRequired } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isSetup = setupRequired === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Username and password are required');
      return;
    }

    if (isSetup && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    try {
      if (isSetup) {
        await setup(username, password);
      } else {
        await login(username, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-2xl">JJ</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Jalan Jyothi CRM</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isSetup ? 'Create your admin account' : 'Sign in to continue'}
          </p>
        </div>

        {/* Setup notice */}
        {isSetup && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-800 font-medium">First-time setup</p>
            <p className="text-xs text-blue-600 mt-1">
              Create your admin username and password. This will be used to access the CRM from any device.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="input-field"
              placeholder="admin"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              autoComplete={isSetup ? 'new-password' : 'current-password'}
            />
          </div>

          {isSetup && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-base"
          >
            {loading ? 'Please wait...' : (isSetup ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-6">
          Secured with JWT authentication
        </p>
      </div>
    </div>
  );
}
