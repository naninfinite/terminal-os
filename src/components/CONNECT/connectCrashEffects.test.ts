import { describe, expect, it } from 'vitest';
import {
  CRASH_EFFECT_DURATION_MS,
  createCrashEffect,
  getCrashEffectProgress,
  isCrashEffectActive,
  resolveCrashBurstVectors,
} from './connectCrashEffects';
import type { TronCrashEvent } from '../../connect/types';

const crashEvent: TronCrashEvent = {
  type: 'crash',
  eventId: '2:18:p3:same_cell:4.500:7.500',
  playerId: 'p3',
  tick: 18,
  round: 2,
  reason: 'same_cell',
  impactPoint: { x: 4.5, y: 7.5 },
};

describe('connectCrashEffects', () => {
  it('uses deterministic burst vectors for a given event id', () => {
    const first = resolveCrashBurstVectors(crashEvent.eventId, 5);
    const second = resolveCrashBurstVectors(crashEvent.eventId, 5);
    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
  });

  it('tracks effect progress and active window', () => {
    const effect = createCrashEffect(crashEvent, 1000);
    expect(getCrashEffectProgress(effect, 1000)).toBe(0);
    expect(getCrashEffectProgress(effect, 1000 + (CRASH_EFFECT_DURATION_MS / 2))).toBeCloseTo(0.5, 1);
    expect(isCrashEffectActive(effect, 1000 + CRASH_EFFECT_DURATION_MS - 1)).toBe(true);
    expect(isCrashEffectActive(effect, 1000 + CRASH_EFFECT_DURATION_MS + 1)).toBe(false);
  });
});
