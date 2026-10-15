import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem('prn:token');
    if (!token) {
      setLoading(false);
      return;
    }
    api<{ user: User }>('/api/auth/me')
      .then((result) => setUser(result.user))
      .catch(() => {
        window.localStorage.removeItem('prn:token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api<{ token: string; user: User }>('/api/auth/login', { method: 'POST', body: { email, password } });
    window.localStorage.setItem('prn:token', result.token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* Sessão local também é encerrada. */ }
    window.localStorage.removeItem('prn:token');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa ser usado dentro de AuthProvider.');
  return context;
}
