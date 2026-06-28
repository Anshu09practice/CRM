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
  const [otpSent, setOtpSent] = useState(false);
  const [otpWaUrl, setOtpWaUrl] = useState('');

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
      // Admin OTP flow: request OTP first if no password entered
      if (username.trim().toLowerCase() === 'anshu' && !otpSent) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim() })
        });
        const data = await res.json();
        if (data.otp_sent) {
          setOtpSent(true);
          setOtpWaUrl(data.wa_url || '');
          toast.success('Tap the WhatsApp button to get your OTP');
        } else {
          toast.error(data.error || 'Failed to request OTP');
        }
      } else {
        await login(username, password);
        toast.success('Welcome back!');
      }
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 py-8"
         style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #2e1065 35%, #1e1b4b 65%, #09090b 100%)' }}>

      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-brand-500/30 rounded-2xl blur-xl" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-brand-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto shadow-brand-lg ring-2 ring-white/10">
              <span className="text-white font-black text-xl tracking-tight">JJ</span>
            </div>
          </div>
          <h1 className="mt-5 text-2xl font-bold text-white tracking-tight">Jalan Jyothi</h1>
          <p className="text-sm text-white/50 mt-1">CRM System</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-float">
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-lg font-semibold text-white mb-2">Welcome back</h2>
              <div>
                <label htmlFor="login-username" className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Username</label>
                <input id="login-username" type="text" value={username} onChange={(e) => { setUsername(e.target.value); setOtpSent(false); }} required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-all"
                  placeholder="Enter username" autoFocus />
              </div>
              {(username.trim().toLowerCase() !== 'anshu' || otpSent) && (
                <div>
                  <label htmlFor="login-password" className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">
                    {otpSent ? 'OTP Code' : 'Password'}
                  </label>
                  <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-all"
                    placeholder={otpSent ? 'Enter OTP from WhatsApp' : 'Enter password'} />
                </div>
              )}
              {otpSent && otpWaUrl && (
                <button
                  type="button"
                  onClick={() => window.open(otpWaUrl, '_blank')}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm text-white bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Open WhatsApp for OTP
                </button>
              )}
              {otpSent && (
                <p className="text-xs text-emerald-400">Tap the button above — WhatsApp will open with your OTP.</p>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 shadow-brand-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                {loading ? 'Signing in...' : otpSent ? 'Verify OTP' : username.trim().toLowerCase() === 'anshu' ? 'Request OTP' : 'Sign In'}
              </button>
              <button type="button" onClick={() => setMode('forgot')} className="w-full text-sm text-white/50 hover:text-white/80 transition-colors py-1">
                Forgot password?
              </button>
            </form>
          )}

          {mode === 'setup' && (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white">First-time Setup</h2>
                <p className="text-xs text-white/50 mt-1">Create your owner account</p>
              </div>
              <div>
                <label htmlFor="setup-username" className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Username</label>
                <input id="setup-username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-all"
                  autoFocus />
              </div>
              <div>
                <label htmlFor="setup-password" className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Password</label>
                <input id="setup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-all" />
              </div>
              <div>
                <label htmlFor="setup-security-question" className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Security Question <span className="text-rose-400">*</span></label>
                <input id="setup-security-question" type="text" value={securityQuestion} onChange={(e) => setSecurityQuestion(e.target.value)} required
                  placeholder="e.g., Your pet's name?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-all" />
              </div>
              <div>
                <label htmlFor="setup-security-answer" className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Security Answer <span className="text-rose-400">*</span></label>
                <input id="setup-security-answer" type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} required
                  placeholder="Your answer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-all" />
                <p className="text-[11px] text-white/30 mt-1">Used for password recovery</p>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 shadow-brand-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <>
              {forgotStep === 'username' ? (
                <form onSubmit={handleForgotStep1} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Forgot Password</h2>
                    <p className="text-xs text-white/50 mt-1">Enter your username to get your security question</p>
                  </div>
                  <div>
                    <label htmlFor="forgot-username" className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Username</label>
                    <input id="forgot-username" type="text" value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-all"
                      autoFocus />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 shadow-brand-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-50">
                    {loading ? 'Loading...' : 'Continue'}
                  </button>
                  <button type="button" onClick={() => setMode('login')} className="w-full text-sm text-white/50 hover:text-white/80 transition-colors py-1">
                    Back to login
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotStep2} className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">Reset Password</h2>
                  <div className="bg-brand-950/60 border border-brand-800/50 rounded-xl p-3">
                    <p className="text-[11px] text-white/50 uppercase tracking-wide font-semibold mb-1">Security Question</p>
                    <p className="text-sm font-medium text-brand-300">{forgotQuestion}</p>
                  </div>
                  <div>
                    <label htmlFor="forgot-answer" className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">Your Answer</label>
                    <input id="forgot-answer" type="text" value={forgotAnswer} onChange={(e) => setForgotAnswer(e.target.value)} required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-all"
                      autoFocus />
                  </div>
                  <div>
                    <label htmlFor="forgot-new-password" className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">New Password</label>
                    <input id="forgot-new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={4}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 transition-all" />
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 shadow-brand-lg active:scale-[0.98] transition-all duration-150 disabled:opacity-50">
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button type="button" onClick={() => { setForgotStep('username'); setMode('login'); }} className="w-full text-sm text-white/50 hover:text-white/80 transition-colors py-1">
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
