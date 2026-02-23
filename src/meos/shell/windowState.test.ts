import { describe, expect, it } from 'vitest';
import type { MeOsWindow } from './types';
import { sanitizePersistedWindowState, toggleWindowMaximize } from './windowState';

const createWindow = (overrides: Partial<MeOsWindow> = {}): MeOsWindow => ({
  id: 'w1',
  title: 'FILE.EXE',
  appId: 'file',
  x: 24,
  y: 24,
  width: 640,
  height: 420,
  zIndex: 3,
  minimized: false,
  maximized: false,
  ...overrides,
});

describe('windowState helpers', () => {
  it('maximize toggle stores restoreRect', () => {
    const win = createWindow();
    const toggled = toggleWindowMaximize(win, { x: win.x, y: win.y, width: win.width, height: win.height });
    expect(toggled.maximized).toBe(true);
    expect(toggled.restoreRect).toEqual({ x: 24, y: 24, width: 640, height: 420 });
  });

  it('second toggle restores from restoreRect', () => {
    const win = createWindow({
      maximized: true,
      restoreRect: { x: 88, y: 96, width: 520, height: 300 },
      x: 0,
      y: 0,
      width: 900,
      height: 520,
    });
    const toggled = toggleWindowMaximize(win, { x: 0, y: 0, width: 900, height: 520 });
    expect(toggled.maximized).toBe(false);
    expect(toggled.restoreRect).toBeUndefined();
    expect(toggled.x).toBe(88);
    expect(toggled.y).toBe(96);
    expect(toggled.width).toBe(520);
    expect(toggled.height).toBe(300);
  });

  it('invalid or missing restoreRect falls back safely', () => {
    const missingRestore = createWindow({ maximized: true, restoreRect: undefined, x: 0, y: 0, width: 900, height: 520 });
    const missingToggled = toggleWindowMaximize(missingRestore, { x: 12, y: 20, width: 700, height: 400 });
    expect(missingToggled.x).toBe(12);
    expect(missingToggled.y).toBe(20);
    expect(missingToggled.width).toBe(700);
    expect(missingToggled.height).toBe(400);

    const sanitized = sanitizePersistedWindowState({
      maximized: true,
      restoreRect: { x: 'bad', y: 20, width: 700, height: 400 },
    });
    expect(sanitized.maximized).toBe(true);
    expect(sanitized.restoreRect).toBeUndefined();
  });

  it('legacy persisted payload sanitizes to non-maximized', () => {
    const sanitized = sanitizePersistedWindowState({});
    expect(sanitized.maximized).toBe(false);
    expect(sanitized.restoreRect).toBeUndefined();
  });
});
