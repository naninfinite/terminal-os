import { describe, expect, it } from 'vitest';
import { getNextThemeMode, getThemeToggleLabel } from './themeMenu';

describe('themeMenu helpers', () => {
  it('returns stateful theme labels', () => {
    expect(getThemeToggleLabel('dark')).toBe('THEME: DARK');
    expect(getThemeToggleLabel('light')).toBe('THEME: LIGHT');
  });

  it('toggles between dark and light', () => {
    expect(getNextThemeMode('dark')).toBe('light');
    expect(getNextThemeMode('light')).toBe('dark');
  });
});
