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
import type { ResolvedTheme, TextCaseMode, ThemeMode } from './types';

export const THEME_STORAGE_KEY = 'terminalOS.ui.v1.theme';
export const TEXT_CASE_STORAGE_KEY = 'terminalOS.ui.v1.textCase';
export const LEGACY_LOCATION_CASE_STORAGE_KEY = 'terminalOS.ui.v1.locationCase';

const isThemeMode = (value: unknown): value is ThemeMode => (
  value === 'auto' || value === 'dark' || value === 'light'
);

const isTextCaseMode = (value: unknown): value is TextCaseMode => (
  value === 'upper' || value === 'lower'
);

export const sanitizeThemeMode = (value: unknown): ThemeMode => (
  isThemeMode(value) ? value : 'auto'
);

export const sanitizeTextCaseMode = (value: unknown): TextCaseMode => (
  isTextCaseMode(value) ? value : 'upper'
);

export const migrateLegacyLocationCaseMode = (value: unknown): TextCaseMode => (
  value === 'lower' ? 'lower' : 'upper'
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

export const readStoredTextCaseMode = (): TextCaseMode => {
  const storedCase = getItemSafe<unknown>(TEXT_CASE_STORAGE_KEY, null);
  if (storedCase !== null) {
    return sanitizeTextCaseMode(storedCase);
  }

  const legacyCase = getItemSafe<unknown>(LEGACY_LOCATION_CASE_STORAGE_KEY, 'upper');
  return migrateLegacyLocationCaseMode(legacyCase);
};

const getResolvedTheme = (mode: ThemeMode): ResolvedTheme => resolveTheme(mode, systemPrefersDark());

type ThemeContextValue = {
  themeMode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  textCaseMode: TextCaseMode;
  setThemeMode: (mode: ThemeMode) => void;
  setTextCaseMode: (mode: TextCaseMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialModeRef = useRef<ThemeMode>(readStoredThemeMode());
  const initialTextCaseRef = useRef<TextCaseMode>(readStoredTextCaseMode());
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialModeRef.current);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => getResolvedTheme(initialModeRef.current));
  const [textCaseMode, setTextCaseModeState] = useState<TextCaseMode>(initialTextCaseRef.current);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(sanitizeThemeMode(mode));
  }, []);

  const setTextCaseMode = useCallback((mode: TextCaseMode) => {
    setTextCaseModeState(sanitizeTextCaseMode(mode));
  }, []);

  useEffect(() => {
    setItemSafe(THEME_STORAGE_KEY, themeMode);
    setResolvedTheme(getResolvedTheme(themeMode));
  }, [themeMode]);

  useEffect(() => {
    setItemSafe(TEXT_CASE_STORAGE_KEY, textCaseMode);
  }, [textCaseMode]);

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
    root.setAttribute('data-text-case', textCaseMode);
    root.style.setProperty('color-scheme', resolvedTheme);
  }, [resolvedTheme, textCaseMode]);

  const value = useMemo<ThemeContextValue>(() => ({
    themeMode,
    resolvedTheme,
    textCaseMode,
    setThemeMode,
    setTextCaseMode,
  }), [resolvedTheme, setTextCaseMode, setThemeMode, textCaseMode, themeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
