import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  role: 'owner' | 'manager';
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  username: string | null;
  role: 'owner' | 'manager' | null;
  isAuthenticated: boolean;
  isOwner: boolean;
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

  // Auto-refresh token before expiry (every 20 hours)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      refreshAccessToken();
    }, 20 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, refreshAccessToken]);

  async function checkStatus() {
    try {
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
      // Server unreachable — keep token for offline mode
    } finally {
      setLoading(false);
    }
  }

  async function login(usr: string, pwd: string) {
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
    setToken(null);
    setUser(null);
    localStorage.removeItem('jj_token');
    localStorage.removeItem('jj_refresh_token');
    localStorage.removeItem('jj_user');
  }

  const isAuthenticated = !!token;
  const isOwner = user?.role === 'owner';

  return (
    <AuthContext.Provider value={{
      token, user, username: user?.username || null, role: user?.role || null,
      isAuthenticated, isOwner, setupRequired, loading, login, setup, logout
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
