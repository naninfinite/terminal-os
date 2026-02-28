import { describe, expect, it } from 'vitest';
import {
  createInitialThirdInspectorSectionState,
  createThirdInspectorSectionState,
  isThirdInspectorSectionCollapsible,
  isThirdInspectorSectionExpanded,
  THIRD_INSPECTOR_SECTION_IDS,
} from './thirdInspectorSections';

describe('thirdInspectorSections', () => {
  it('keeps a stable inspector section order', () => {
    expect(THIRD_INSPECTOR_SECTION_IDS).toEqual([
      'transform',
      'material',
      'animation',
      'physics',
      'camera',
    ]);
  });

  it('supports expand/collapse all state generation', () => {
    expect(createThirdInspectorSectionState(true)).toEqual({
      transform: true,
      material: true,
      animation: true,
      physics: true,
      camera: true,
    });
    expect(createThirdInspectorSectionState(false)).toEqual({
      transform: false,
      material: false,
      animation: false,
      physics: false,
      camera: false,
    });
  });

  it('defaults all inspector section tabs to expanded', () => {
    expect(createInitialThirdInspectorSectionState()).toEqual({
      transform: true,
      material: true,
      animation: true,
      physics: true,
      camera: true,
    });
  });

  it('keeps collapse toggles desktop-only and forces mobile sections open', () => {
    const desktopState = createThirdInspectorSectionState(false);

    expect(isThirdInspectorSectionCollapsible(false)).toBe(true);
    expect(isThirdInspectorSectionCollapsible(true)).toBe(false);
    expect(isThirdInspectorSectionExpanded(desktopState, 'animation', false)).toBe(false);
    expect(isThirdInspectorSectionExpanded(desktopState, 'animation', true)).toBe(true);
  });
});
