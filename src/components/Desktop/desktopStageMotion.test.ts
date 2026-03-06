import { describe, expect, it } from 'vitest';
import {
  resolveDesktopStageFlip,
  shouldAnimateDesktopStageTransition,
} from './desktopStageMotion';

describe('desktopStageMotion helpers', () => {
  it('animates only when desktop hero layout changes featured panels without reduced motion', () => {
    expect(shouldAnimateDesktopStageTransition({
      desktopHeroLayoutEnabled: true,
      reducedMotion: false,
      previousFeaturedPanel: 'me',
      featuredPanel: 'third',
    })).toBe(true);

    expect(shouldAnimateDesktopStageTransition({
      desktopHeroLayoutEnabled: false,
      reducedMotion: false,
      previousFeaturedPanel: 'me',
      featuredPanel: 'third',
    })).toBe(false);

    expect(shouldAnimateDesktopStageTransition({
      desktopHeroLayoutEnabled: true,
      reducedMotion: true,
      previousFeaturedPanel: 'me',
      featuredPanel: 'third',
    })).toBe(false);

    expect(shouldAnimateDesktopStageTransition({
      desktopHeroLayoutEnabled: true,
      reducedMotion: false,
      previousFeaturedPanel: 'third',
      featuredPanel: 'third',
    })).toBe(false);
  });

  it('computes FLIP deltas for panel slot changes and skips unchanged layouts', () => {
    expect(resolveDesktopStageFlip({
      previousRect: { left: 24, top: 36, width: 420, height: 280 },
      nextRect: { left: 340, top: 36, width: 210, height: 140 },
    })).toEqual({
      x: -316,
      y: 0,
      scaleX: 2,
      scaleY: 2,
    });

    expect(resolveDesktopStageFlip({
      previousRect: { left: 24, top: 36, width: 420, height: 280 },
      nextRect: { left: 24, top: 36, width: 420, height: 280 },
    })).toBeNull();
  });
});
