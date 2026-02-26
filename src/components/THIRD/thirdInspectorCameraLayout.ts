export type ThirdInspectorCameraActionId =
  | 'camera_view_top'
  | 'camera_view_front'
  | 'camera_view_right'
  | 'camera_toggle_projection'
  | 'camera_reset';

export const THIRD_INSPECTOR_CAMERA_ROWS: ReadonlyArray<ReadonlyArray<ThirdInspectorCameraActionId>> = [
  ['camera_view_top', 'camera_view_front', 'camera_view_right'],
  ['camera_toggle_projection', 'camera_reset'],
];
