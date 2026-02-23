import type { ResolvedTheme, ThemeMode } from '../../theme/types';

export const getThemeToggleLabel = (resolvedTheme: ResolvedTheme): string => (
  resolvedTheme === 'dark' ? 'THEME: DARK' : 'THEME: LIGHT'
);

export const getNextThemeMode = (resolvedTheme: ResolvedTheme): ThemeMode => (
  resolvedTheme === 'dark' ? 'light' : 'dark'
);
