import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { isOfflineMode } from '../services/api';
import { localApi } from '../services/localDb';

// PCI DSS 8.1.8: Session inactivity timeout (15 minutes)
const SESSION_TIMEOUT_MS = 15 * 60 * 1000;

interface User {
  id: number;
  username: string;
  role: 'owner' | 'manager' | 'employee';
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  username: string | null;
  role: 'owner' | 'manager' | 'employee' | null;
  isAuthenticated: boolean;
  isOwner: boolean;
  isManager: boolean;
  isEmployee: boolean;
  setupRequired: boolean | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  setup: (username: string, password: string, security_question: string, security_answer: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jj_token'));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('jj_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // PCI DSS 8.1.8: Reset inactivity timer on user interaction
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      if (token) {
        logout();
        alert('Session expired due to inactivity. Please log in again.');
      }
    }, SESSION_TIMEOUT_MS);
  }, [token]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handler = () => resetInactivityTimer();
    events.forEach(e => document.addEventListener(e, handler, { passive: true }));
    resetInactivityTimer();
    return () => {
      events.forEach(e => document.removeEventListener(e, handler));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('jj_refresh_token');
    if (!refreshToken) return false;

    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        localStorage.setItem('jj_token', data.token);
        localStorage.setItem('jj_refresh_token', data.refreshToken);
        return true;
      }
    } catch {}
    return false;
  }, []);

  useEffect(() => {
    checkStatus();
  }, []);

  // Auto-refresh token before expiry (every 50 minutes — token expires in 1h)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      refreshAccessToken();
    }, 50 * 60 * 1000); // 50 minutes
    return () => clearInterval(interval);
  }, [token, refreshAccessToken]);

  async function checkStatus() {
    try {
      if (isOfflineMode()) {
        const needsSetup = await localApi.checkSetupRequired();
        setSetupRequired(needsSetup);
        if (!needsSetup && token) {
          const stored = localStorage.getItem('jj_user');
          if (stored) setUser(JSON.parse(stored));
        }
        setLoading(false);
        return;
      }

      // PCI DSS 6.5.9: Fetch CSRF cookie before any state-changing requests
      await fetch('/health', { credentials: 'include' });

      const statusRes = await fetch('/api/auth/status');
      const statusData = await statusRes.json();

      if (statusData.setup_required) {
        setSetupRequired(true);
        setLoading(false);
        return;
      }

      setSetupRequired(false);

      if (token) {
        const verifyRes = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (verifyRes.ok) {
          const data = await verifyRes.json();
          const userData = data.user;
          setUser(userData);
          localStorage.setItem('jj_user', JSON.stringify(userData));
        } else {
          // Try refresh
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            logout();
          }
        }
      }
    } catch {
      // Server unreachable — if offline mode, check local
      if (isOfflineMode() || localStorage.getItem('jj_offline_mode') === 'true') {
        const needsSetup = await localApi.checkSetupRequired();
        setSetupRequired(needsSetup);
        if (!needsSetup && token) {
          const stored = localStorage.getItem('jj_user');
          if (stored) setUser(JSON.parse(stored));
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function login(usr: string, pwd: string) {
    if (isOfflineMode()) {
      const data = await localApi.login(usr, pwd);
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('jj_token', data.token);
      localStorage.setItem('jj_refresh_token', data.refreshToken);
      localStorage.setItem('jj_user', JSON.stringify(data.user));
      return;
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usr, password: pwd })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }

    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('jj_token', data.token);
    localStorage.setItem('jj_refresh_token', data.refreshToken);
    localStorage.setItem('jj_user', JSON.stringify(data.user));
  }

  async function setup(usr: string, pwd: string, security_question: string, security_answer: string) {
    if (isOfflineMode()) {
      const data = await localApi.setup(usr, pwd, security_question, security_answer);
      setToken(data.token);
      setUser(data.user);
      setSetupRequired(false);
      localStorage.setItem('jj_token', data.token);
      localStorage.setItem('jj_refresh_token', 'local-refresh');
      localStorage.setItem('jj_user', JSON.stringify(data.user));
      return;
    }

    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usr, password: pwd, security_question, security_answer })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Setup failed');
    }

    const data = await res.json();
    setToken(data.token);
    setUser(data.user);
    setSetupRequired(false);
    localStorage.setItem('jj_token', data.token);
    localStorage.setItem('jj_refresh_token', data.refreshToken);
    localStorage.setItem('jj_user', JSON.stringify(data.user));
  }

  function logout() {
    // PCI DSS 8.1.5: Invalidate token server-side
    const currentToken = localStorage.getItem('jj_token');
    if (currentToken && !isOfflineMode()) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` }
      }).catch(() => {}); // Best-effort server invalidation
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('jj_token');
    localStorage.removeItem('jj_refresh_token');
    localStorage.removeItem('jj_user');
  }

  const isAuthenticated = !!token;
  const isOwner = user?.role === 'owner';
  const isManager = user?.role === 'manager';
  const isEmployee = user?.role === 'employee';

  return (
    <AuthContext.Provider value={{
      token, user, username: user?.username || null, role: user?.role || null,
      isAuthenticated, isOwner, isManager, isEmployee, setupRequired, loading, login, setup, logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
