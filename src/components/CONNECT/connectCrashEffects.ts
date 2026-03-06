import type { TronCrashEvent } from '../../connect/types';

export const CRASH_EFFECT_DURATION_MS = 220;

export type ConnectCrashEffect = {
  event: TronCrashEvent;
  startedAtMs: number;
};

export type ConnectCrashBurstVector = {
  dx: number;
  dy: number;
  magnitude: number;
};

const hashText = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const seededUnit = (eventId: string, salt: string): number => (
  hashText(`${eventId}:${salt}`) / 0x1_0000_0000
);

export const createCrashEffect = (
  event: TronCrashEvent,
  startedAtMs: number,
): ConnectCrashEffect => ({
  event,
  startedAtMs,
});

export const getCrashEffectProgress = (
  effect: ConnectCrashEffect,
  nowMs: number,
): number => {
  const elapsed = Math.max(0, nowMs - effect.startedAtMs);
  return Math.min(1, elapsed / CRASH_EFFECT_DURATION_MS);
};

export const isCrashEffectActive = (
  effect: ConnectCrashEffect,
  nowMs: number,
): boolean => getCrashEffectProgress(effect, nowMs) < 1;

export const resolveCrashBurstVectors = (
  eventId: string,
  count = 4,
): ConnectCrashBurstVector[] => Array.from({ length: count }, (_, index) => {
  const angle = seededUnit(eventId, `angle:${index}`) * Math.PI * 2;
  const magnitude = 0.65 + (seededUnit(eventId, `magnitude:${index}`) * 0.75);
  return {
    dx: Math.cos(angle),
    dy: Math.sin(angle),
    magnitude,
  };
});
