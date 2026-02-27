import { afterEach, describe, expect, it } from 'vitest';
import {
  getThirdUtilityVisibilitySession,
  isThirdMobileUtilityViewport,
  resetThirdUtilityVisibilitySessionForTests,
  resolveInitialThirdUtilityVisibility,
  setThirdUtilityVisibilitySession,
  THIRD_MOBILE_UTILITY_MAX_WIDTH_PX,
  type ThirdUtilityVisibility,
} from './thirdMobileUtilityVisibility';

describe('thirdMobileUtilityVisibility', () => {
  afterEach(() => {
    resetThirdUtilityVisibilitySessionForTests();
  });

  it('treats widths at and below threshold as mobile', () => {
    expect(isThirdMobileUtilityViewport(THIRD_MOBILE_UTILITY_MAX_WIDTH_PX)).toBe(true);
    expect(isThirdMobileUtilityViewport(THIRD_MOBILE_UTILITY_MAX_WIDTH_PX + 1)).toBe(false);
  });

  it('defaults both utility windows hidden on first mobile load', () => {
    expect(resolveInitialThirdUtilityVisibility(560, null)).toEqual({
      sceneWindowVisible: false,
      inspectorWindowVisible: false,
    });
  });

  it('defaults both utility windows visible on first non-mobile load', () => {
    expect(resolveInitialThirdUtilityVisibility(561, null)).toEqual({
      sceneWindowVisible: true,
      inspectorWindowVisible: true,
    });
  });

  it('prefers session visibility over viewport width defaults', () => {
    const session: ThirdUtilityVisibility = {
      sceneWindowVisible: false,
      inspectorWindowVisible: true,
    };

    expect(resolveInitialThirdUtilityVisibility(999, session)).toEqual(session);
    expect(resolveInitialThirdUtilityVisibility(320, session)).toEqual(session);
  });

  it('stores and returns session visibility safely', () => {
    const session: ThirdUtilityVisibility = {
      sceneWindowVisible: true,
      inspectorWindowVisible: false,
    };
    setThirdUtilityVisibilitySession(session);

    const persisted = getThirdUtilityVisibilitySession();
    expect(persisted).toEqual(session);
    expect(persisted).not.toBe(session);

    const next: ThirdUtilityVisibility = {
      sceneWindowVisible: false,
      inspectorWindowVisible: false,
    };
    setThirdUtilityVisibilitySession(next);
    expect(getThirdUtilityVisibilitySession()).toEqual(next);
  });

  it('clears session state via test reset helper', () => {
    setThirdUtilityVisibilitySession({
      sceneWindowVisible: true,
      inspectorWindowVisible: false,
    });
    expect(getThirdUtilityVisibilitySession()).not.toBeNull();

    resetThirdUtilityVisibilitySessionForTests();
    expect(getThirdUtilityVisibilitySession()).toBeNull();
  });
});

