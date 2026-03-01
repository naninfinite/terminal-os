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
  group: 'transform' | 'scene' | 'camera';
  icon: ThirdSceneToolbarActionId;
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

export const shouldShowThirdSceneToolbar = (
  mobileLayout: boolean,
  mobileToolbarExpanded: boolean
): boolean => !mobileLayout || mobileToolbarExpanded;

export const getThirdSceneToolbarToggleLabel = (mobileToolbarExpanded: boolean): string => (
  mobileToolbarExpanded ? 'HIDE TOOLS' : 'TOOLS'
);

export const buildThirdSceneToolbar = (
  args: BuildThirdSceneToolbarArgs
): ThirdSceneToolbarItem[] => {
  const isEditMode = args.mode === 'edit';

  return [
    {
      id: 'scene_toggle_mode',
      group: 'transform',
      icon: 'scene_toggle_mode',
      label: 'MODE',
      title: `MODE | ${isEditMode ? 'EDIT' : 'PLAY'}`,
      active: isEditMode,
      disabled: false,
    },
    {
      id: 'transform_translate',
      group: 'transform',
      icon: 'transform_translate',
      label: 'MOVE',
      title: 'MOVE | W',
      active: args.transformMode === 'translate',
      disabled: !isEditMode,
    },
    {
      id: 'transform_rotate',
      group: 'transform',
      icon: 'transform_rotate',
      label: 'ROTATE',
      title: 'ROTATE | R',
      active: args.transformMode === 'rotate',
      disabled: !isEditMode,
    },
    {
      id: 'transform_scale',
      group: 'transform',
      icon: 'transform_scale',
      label: 'SCALE',
      title: 'SCALE | S',
      active: args.transformMode === 'scale',
      disabled: !isEditMode,
    },
    {
      id: 'scene_toggle_snap',
      group: 'transform',
      icon: 'scene_toggle_snap',
      label: 'SNAP',
      title: `SNAP | ${args.snapEnabled ? 'ON' : 'OFF'} | GRID 1.0 + OBJECT | G`,
      active: args.snapEnabled,
      disabled: !isEditMode,
    },
    {
      id: 'scene_toggle_grid',
      group: 'scene',
      icon: 'scene_toggle_grid',
      label: 'GRID',
      title: `GRID | ${args.showGrid ? 'ON' : 'OFF'}`,
      active: args.showGrid,
      disabled: false,
    },
    {
      id: 'scene_toggle_axes',
      group: 'scene',
      icon: 'scene_toggle_axes',
      label: 'AXES',
      title: `AXES | ${args.showAxes ? 'ON' : 'OFF'}`,
      active: args.showAxes,
      disabled: false,
    },
    {
      id: 'camera_toggle_projection',
      group: 'camera',
      icon: 'camera_toggle_projection',
      label: 'PROJ',
      title: `PROJECTION | ${args.projectionMode === 'orthographic' ? 'ORTHOGRAPHIC' : 'PERSPECTIVE'}`,
      active: args.projectionMode === 'orthographic',
      disabled: false,
    },
    {
      id: 'camera_view_top',
      group: 'camera',
      icon: 'camera_view_top',
      label: 'TOP',
      title: 'VIEW | TOP',
      active: false,
      disabled: false,
    },
    {
      id: 'camera_view_front',
      group: 'camera',
      icon: 'camera_view_front',
      label: 'FRONT',
      title: 'VIEW | FRONT',
      active: false,
      disabled: false,
    },
    {
      id: 'camera_view_right',
      group: 'camera',
      icon: 'camera_view_right',
      label: 'RIGHT',
      title: 'VIEW | RIGHT',
      active: false,
      disabled: false,
    },
    {
      id: 'camera_reset',
      group: 'camera',
      icon: 'camera_reset',
      label: 'RESET',
      title: 'VIEW | RESET',
      active: false,
      disabled: false,
    },
  ];
};
