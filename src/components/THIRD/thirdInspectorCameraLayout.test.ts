import { describe, expect, it } from 'vitest';
import { THIRD_INSPECTOR_CAMERA_ROWS } from './thirdInspectorCameraLayout';

describe('thirdInspectorCameraLayout', () => {
  it('keeps view trio on top row and projection/reset below', () => {
    expect(THIRD_INSPECTOR_CAMERA_ROWS).toEqual([
      ['camera_view_top', 'camera_view_front', 'camera_view_right'],
      ['camera_toggle_projection', 'camera_reset'],
    ]);
  });
});
