import { describe, expect, it } from 'vitest';
import { buildThirdSceneToolbar } from './thirdSceneToolbar';

describe('thirdSceneToolbar model', () => {
  it('returns stable action order', () => {
    const items = buildThirdSceneToolbar({
      mode: 'edit',
      transformMode: 'translate',
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
    ]);
  });

  it('disables transform and snap in play mode while keeping mode/grid/axes enabled', () => {
    const items = buildThirdSceneToolbar({
      mode: 'play',
      transformMode: 'rotate',
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

    expect(mode?.disabled).toBe(false);
    expect(translate?.disabled).toBe(true);
    expect(rotate?.disabled).toBe(true);
    expect(scale?.disabled).toBe(true);
    expect(snap?.disabled).toBe(true);
    expect(grid?.disabled).toBe(false);
    expect(axes?.disabled).toBe(false);
  });

  it('maps active states deterministically', () => {
    const items = buildThirdSceneToolbar({
      mode: 'edit',
      transformMode: 'scale',
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
  });
});
