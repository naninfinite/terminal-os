import { describe, expect, it } from 'vitest';
import {
  getThirdUtilityTabLabel,
  isThirdObjectUtilityTab,
  resolveNextVisibleThirdUtilityTab,
  shouldShowThirdUtilityHideAction,
  THIRD_DEFAULT_UTILITY_TAB_ID,
  THIRD_UTILITY_TAB_IDS,
} from './thirdUtilityTabs';

describe('thirdUtilityTabs', () => {
  it('keeps a stable shared utility tab order', () => {
    expect(THIRD_UTILITY_TAB_IDS).toEqual([
      'scene',
      'object',
      'camera',
    ]);
  });

  it('exposes scene as the default tab', () => {
    expect(THIRD_DEFAULT_UTILITY_TAB_ID).toBe('scene');
  });

  it('returns stable labels for each tab', () => {
    expect(THIRD_UTILITY_TAB_IDS.map((tabId) => getThirdUtilityTabLabel(tabId))).toEqual([
      'SCENE',
      'OBJECT',
      'CAMERA',
    ]);
  });

  it('identifies scene versus object utility tabs', () => {
    expect(isThirdObjectUtilityTab('scene')).toBe(false);
    expect(isThirdObjectUtilityTab('object')).toBe(true);
    expect(isThirdObjectUtilityTab('camera')).toBe(false);
  });

  it('falls back to scene when the requested tab is missing', () => {
    expect(resolveNextVisibleThirdUtilityTab({ currentTab: null })).toBe('scene');
    expect(resolveNextVisibleThirdUtilityTab({ currentTab: undefined })).toBe('scene');
  });

  it('preserves valid tabs and honors explicit fallback overrides', () => {
    expect(resolveNextVisibleThirdUtilityTab({ currentTab: 'object' })).toBe('object');
    expect(resolveNextVisibleThirdUtilityTab({
      currentTab: null,
      fallbackTab: 'camera',
    })).toBe('camera');
  });

  it('shows the explicit hide action only on desktop layouts', () => {
    expect(shouldShowThirdUtilityHideAction(false)).toBe(true);
    expect(shouldShowThirdUtilityHideAction(true)).toBe(false);
  });
});
