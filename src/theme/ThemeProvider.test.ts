import { describe, expect, it } from 'vitest';
import { resolveTheme, sanitizeThemeMode } from './ThemeProvider';

describe('ThemeProvider helpers', () => {
  it('sanitizes unknown mode values to auto', () => {
    expect(sanitizeThemeMode('surprise')).toBe('auto');
    expect(sanitizeThemeMode(null)).toBe('auto');
    expect(sanitizeThemeMode(undefined)).toBe('auto');
  });

  it('keeps valid mode values', () => {
    expect(sanitizeThemeMode('auto')).toBe('auto');
    expect(sanitizeThemeMode('dark')).toBe('dark');
    expect(sanitizeThemeMode('light')).toBe('light');
  });

  it('resolves auto mode from system preference', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
  });

  it('keeps explicit dark/light modes regardless of system', () => {
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });
});
