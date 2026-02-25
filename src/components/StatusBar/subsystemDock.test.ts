import { describe, expect, it } from 'vitest';
import {
  formatGenericDockLabel,
  formatMeDockLabel,
  getDockClickIntent,
  isSameTargetFullscreenNoop,
} from './subsystemDock';

describe('subsystemDock helpers', () => {
  it('formats ME label with optional open window count', () => {
    expect(formatMeDockLabel(0)).toBe('ME.EXE');
    expect(formatMeDockLabel(3)).toBe('ME.EXE (3)');
  });

  it('formats generic app labels with optional count', () => {
    expect(formatGenericDockLabel('THIRD.EXE', 0)).toBe('THIRD.EXE');
    expect(formatGenericDockLabel('THIRD.EXE', 2)).toBe('THIRD.EXE (2)');
  });

  it('identifies same-target fullscreen no-op', () => {
    expect(isSameTargetFullscreenNoop({
      targetScope: 'you',
      activeFullscreenScope: 'you',
    })).toBe(true);
    expect(isSameTargetFullscreenNoop({
      targetScope: 'you',
      activeFullscreenScope: 'me',
    })).toBe(false);
  });

  it('uses focus-only behavior for YOU when desktop is active', () => {
    expect(getDockClickIntent({
      targetScope: 'you',
      anyFullscreenOpen: false,
      activeFullscreenScope: null,
    })).toBe('focus_panel');
  });

  it('opens fullscreen for non-YOU targets from desktop', () => {
    expect(getDockClickIntent({
      targetScope: 'me',
      anyFullscreenOpen: false,
      activeFullscreenScope: null,
    })).toBe('open_target_fullscreen');
    expect(getDockClickIntent({
      targetScope: 'third',
      anyFullscreenOpen: false,
      activeFullscreenScope: null,
    })).toBe('open_target_fullscreen');
    expect(getDockClickIntent({
      targetScope: 'connect',
      anyFullscreenOpen: false,
      activeFullscreenScope: null,
    })).toBe('open_target_fullscreen');
  });

  it('switches fullscreen targets whenever fullscreen is already open', () => {
    expect(getDockClickIntent({
      targetScope: 'you',
      anyFullscreenOpen: true,
      activeFullscreenScope: 'me',
    })).toBe('open_target_fullscreen');
    expect(getDockClickIntent({
      targetScope: 'third',
      anyFullscreenOpen: true,
      activeFullscreenScope: 'you',
    })).toBe('open_target_fullscreen');
  });

  it('returns noop for same-target fullscreen clicks', () => {
    expect(getDockClickIntent({
      targetScope: 'connect',
      anyFullscreenOpen: true,
      activeFullscreenScope: 'connect',
    })).toBe('noop');
  });
});
