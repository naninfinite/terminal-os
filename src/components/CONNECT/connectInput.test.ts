import { describe, expect, it } from 'vitest';
import {
  deriveSeatBindings,
  resolveConnectTurnIntent,
  shouldHandleConnectHotkeys,
} from './connectInput';

describe('connectInput', () => {
  it('maps single-seat mode so WASD and arrows steer the same seat', () => {
    expect(deriveSeatBindings(['p2'])).toEqual([{ playerId: 'p2', scheme: 'dual' }]);
    expect(resolveConnectTurnIntent({ ownedSeatIds: ['p2'], key: 'w' })).toEqual({ playerId: 'p2', direction: 'up' });
    expect(resolveConnectTurnIntent({ ownedSeatIds: ['p2'], key: 'ArrowLeft' })).toEqual({ playerId: 'p2', direction: 'left' });
  });

  it('maps two-seat mode so WASD and arrows target different seats', () => {
    expect(resolveConnectTurnIntent({ ownedSeatIds: ['p3', 'p1'], key: 'd' })).toEqual({ playerId: 'p1', direction: 'right' });
    expect(resolveConnectTurnIntent({ ownedSeatIds: ['p3', 'p1'], key: 'ArrowDown' })).toEqual({ playerId: 'p3', direction: 'down' });
  });

  it('gates hotkeys away from editable targets and modifier combos', () => {
    const input = { tagName: 'INPUT' } as unknown as EventTarget;

    expect(shouldHandleConnectHotkeys({
      matchActive: true,
      isFullscreen: false,
      activeScopeIsConnect: true,
      rootContainsFocus: true,
      target: input,
    })).toBe(false);

    expect(shouldHandleConnectHotkeys({
      matchActive: true,
      isFullscreen: false,
      activeScopeIsConnect: true,
      rootContainsFocus: true,
      target: null,
      ctrlKey: true,
    })).toBe(false);
  });

  it('requires active connect context unless fullscreen', () => {
    expect(shouldHandleConnectHotkeys({
      matchActive: true,
      isFullscreen: false,
      activeScopeIsConnect: false,
      rootContainsFocus: false,
      target: null,
    })).toBe(false);

    expect(shouldHandleConnectHotkeys({
      matchActive: true,
      isFullscreen: true,
      activeScopeIsConnect: false,
      rootContainsFocus: false,
      target: null,
    })).toBe(true);
  });
});
