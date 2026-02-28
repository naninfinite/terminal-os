import { describe, expect, it } from 'vitest';
import {
  getThirdUtilityTabLabel,
  isThirdInspectorSectionTab,
  resolveNextVisibleThirdUtilityTab,
  THIRD_DEFAULT_UTILITY_TAB_ID,
  THIRD_UTILITY_TAB_IDS,
} from './thirdUtilityTabs';

describe('thirdUtilityTabs', () => {
  it('keeps a stable shared utility tab order', () => {
    expect(THIRD_UTILITY_TAB_IDS).toEqual([
      'scene',
      'transform',
      'material',
      'animation',
      'physics',
      'camera',
    ]);
  });

  it('exposes scene as the default tab', () => {
    expect(THIRD_DEFAULT_UTILITY_TAB_ID).toBe('scene');
  });

  it('returns stable labels for each tab', () => {
    expect(THIRD_UTILITY_TAB_IDS.map((tabId) => getThirdUtilityTabLabel(tabId))).toEqual([
      'SCENE',
      'TRANSFORM',
      'MATERIAL',
      'ANIMATION',
      'PHYSICS',
      'CAMERA',
    ]);
  });

  it('identifies scene versus inspector section tabs', () => {
    expect(isThirdInspectorSectionTab('scene')).toBe(false);
    expect(isThirdInspectorSectionTab('transform')).toBe(true);
    expect(isThirdInspectorSectionTab('camera')).toBe(true);
  });

  it('falls back to scene when the requested tab is missing', () => {
    expect(resolveNextVisibleThirdUtilityTab({ currentTab: null })).toBe('scene');
    expect(resolveNextVisibleThirdUtilityTab({ currentTab: undefined })).toBe('scene');
  });

  it('preserves valid tabs and honors explicit fallback overrides', () => {
    expect(resolveNextVisibleThirdUtilityTab({ currentTab: 'material' })).toBe('material');
    expect(resolveNextVisibleThirdUtilityTab({
      currentTab: null,
      fallbackTab: 'physics',
    })).toBe('physics');
  });
});
