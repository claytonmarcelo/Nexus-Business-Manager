import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';
import { User, AuthResponse } from '../types';

interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('@nexus:token');
    const storedUser = localStorage.getItem('@nexus:user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  async function signIn(email: string, password: string) {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('@nexus:token', newToken);
    localStorage.setItem('@nexus:user', JSON.stringify(userData));

    // Sync theme preference from backend
    if (userData.theme_preference || userData.themePreference) {
      const theme = userData.theme_preference || userData.themePreference || 'dark';
      localStorage.setItem('@nexus:theme', theme);
    }

    setToken(newToken);
    setUser(userData);
  }

  async function signUp(name: string, email: string, password: string) {
    const response = await api.post<AuthResponse>('/auth/register', { name, email, password });
    const { token: newToken, user: userData } = response.data;

    localStorage.setItem('@nexus:token', newToken);
    localStorage.setItem('@nexus:user', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);
  }

  function signOut() {
    // Fire-and-forget: tenta notificar backend, ignora falha
    api.post('/auth/logout').catch(() => {});

    localStorage.removeItem('@nexus:token');
    localStorage.removeItem('@nexus:user');
    localStorage.removeItem('@nexus:theme');
    sessionStorage.clear();

    setToken(null);
    setUser(null);

    window.location.href = '/login';
  }

  function updateUser(userData: Partial<User>) {
    const updated = { ...user, ...userData } as User;
    setUser(updated);
    localStorage.setItem('@nexus:user', JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, signIn, signUp, signOut, updateUser, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
}
