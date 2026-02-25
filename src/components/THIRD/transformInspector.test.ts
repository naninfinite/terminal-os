import { describe, expect, it } from 'vitest';
import {
  clampInspectorScale,
  degToRad,
  formatInspectorNumber,
  MIN_INSPECTOR_SCALE,
  parseInspectorNumber,
  radToDeg,
} from './transformInspector';

describe('transformInspector helpers', () => {
  it('converts radians/degrees deterministically', () => {
    expect(radToDeg(Math.PI)).toBeCloseTo(180, 8);
    expect(radToDeg(Math.PI / 2)).toBeCloseTo(90, 8);
    expect(degToRad(180)).toBeCloseTo(Math.PI, 8);
    expect(degToRad(45)).toBeCloseTo(Math.PI / 4, 8);
  });

  it('parses signed decimal values and rejects invalid input', () => {
    expect(parseInspectorNumber('-12.5')).toBe(-12.5);
    expect(parseInspectorNumber('+3.25')).toBe(3.25);
    expect(parseInspectorNumber('0.125')).toBe(0.125);
    expect(parseInspectorNumber('')).toBeNull();
    expect(parseInspectorNumber('  ')).toBeNull();
    expect(parseInspectorNumber('abc')).toBeNull();
    expect(parseInspectorNumber('--1')).toBeNull();
    expect(parseInspectorNumber('1,2')).toBeNull();
  });

  it('clamps scale values at minimum', () => {
    expect(clampInspectorScale(1)).toBe(1);
    expect(clampInspectorScale(0)).toBe(MIN_INSPECTOR_SCALE);
    expect(clampInspectorScale(-2)).toBe(MIN_INSPECTOR_SCALE);
  });

  it('formats values with stable output', () => {
    expect(formatInspectorNumber(1)).toBe('1');
    expect(formatInspectorNumber(1.23456)).toBe('1.235');
    expect(formatInspectorNumber(-0.0002)).toBe('0');
  });
});
