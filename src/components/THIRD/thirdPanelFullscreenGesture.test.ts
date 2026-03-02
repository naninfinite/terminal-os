import { describe, expect, it } from 'vitest';
import {
  resolveThirdPanelBackgroundTap,
  shouldOpenThirdPanelFromSceneDoubleClick,
  THIRD_PANEL_DOUBLE_TAP_MS,
  THIRD_PANEL_DOUBLE_TAP_TOLERANCE_PX,
} from './thirdPanelFullscreenGesture';

describe('thirdPanelFullscreenGesture', () => {
  it('opens on scene double-click only in panel mode when no object is hit', () => {
    expect(shouldOpenThirdPanelFromSceneDoubleClick({
      mode: 'panel',
      hasSceneHit: false,
    })).toBe(true);
    expect(shouldOpenThirdPanelFromSceneDoubleClick({
      mode: 'panel',
      hasSceneHit: true,
    })).toBe(false);
    expect(shouldOpenThirdPanelFromSceneDoubleClick({
      mode: 'fullscreen',
      hasSceneHit: false,
    })).toBe(false);
  });

  it('stores the first blank panel tap', () => {
    expect(resolveThirdPanelBackgroundTap({
      mode: 'panel',
      hasSceneHit: false,
      previousTap: null,
      tapAt: 100,
      x: 24,
      y: 48,
    })).toEqual({
      nextTap: {
        at: 100,
        x: 24,
        y: 48,
      },
      shouldOpenFullscreen: false,
    });
  });

  it('opens on a second blank tap within the time and distance threshold', () => {
    const result = resolveThirdPanelBackgroundTap({
      mode: 'panel',
      hasSceneHit: false,
      previousTap: {
        at: 100,
        x: 24,
        y: 48,
      },
      tapAt: 100 + THIRD_PANEL_DOUBLE_TAP_MS,
      x: 24 + THIRD_PANEL_DOUBLE_TAP_TOLERANCE_PX,
      y: 48,
    });

    expect(result).toEqual({
      nextTap: null,
      shouldOpenFullscreen: true,
    });
  });

  it('starts a fresh tap sequence when the second blank tap is too slow or too far away', () => {
    expect(resolveThirdPanelBackgroundTap({
      mode: 'panel',
      hasSceneHit: false,
      previousTap: {
        at: 100,
        x: 24,
        y: 48,
      },
      tapAt: 100 + THIRD_PANEL_DOUBLE_TAP_MS + 1,
      x: 24,
      y: 48,
    })).toEqual({
      nextTap: {
        at: 100 + THIRD_PANEL_DOUBLE_TAP_MS + 1,
        x: 24,
        y: 48,
      },
      shouldOpenFullscreen: false,
    });

    expect(resolveThirdPanelBackgroundTap({
      mode: 'panel',
      hasSceneHit: false,
      previousTap: {
        at: 100,
        x: 24,
        y: 48,
      },
      tapAt: 100 + 120,
      x: 24 + THIRD_PANEL_DOUBLE_TAP_TOLERANCE_PX + 1,
      y: 48,
    })).toEqual({
      nextTap: {
        at: 220,
        x: 24 + THIRD_PANEL_DOUBLE_TAP_TOLERANCE_PX + 1,
        y: 48,
      },
      shouldOpenFullscreen: false,
    });
  });

  it('clears any stored tap when the interaction is not blank panel background', () => {
    expect(resolveThirdPanelBackgroundTap({
      mode: 'panel',
      hasSceneHit: true,
      previousTap: {
        at: 100,
        x: 24,
        y: 48,
      },
      tapAt: 180,
      x: 30,
      y: 50,
    })).toEqual({
      nextTap: null,
      shouldOpenFullscreen: false,
    });

    expect(resolveThirdPanelBackgroundTap({
      mode: 'fullscreen',
      hasSceneHit: false,
      previousTap: {
        at: 100,
        x: 24,
        y: 48,
      },
      tapAt: 180,
      x: 30,
      y: 50,
    })).toEqual({
      nextTap: null,
      shouldOpenFullscreen: false,
    });
  });
});
