import type {
  ThirdEditorMode,
  ThirdProjectionMode,
  ThirdTransformMode,
} from '../../third/types';

export type ThirdSceneToolbarActionId =
  | 'scene_toggle_mode'
  | 'transform_translate'
  | 'transform_rotate'
  | 'transform_scale'
  | 'scene_toggle_snap'
  | 'scene_toggle_grid'
  | 'scene_toggle_axes'
  | 'camera_toggle_projection'
  | 'camera_view_top'
  | 'camera_view_front'
  | 'camera_view_right'
  | 'camera_reset';

export type ThirdSceneToolbarItem = {
  id: ThirdSceneToolbarActionId;
  icon: string;
  label: string;
  title: string;
  active: boolean;
  disabled: boolean;
};

export type BuildThirdSceneToolbarArgs = {
  mode: ThirdEditorMode;
  transformMode: ThirdTransformMode;
  projectionMode: ThirdProjectionMode;
  snapEnabled: boolean;
  showGrid: boolean;
  showAxes: boolean;
};

export const buildThirdSceneToolbar = (
  args: BuildThirdSceneToolbarArgs
): ThirdSceneToolbarItem[] => {
  const isEditMode = args.mode === 'edit';

  // TODO(THIRD toolbar): Replace two-letter placeholder glyphs with real SVG icons.
  return [
    {
      id: 'scene_toggle_mode',
      icon: 'MD',
      label: 'MODE',
      title: `MODE: ${isEditMode ? 'EDIT' : 'PLAY'}`,
      active: isEditMode,
      disabled: false,
    },
    {
      id: 'transform_translate',
      icon: 'MV',
      label: 'MOVE',
      title: 'MOVE [W]',
      active: args.transformMode === 'translate',
      disabled: !isEditMode,
    },
    {
      id: 'transform_rotate',
      icon: 'RT',
      label: 'ROTATE',
      title: 'ROTATE [R]',
      active: args.transformMode === 'rotate',
      disabled: !isEditMode,
    },
    {
      id: 'transform_scale',
      icon: 'SC',
      label: 'SCALE',
      title: 'SCALE [S]',
      active: args.transformMode === 'scale',
      disabled: !isEditMode,
    },
    {
      id: 'scene_toggle_snap',
      icon: 'SN',
      label: 'SNAP',
      title: `SNAP [G]: ${args.snapEnabled ? 'ON' : 'OFF'}`,
      active: args.snapEnabled,
      disabled: !isEditMode,
    },
    {
      id: 'scene_toggle_grid',
      icon: 'GD',
      label: 'GRID',
      title: `GRID: ${args.showGrid ? 'ON' : 'OFF'}`,
      active: args.showGrid,
      disabled: false,
    },
    {
      id: 'scene_toggle_axes',
      icon: 'AX',
      label: 'AXES',
      title: `AXES: ${args.showAxes ? 'ON' : 'OFF'}`,
      active: args.showAxes,
      disabled: false,
    },
    {
      id: 'camera_toggle_projection',
      icon: 'PJ',
      label: 'PROJ',
      title: `PROJECTION: ${args.projectionMode === 'orthographic' ? 'ORTHOGRAPHIC' : 'PERSPECTIVE'}`,
      active: args.projectionMode === 'orthographic',
      disabled: false,
    },
    {
      id: 'camera_view_top',
      icon: 'TP',
      label: 'TOP',
      title: 'CAMERA VIEW TOP',
      active: false,
      disabled: false,
    },
    {
      id: 'camera_view_front',
      icon: 'FR',
      label: 'FRONT',
      title: 'CAMERA VIEW FRONT',
      active: false,
      disabled: false,
    },
    {
      id: 'camera_view_right',
      icon: 'RG',
      label: 'RIGHT',
      title: 'CAMERA VIEW RIGHT',
      active: false,
      disabled: false,
    },
    {
      id: 'camera_reset',
      icon: 'RS',
      label: 'RESET',
      title: 'CAMERA RESET VIEW',
      active: false,
      disabled: false,
    },
  ];
};
