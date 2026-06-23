import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function LoginPage() {
  const { setupRequired, login, setup } = useAuth();
  const [mode, setMode] = useState<'login' | 'setup' | 'forgot'>(() => setupRequired ? 'setup' : 'login');
  const [loading, setLoading] = useState(false);

  // Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Setup additional fields
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Forgot password
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotQuestion, setForgotQuestion] = useState('');
  const [forgotAnswer, setForgotAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'username' | 'answer'>('username');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!securityQuestion || !securityAnswer) {
      toast.error('Security question and answer are required for password recovery');
      return;
    }
    setLoading(true);
    try {
      await setup(username, password, securityQuestion, securityAnswer);
      toast.success('Account created!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotStep1(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.forgotPassword(forgotUsername);
      setForgotQuestion(res.security_question);
      setForgotStep('answer');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.forgotPassword(forgotUsername, forgotAnswer, newPassword);
      toast.success('Password reset successfully! You can now login.');
      setMode('login');
      setForgotStep('username');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-xl">JJ</span>
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Jalan Jyothi</h1>
          <p className="text-sm text-gray-500 mt-1">CRM System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Login</h2>
              <div>
                <label className="label">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="input w-full" autoFocus />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="input w-full" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <button type="button" onClick={() => setMode('forgot')} className="w-full text-sm text-indigo-600 hover:text-indigo-800">
                Forgot password?
              </button>
            </form>
          )}

          {mode === 'setup' && (
            <form onSubmit={handleSetup} className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">First-time Setup</h2>
              <p className="text-xs text-gray-500">Create your owner account</p>
              <div>
                <label className="label">Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className="input w-full" autoFocus />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} className="input w-full" />
              </div>
              <div>
                <label className="label">Security Question *</label>
                <input type="text" value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} required placeholder="e.g., Your pet's name?" className="input w-full" />
              </div>
              <div>
                <label className="label">Security Answer *</label>
                <input type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} required placeholder="Your answer" className="input w-full" />
                <p className="text-xs text-gray-400 mt-1">Used for password recovery</p>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <>
              {forgotStep === 'username' ? (
                <form onSubmit={handleForgotStep1} className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Forgot Password</h2>
                  <p className="text-xs text-gray-500">Enter your username to get your security question</p>
                  <div>
                    <label className="label">Username</label>
                    <input type="text" value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} required className="input w-full" autoFocus />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Loading...' : 'Continue'}
                  </button>
                  <button type="button" onClick={() => setMode('login')} className="w-full text-sm text-gray-500 hover:text-gray-700">
                    Back to login
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotStep2} className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">Reset Password</h2>
                  <div className="bg-indigo-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Security Question:</p>
                    <p className="text-sm font-medium text-indigo-800">{forgotQuestion}</p>
                  </div>
                  <div>
                    <label className="label">Your Answer</label>
                    <input type="text" value={forgotAnswer} onChange={(e) => setForgotAnswer(e.target.value)} required className="input w-full" autoFocus />
                  </div>
                  <div>
                    <label className="label">New Password</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={4} className="input w-full" />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full">
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button type="button" onClick={() => { setForgotStep('username'); setMode('login'); }} className="w-full text-sm text-gray-500 hover:text-gray-700">
                    Back to login
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
