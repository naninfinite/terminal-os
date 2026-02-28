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

  it('creates a hidden default session for first entry', () => {
    expect(createDefaultThirdUtilityPanelSession()).toEqual({
      panelVisible: false,
      activeTab: 'scene',
    });
  });

  it('prefers an existing session over viewport defaults', () => {
    const session: ThirdUtilityPanelSession = {
      panelVisible: false,
      activeTab: 'physics',
    };

    expect(resolveInitialThirdUtilityPanelSession(session)).toEqual(session);
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

    expect(resolveInitialThirdUtilityPanelSession({
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
