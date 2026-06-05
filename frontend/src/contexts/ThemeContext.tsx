import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';

interface ThemeContextData {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem('@nexus:theme') as 'dark' | 'light' | null;
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('@nexus:theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [theme]);

  const syncThemeToBackend = useCallback(async (t: 'dark' | 'light') => {
    try {
      await api.put('/users/theme', { theme: t });
    } catch {
      // silent - theme still works locally
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      syncThemeToBackend(next);
      return next;
    });
  }, [syncThemeToBackend]);

  const setTheme = useCallback((t: 'dark' | 'light') => {
    setThemeState(t);
    syncThemeToBackend(t);
  }, [syncThemeToBackend]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}
