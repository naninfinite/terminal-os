import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LEGACY_LOCATION_CASE_STORAGE_KEY,
  TEXT_CASE_STORAGE_KEY,
  migrateLegacyLocationCaseMode,
  readStoredTextCaseMode,
  resolveTheme,
  sanitizeTextCaseMode,
  sanitizeThemeMode,
} from './ThemeProvider';

describe('ThemeProvider helpers', () => {
  const createLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  };

  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it('sanitizes unknown text-case values to upper', () => {
    expect(sanitizeTextCaseMode('mixed')).toBe('upper');
    expect(sanitizeTextCaseMode(null)).toBe('upper');
    expect(sanitizeTextCaseMode(undefined)).toBe('upper');
  });

  it('keeps valid text-case values', () => {
    expect(sanitizeTextCaseMode('upper')).toBe('upper');
    expect(sanitizeTextCaseMode('lower')).toBe('lower');
  });

  it('maps legacy location case to text-case mode', () => {
    expect(migrateLegacyLocationCaseMode('lower')).toBe('lower');
    expect(migrateLegacyLocationCaseMode('upper')).toBe('upper');
    expect(migrateLegacyLocationCaseMode('mixed')).toBe('upper');
    expect(migrateLegacyLocationCaseMode('nope')).toBe('upper');
  });

  it('reads persisted text-case mode and defaults to upper', () => {
    expect(readStoredTextCaseMode()).toBe('upper');
    localStorage.setItem(TEXT_CASE_STORAGE_KEY, JSON.stringify('lower'));
    expect(readStoredTextCaseMode()).toBe('lower');
  });

  it('migrates legacy location-case when new key is absent', () => {
    localStorage.setItem(LEGACY_LOCATION_CASE_STORAGE_KEY, JSON.stringify('lower'));
    expect(readStoredTextCaseMode()).toBe('lower');
    localStorage.setItem(LEGACY_LOCATION_CASE_STORAGE_KEY, JSON.stringify('mixed'));
    expect(readStoredTextCaseMode()).toBe('upper');
  });
});
