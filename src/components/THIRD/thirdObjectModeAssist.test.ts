import { describe, expect, it } from 'vitest';
import {
  buildThirdObjectHoverCardContent,
  createInitialThirdEditModeNudgeState,
  resolveThirdEditModeNudge,
  THIRD_EDIT_MODE_NUDGE_CLICK_WINDOW_MS,
  THIRD_EDIT_MODE_NUDGE_COOLDOWN_MS,
} from './thirdObjectModeAssist';

describe('thirdObjectModeAssist', () => {
  it('builds stable hover-card content for normal values', () => {
    expect(buildThirdObjectHoverCardContent('Cube 1', 'cube', {
      x: 1.23456,
      y: 0.5,
      z: 9,
    })).toEqual({
      title: 'Cube 1 | cube',
      subtitle: '1.235 / 0.5 / 9',
    });
  });

  it('builds stable hover-card content for negative values', () => {
    expect(buildThirdObjectHoverCardContent('Sphere 2', 'sphere', {
      x: -10.4,
      y: 2.125,
      z: -0.75,
    })).toEqual({
      title: 'Sphere 2 | sphere',
      subtitle: '-10.4 / 2.125 / -0.75',
    });
  });

  it('normalizes near-zero hover-card values', () => {
    expect(buildThirdObjectHoverCardContent('Plane 1', 'plane', {
      x: -0.0002,
      y: 0.0004,
      z: 0,
    })).toEqual({
      title: 'Plane 1 | plane',
      subtitle: '0 / 0 / 0',
    });
  });

  it('arms the first click without showing the nudge', () => {
    expect(resolveThirdEditModeNudge(createInitialThirdEditModeNudgeState(), {
      objectId: 'cube-1',
      at: 100,
    })).toEqual({
      nextState: {
        objectId: 'cube-1',
        clickCount: 1,
        lastClickAt: 100,
        cooldownUntil: 0,
      },
      shouldShow: false,
    });
  });

  it('shows the nudge on a second click of the same object within the click window', () => {
    const armed = resolveThirdEditModeNudge(createInitialThirdEditModeNudgeState(), {
      objectId: 'cube-1',
      at: 100,
    });

    expect(resolveThirdEditModeNudge(armed.nextState, {
      objectId: 'cube-1',
      at: 100 + THIRD_EDIT_MODE_NUDGE_CLICK_WINDOW_MS,
    })).toEqual({
      nextState: {
        objectId: null,
        clickCount: 0,
        lastClickAt: 0,
        cooldownUntil: 100 + THIRD_EDIT_MODE_NUDGE_CLICK_WINDOW_MS + THIRD_EDIT_MODE_NUDGE_COOLDOWN_MS,
      },
      shouldShow: true,
    });
  });

  it('resets the click sequence when the user clicks a different object', () => {
    const armed = resolveThirdEditModeNudge(createInitialThirdEditModeNudgeState(), {
      objectId: 'cube-1',
      at: 100,
    });

    expect(resolveThirdEditModeNudge(armed.nextState, {
      objectId: 'sphere-1',
      at: 200,
    })).toEqual({
      nextState: {
        objectId: 'sphere-1',
        clickCount: 1,
        lastClickAt: 200,
        cooldownUntil: 0,
      },
      shouldShow: false,
    });
  });

  it('resets the click sequence when the second click arrives too late', () => {
    const armed = resolveThirdEditModeNudge(createInitialThirdEditModeNudgeState(), {
      objectId: 'cube-1',
      at: 100,
    });

    expect(resolveThirdEditModeNudge(armed.nextState, {
      objectId: 'cube-1',
      at: 100 + THIRD_EDIT_MODE_NUDGE_CLICK_WINDOW_MS + 1,
    })).toEqual({
      nextState: {
        objectId: 'cube-1',
        clickCount: 1,
        lastClickAt: 100 + THIRD_EDIT_MODE_NUDGE_CLICK_WINDOW_MS + 1,
        cooldownUntil: 0,
      },
      shouldShow: false,
    });
  });

  it('suppresses new nudges during cooldown', () => {
    const triggered = resolveThirdEditModeNudge(createInitialThirdEditModeNudgeState(), {
      objectId: 'cube-1',
      at: 100,
    });
    const cooledDown = resolveThirdEditModeNudge(triggered.nextState, {
      objectId: 'cube-1',
      at: 200,
    });

    expect(resolveThirdEditModeNudge(cooledDown.nextState, {
      objectId: 'cube-1',
      at: cooledDown.nextState.cooldownUntil - 1,
    })).toEqual({
      nextState: cooledDown.nextState,
      shouldShow: false,
    });
  });

  it('allows a fresh click sequence after cooldown expires', () => {
    const first = resolveThirdEditModeNudge(createInitialThirdEditModeNudgeState(), {
      objectId: 'cube-1',
      at: 100,
    });
    const triggered = resolveThirdEditModeNudge(first.nextState, {
      objectId: 'cube-1',
      at: 200,
    });
    const rearmed = resolveThirdEditModeNudge(triggered.nextState, {
      objectId: 'cube-1',
      at: triggered.nextState.cooldownUntil,
    });

    expect(rearmed).toEqual({
      nextState: {
        objectId: 'cube-1',
        clickCount: 1,
        lastClickAt: triggered.nextState.cooldownUntil,
        cooldownUntil: triggered.nextState.cooldownUntil,
      },
      shouldShow: false,
    });
  });
});
