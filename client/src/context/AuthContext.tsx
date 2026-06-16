import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  username: string | null;
  isAuthenticated: boolean;
  setupRequired: boolean | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  setup: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('jj_token'));
  const [username, setUsername] = useState<string | null>(() => localStorage.getItem('jj_username'));
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    try {
      // First check if setup is needed
      const statusRes = await fetch('/api/auth/status');
      const statusData = await statusRes.json();

      if (statusData.setup_required) {
        setSetupRequired(true);
        setLoading(false);
        return;
      }

      setSetupRequired(false);

      // If we have a token, verify it
      if (token) {
        const verifyRes = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!verifyRes.ok) {
          // Token expired or invalid
          logout();
        }
      }
    } catch {
      // Server unreachable — if we have a token, keep it (offline mode)
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
    setUsername(data.username);
    localStorage.setItem('jj_token', data.token);
    localStorage.setItem('jj_username', data.username);
  }

  async function setup(usr: string, pwd: string) {
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usr, password: pwd })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Setup failed');
    }

    const data = await res.json();
    setToken(data.token);
    setUsername(data.username);
    setSetupRequired(false);
    localStorage.setItem('jj_token', data.token);
    localStorage.setItem('jj_username', data.username);
  }

  function logout() {
    setToken(null);
    setUsername(null);
    localStorage.removeItem('jj_token');
    localStorage.removeItem('jj_username');
  }

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, username, isAuthenticated, setupRequired, loading, login, setup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
