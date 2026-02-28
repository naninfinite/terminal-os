import type { ThirdEditorMode, ThirdProjectionMode, ThirdVec3 } from '../../third/types';

export type ThirdViewportMenuGroupId = 'add' | 'camera' | 'scene' | 'object' | 'panel';
export type ThirdCameraPresetId = 'top' | 'front' | 'right';

export const CAMERA_PRESET_IDS: ReadonlyArray<ThirdCameraPresetId> = ['top', 'front', 'right'];

export type ThirdViewportMenuActionId =
  | 'add_cube'
  | 'add_sphere'
  | 'add_cylinder'
  | 'add_plane'
  | 'camera_toggle_projection'
  | 'camera_view_top'
  | 'camera_view_front'
  | 'camera_view_right'
  | 'camera_reset'
  | 'scene_toggle_mode'
  | 'scene_toggle_snap'
  | 'object_duplicate'
  | 'object_delete'
  | 'object_toggle_physics'
  | 'panel_toggle_visibility';

export type ThirdViewportMenuItem = {
  id: ThirdViewportMenuActionId;
  label: string;
  disabled?: boolean;
};

export type ThirdViewportMenuGroup = {
  id: ThirdViewportMenuGroupId;
  label: string;
  items: ThirdViewportMenuItem[];
};

type ResolveCameraPresetPositionArgs = {
  preset: ThirdCameraPresetId;
  target: ThirdVec3;
  distance: number;
};

export type BuildThirdViewportMenuArgs = {
  mode: ThirdEditorMode;
  snapEnabled: boolean;
  projectionMode: ThirdProjectionMode;
  panelVisible: boolean;
  hasSelection: boolean;
  selectedObjectLocked: boolean;
  selectedObjectPhysicsEnabled: boolean;
};

const CAMERA_PRESET_DIRECTIONS: Record<ThirdCameraPresetId, ThirdVec3> = {
  top: { x: 0, y: 1, z: 0 },
  front: { x: 0, y: 0, z: 1 },
  right: { x: 1, y: 0, z: 0 },
};

export const isCameraPresetId = (value: string): value is ThirdCameraPresetId => (
  value === 'top' || value === 'front' || value === 'right'
);

export const resolveCameraPresetPosition = (
  args: ResolveCameraPresetPositionArgs
): ThirdVec3 => {
  const direction = CAMERA_PRESET_DIRECTIONS[args.preset];
  const distance = Number.isFinite(args.distance) ? Math.max(0.1, args.distance) : 2.5;
  return {
    x: args.target.x + direction.x * distance,
    y: args.target.y + direction.y * distance,
    z: args.target.z + direction.z * distance,
  };
};

export const buildThirdViewportMenu = (
  args: BuildThirdViewportMenuArgs
): ThirdViewportMenuGroup[] => {
  const objectActionDisabled = !args.hasSelection || args.selectedObjectLocked;

  return [
    {
      id: 'add',
      label: 'ADD',
      items: [
        { id: 'add_cube', label: 'CUBE' },
        { id: 'add_sphere', label: 'SPHERE' },
        { id: 'add_cylinder', label: 'CYLINDER' },
        { id: 'add_plane', label: 'PLANE' },
      ],
    },
    {
      id: 'camera',
      label: 'CAMERA',
      items: [
        {
          id: 'camera_toggle_projection',
          label: args.projectionMode === 'orthographic' ? 'SET PERSPECTIVE' : 'SET ORTHOGRAPHIC',
        },
        { id: 'camera_view_top', label: 'VIEW TOP' },
        { id: 'camera_view_front', label: 'VIEW FRONT' },
        { id: 'camera_view_right', label: 'VIEW RIGHT' },
        { id: 'camera_reset', label: 'RESET VIEW' },
      ],
    },
    {
      id: 'scene',
      label: 'SCENE',
      items: [
        {
          id: 'scene_toggle_mode',
          label: args.mode === 'edit' ? 'SWITCH TO PLAY MODE' : 'SWITCH TO EDIT MODE',
        },
        {
          id: 'scene_toggle_snap',
          label: `SNAP: ${args.snapEnabled ? 'ON' : 'OFF'}`,
          disabled: args.mode !== 'edit',
        },
      ],
    },
    {
      id: 'object',
      label: 'OBJECT',
      items: [
        { id: 'object_duplicate', label: 'DUPLICATE', disabled: objectActionDisabled },
        { id: 'object_delete', label: 'DELETE', disabled: objectActionDisabled },
        {
          id: 'object_toggle_physics',
          label: args.selectedObjectPhysicsEnabled ? 'REMOVE PHYSICS' : 'ADD PHYSICS',
          disabled: objectActionDisabled,
        },
      ],
    },
    {
      id: 'panel',
      label: 'PANEL',
      items: [
        {
          id: 'panel_toggle_visibility',
          label: args.panelVisible ? 'HIDE PANEL' : 'SHOW PANEL',
        },
      ],
    },
  ];
};
