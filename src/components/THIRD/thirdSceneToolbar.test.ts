import { describe, expect, it } from 'vitest';
import {
  buildThirdSceneToolbar,
  getThirdSceneToolbarToggleLabel,
  shouldShowThirdSceneToolbar,
} from './thirdSceneToolbar';

describe('thirdSceneToolbar model', () => {
  it('returns stable action order', () => {
    const items = buildThirdSceneToolbar({
      mode: 'edit',
      transformMode: 'translate',
      projectionMode: 'perspective',
      snapEnabled: false,
      showGrid: false,
      showAxes: false,
    });

    expect(items.map((item) => item.id)).toEqual([
      'scene_toggle_mode',
      'transform_translate',
      'transform_rotate',
      'transform_scale',
      'scene_toggle_snap',
      'scene_toggle_grid',
      'scene_toggle_axes',
      'camera_toggle_projection',
      'camera_view_top',
      'camera_view_front',
      'camera_view_right',
      'camera_reset',
    ]);
    expect(items.map((item) => item.group)).toEqual([
      'transform',
      'transform',
      'transform',
      'transform',
      'transform',
      'scene',
      'scene',
      'camera',
      'camera',
      'camera',
      'camera',
      'camera',
    ]);
    expect(items.map((item) => item.icon)).toEqual([
      'scene_toggle_mode',
      'transform_translate',
      'transform_rotate',
      'transform_scale',
      'scene_toggle_snap',
      'scene_toggle_grid',
      'scene_toggle_axes',
      'camera_toggle_projection',
      'camera_view_top',
      'camera_view_front',
      'camera_view_right',
      'camera_reset',
    ]);
  });

  it('disables transform and snap in play mode while keeping mode/grid/axes/camera enabled', () => {
    const items = buildThirdSceneToolbar({
      mode: 'play',
      transformMode: 'rotate',
      projectionMode: 'perspective',
      snapEnabled: true,
      showGrid: true,
      showAxes: true,
    });

    const mode = items.find((item) => item.id === 'scene_toggle_mode');
    const translate = items.find((item) => item.id === 'transform_translate');
    const rotate = items.find((item) => item.id === 'transform_rotate');
    const scale = items.find((item) => item.id === 'transform_scale');
    const snap = items.find((item) => item.id === 'scene_toggle_snap');
    const grid = items.find((item) => item.id === 'scene_toggle_grid');
    const axes = items.find((item) => item.id === 'scene_toggle_axes');
    const projection = items.find((item) => item.id === 'camera_toggle_projection');
    const top = items.find((item) => item.id === 'camera_view_top');
    const front = items.find((item) => item.id === 'camera_view_front');
    const right = items.find((item) => item.id === 'camera_view_right');
    const reset = items.find((item) => item.id === 'camera_reset');

    expect(mode?.disabled).toBe(false);
    expect(translate?.disabled).toBe(true);
    expect(rotate?.disabled).toBe(true);
    expect(scale?.disabled).toBe(true);
    expect(snap?.disabled).toBe(true);
    expect(grid?.disabled).toBe(false);
    expect(axes?.disabled).toBe(false);
    expect(projection?.disabled).toBe(false);
    expect(top?.disabled).toBe(false);
    expect(front?.disabled).toBe(false);
    expect(right?.disabled).toBe(false);
    expect(reset?.disabled).toBe(false);
  });

  it('maps active states deterministically', () => {
    const items = buildThirdSceneToolbar({
      mode: 'edit',
      transformMode: 'scale',
      projectionMode: 'orthographic',
      snapEnabled: true,
      showGrid: true,
      showAxes: false,
    });

    expect(items.find((item) => item.id === 'scene_toggle_mode')?.active).toBe(true);
    expect(items.find((item) => item.id === 'transform_translate')?.active).toBe(false);
    expect(items.find((item) => item.id === 'transform_rotate')?.active).toBe(false);
    expect(items.find((item) => item.id === 'transform_scale')?.active).toBe(true);
    expect(items.find((item) => item.id === 'scene_toggle_snap')?.active).toBe(true);
    expect(items.find((item) => item.id === 'scene_toggle_grid')?.active).toBe(true);
    expect(items.find((item) => item.id === 'scene_toggle_axes')?.active).toBe(false);
    expect(items.find((item) => item.id === 'camera_toggle_projection')?.active).toBe(true);
    expect(items.find((item) => item.id === 'camera_view_top')?.active).toBe(false);
    expect(items.find((item) => item.id === 'camera_view_front')?.active).toBe(false);
    expect(items.find((item) => item.id === 'camera_view_right')?.active).toBe(false);
    expect(items.find((item) => item.id === 'camera_reset')?.active).toBe(false);
  });

  it('uses consistent toolbar tooltip format', () => {
    const items = buildThirdSceneToolbar({
      mode: 'edit',
      transformMode: 'translate',
      projectionMode: 'orthographic',
      snapEnabled: false,
      showGrid: false,
      showAxes: true,
    });
    expect(items.every((item) => item.title.includes('|'))).toBe(true);
  });

  it('resolves mobile toolbar visibility and trigger labels deterministically', () => {
    expect(shouldShowThirdSceneToolbar(false, false)).toBe(true);
    expect(shouldShowThirdSceneToolbar(true, false)).toBe(false);
    expect(shouldShowThirdSceneToolbar(true, true)).toBe(true);
    expect(getThirdSceneToolbarToggleLabel(false)).toBe('TOOLS');
    expect(getThirdSceneToolbarToggleLabel(true)).toBe('HIDE TOOLS');
  });
});
