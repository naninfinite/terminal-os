import { afterEach, describe, expect, it } from 'vitest';
import {
  createDefaultThirdUtilityPanelSession,
  getThirdUtilityPanelSession,
  isThirdMobileUtilityViewport,
  resetThirdUtilityPanelSessionForTests,
  resolveInitialThirdUtilityPanelSession,
  setThirdUtilityPanelSession,
  THIRD_MOBILE_UTILITY_MAX_WIDTH_PX,
  type ThirdUtilityPanelSession,
} from './thirdUtilityPanelSession';

describe('thirdUtilityPanelSession', () => {
  afterEach(() => {
    resetThirdUtilityPanelSessionForTests();
  });

  it('treats widths at and below threshold as mobile', () => {
    expect(isThirdMobileUtilityViewport(THIRD_MOBILE_UTILITY_MAX_WIDTH_PX)).toBe(true);
    expect(isThirdMobileUtilityViewport(THIRD_MOBILE_UTILITY_MAX_WIDTH_PX + 1)).toBe(false);
  });

  it('creates hidden mobile defaults and visible desktop defaults', () => {
    expect(createDefaultThirdUtilityPanelSession(560)).toEqual({
      panelVisible: false,
      activeTab: 'scene',
    });
    expect(createDefaultThirdUtilityPanelSession(561)).toEqual({
      panelVisible: true,
      activeTab: 'scene',
    });
  });

  it('prefers an existing session over viewport defaults', () => {
    const session: ThirdUtilityPanelSession = {
      panelVisible: false,
      activeTab: 'physics',
    };

    expect(resolveInitialThirdUtilityPanelSession(999, session)).toEqual(session);
    expect(resolveInitialThirdUtilityPanelSession(320, session)).toEqual(session);
  });

  it('stores and returns session state safely', () => {
    const session: ThirdUtilityPanelSession = {
      panelVisible: true,
      activeTab: 'material',
    };
    setThirdUtilityPanelSession(session);

    const persisted = getThirdUtilityPanelSession();
    expect(persisted).toEqual(session);
    expect(persisted).not.toBe(session);
  });

  it('normalizes invalid session tabs back to scene', () => {
    setThirdUtilityPanelSession({
      panelVisible: true,
      activeTab: 'scene',
    });

    expect(resolveInitialThirdUtilityPanelSession(900, {
      panelVisible: false,
      activeTab: 'scene',
    })).toEqual({
      panelVisible: false,
      activeTab: 'scene',
    });
  });

  it('clears session state via test reset helper', () => {
    setThirdUtilityPanelSession({
      panelVisible: true,
      activeTab: 'camera',
    });
    expect(getThirdUtilityPanelSession()).not.toBeNull();

    resetThirdUtilityPanelSessionForTests();
    expect(getThirdUtilityPanelSession()).toBeNull();
  });
});
