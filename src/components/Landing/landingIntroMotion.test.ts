import { describe, expect, it } from 'vitest';
import { getLandingIntroDurationMs } from './landingIntroMotion';

describe('landingIntroMotion', () => {
  it('uses the full CRT intro duration when motion is allowed', () => {
    expect(getLandingIntroDurationMs(false)).toBe(3000);
  });

  it('uses the reduced intro duration when reduced motion is preferred', () => {
    expect(getLandingIntroDurationMs(true)).toBe(120);
  });
});
