import { describe, expect, it } from 'vitest';
import {
  nextLocationCaseMode,
  sanitizeLocationCaseMode,
  toTextTransform,
} from './locationCase';

describe('locationCase helpers', () => {
  it('sanitizes unknown values to upper', () => {
    expect(sanitizeLocationCaseMode('nope')).toBe('upper');
    expect(sanitizeLocationCaseMode(null)).toBe('upper');
    expect(sanitizeLocationCaseMode(undefined)).toBe('upper');
  });

  it('keeps valid case values', () => {
    expect(sanitizeLocationCaseMode('upper')).toBe('upper');
    expect(sanitizeLocationCaseMode('lower')).toBe('lower');
  });

  it('cycles in the expected order', () => {
    expect(nextLocationCaseMode('upper')).toBe('lower');
    expect(nextLocationCaseMode('lower')).toBe('upper');
  });

  it('maps mode to css text-transform', () => {
    expect(toTextTransform('upper')).toBe('uppercase');
    expect(toTextTransform('lower')).toBe('lowercase');
  });
});
