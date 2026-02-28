import { describe, expect, it } from 'vitest';
import {
  readDesktopRuntimePreloadSignals,
  shouldPreloadDesktopRuntime,
} from './desktopRuntimePreload';

describe('desktopRuntimePreload', () => {
  it('allows background preload on favorable startup conditions', () => {
    expect(shouldPreloadDesktopRuntime({
      saveData: false,
      effectiveType: '4g',
      hardwareConcurrency: 8,
      deviceMemory: 8,
      bootDurationMs: 420,
    })).toBe(true);
  });

  it('skips preload when data saver is enabled', () => {
    expect(shouldPreloadDesktopRuntime({
      saveData: true,
      effectiveType: '4g',
      hardwareConcurrency: 8,
      deviceMemory: 8,
      bootDurationMs: 420,
    })).toBe(false);
  });

  it('skips preload on slow network conditions', () => {
    expect(shouldPreloadDesktopRuntime({
      saveData: false,
      effectiveType: '3g',
      hardwareConcurrency: 8,
      deviceMemory: 8,
      bootDurationMs: 420,
    })).toBe(false);
  });

  it('skips preload when landing startup already took too long', () => {
    expect(shouldPreloadDesktopRuntime({
      saveData: false,
      effectiveType: '4g',
      hardwareConcurrency: 8,
      deviceMemory: 8,
      bootDurationMs: 1600,
    })).toBe(false);
  });

  it('reads client signals from navigator-like input', () => {
    expect(readDesktopRuntimePreloadSignals({
      connection: {
        saveData: false,
        effectiveType: '4g',
      },
      hardwareConcurrency: 4,
      deviceMemory: 6,
    } as unknown as Navigator, 720)).toEqual({
      saveData: false,
      effectiveType: '4g',
      hardwareConcurrency: 4,
      deviceMemory: 6,
      bootDurationMs: 720,
    });
  });
});
