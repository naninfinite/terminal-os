import { describe, expect, it } from 'vitest';
import {
  buildThirdViewportMenu,
  isCameraPresetId,
  resolveCameraPresetPosition,
} from './thirdViewportMenu';

describe('thirdViewportMenu model', () => {
  it('includes required top-level groups and camera actions', () => {
    const groups = buildThirdViewportMenu({
      mode: 'play',
      snapEnabled: false,
      projectionMode: 'perspective',
      inspectorVisible: true,
      hasSelection: true,
      selectedObjectPhysicsEnabled: false,
    });

    expect(groups.map((group) => group.id)).toEqual(['add', 'camera', 'scene', 'object', 'inspector']);

    const cameraItems = groups.find((group) => group.id === 'camera')?.items ?? [];
    expect(cameraItems.map((item) => item.id)).toEqual([
      'camera_toggle_projection',
      'camera_view_top',
      'camera_view_front',
      'camera_view_right',
      'camera_reset',
    ]);
  });

  it('disables object actions without a selected object', () => {
    const groups = buildThirdViewportMenu({
      mode: 'edit',
      snapEnabled: true,
      projectionMode: 'orthographic',
      inspectorVisible: false,
      hasSelection: false,
      selectedObjectPhysicsEnabled: false,
    });

    const objectItems = groups.find((group) => group.id === 'object')?.items ?? [];
    expect(objectItems.every((item) => item.disabled === true)).toBe(true);

    const sceneSnap = groups.find((group) => group.id === 'scene')?.items.find((item) => item.id === 'scene_toggle_snap');
    expect(sceneSnap?.disabled).toBe(false);
  });
});

describe('thirdViewportMenu camera helpers', () => {
  it('identifies supported camera preset ids', () => {
    expect(isCameraPresetId('top')).toBe(true);
    expect(isCameraPresetId('front')).toBe(true);
    expect(isCameraPresetId('right')).toBe(true);
    expect(isCameraPresetId('left')).toBe(false);
  });

  it('resolves deterministic camera preset positions', () => {
    const target = { x: 2, y: 3, z: 4 };
    const distance = 5;

    expect(resolveCameraPresetPosition({ preset: 'top', target, distance })).toEqual({ x: 2, y: 8, z: 4 });
    expect(resolveCameraPresetPosition({ preset: 'front', target, distance })).toEqual({ x: 2, y: 3, z: 9 });
    expect(resolveCameraPresetPosition({ preset: 'right', target, distance })).toEqual({ x: 7, y: 3, z: 4 });
  });
});
