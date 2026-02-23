import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getItemSafe, setItemSafe } from '../utils/storage';
import type { ResolvedTheme, ThemeMode } from './types';

export const THEME_STORAGE_KEY = 'terminalOS.ui.v1.theme';

const isThemeMode = (value: unknown): value is ThemeMode => (
  value === 'auto' || value === 'dark' || value === 'light'
);

export const sanitizeThemeMode = (value: unknown): ThemeMode => (
  isThemeMode(value) ? value : 'auto'
);

const systemPrefersDark = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const resolveTheme = (mode: ThemeMode, prefersDark: boolean): ResolvedTheme => {
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return prefersDark ? 'dark' : 'light';
};

const readStoredThemeMode = (): ThemeMode => sanitizeThemeMode(
  getItemSafe<unknown>(THEME_STORAGE_KEY, 'auto')
);

const getResolvedTheme = (mode: ThemeMode): ResolvedTheme => resolveTheme(mode, systemPrefersDark());

type ThemeContextValue = {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialModeRef = useRef<ThemeMode>(readStoredThemeMode());
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialModeRef.current);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => getResolvedTheme(initialModeRef.current));

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(sanitizeThemeMode(mode));
  }, []);

  useEffect(() => {
    setItemSafe(THEME_STORAGE_KEY, themeMode);
    setResolvedTheme(getResolvedTheme(themeMode));
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== 'auto' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setResolvedTheme(event.matches ? 'dark' : 'light');
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    }

    const legacyListener = (event: MediaQueryListEvent) => onChange(event);
    mediaQuery.addListener(legacyListener);
    return () => mediaQuery.removeListener(legacyListener);
  }, [themeMode]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    root.setAttribute('data-text-case', resolvedTheme === 'dark' ? 'upper' : 'mixed');
    root.style.setProperty('color-scheme', resolvedTheme);
  }, [resolvedTheme]);

  const value = useMemo<ThemeContextValue>(() => ({
    themeMode,
    resolvedTheme,
    setThemeMode,
  }), [resolvedTheme, setThemeMode, themeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
