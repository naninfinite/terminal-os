import { describe, expect, it } from 'vitest';
import {
  PANEL_ZOOM_MAX,
  PANEL_ZOOM_MIN,
  clampPanelScale,
  derivePinchScale,
  pinchDistance,
} from './mobilePinchZoom';

describe('mobilePinchZoom helpers', () => {
  it('computes deterministic pinch distance', () => {
    expect(pinchDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(pinchDistance({ x: 3, y: 4 }, { x: 0, y: 0 })).toBe(5);
  });

  it('clamps scale to the configured min/max bounds', () => {
    expect(clampPanelScale(0.5)).toBe(PANEL_ZOOM_MIN);
    expect(clampPanelScale(4)).toBe(PANEL_ZOOM_MAX);
    expect(clampPanelScale(1.75)).toBe(1.75);
  });

  it('returns stable values for invalid and degenerate pinch inputs', () => {
    const degenerate = derivePinchScale({
      startDistance: 0,
      currentDistance: 120,
      startScale: 1.8,
    });
    expect(degenerate).toBe(1.8);

    const invalidCurrent = derivePinchScale({
      startDistance: 100,
      currentDistance: Number.NaN,
      startScale: 2.2,
    });
    expect(invalidCurrent).toBe(2.2);

    const deterministic = derivePinchScale({
      startDistance: 120,
      currentDistance: 180,
      startScale: 1.1,
    });
    expect(deterministic).toBe(derivePinchScale({
      startDistance: 120,
      currentDistance: 180,
      startScale: 1.1,
    }));
  });
});
