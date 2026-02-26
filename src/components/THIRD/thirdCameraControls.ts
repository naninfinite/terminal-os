export const THIRD_FOCUS_CAMERA_DISTANCE = 5;
export const THIRD_FOCUS_PADDING_MULTIPLIER = 3.2;
export const THIRD_FOCUS_CAMERA_Y_OFFSET = 2;

export type ThirdCameraHotkeyAction =
  | 'camera_view_front'
  | 'camera_view_right'
  | 'camera_view_top'
  | 'camera_toggle_projection'
  | 'camera_focus_selected';

export type ResolveThirdCameraHotkeyArgs = {
  code: string;
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  hasSelection: boolean;
  targetTagName?: string | null;
  targetIsContentEditable?: boolean;
};

const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT']);

export const resolveThirdCameraHotkey = (
  args: ResolveThirdCameraHotkeyArgs
): ThirdCameraHotkeyAction | null => {
  if (args.altKey || args.ctrlKey || args.metaKey) return null;
  if (args.targetIsContentEditable) return null;
  if (args.targetTagName && INTERACTIVE_TAGS.has(args.targetTagName.toUpperCase())) return null;

  if (args.key.toLowerCase() === 'f') {
    return args.hasSelection ? 'camera_focus_selected' : null;
  }

  if (args.code === 'Digit1' || args.code === 'Numpad1') return 'camera_view_front';
  if (args.code === 'Digit3' || args.code === 'Numpad3') return 'camera_view_right';
  if (args.code === 'Digit7' || args.code === 'Numpad7') return 'camera_view_top';
  if (args.code === 'Digit5' || args.code === 'Numpad5') return 'camera_toggle_projection';
  return null;
};

export const resolveFocusCameraDistance = (args: {
  objectRadius: number;
  minDistance: number;
}): number => {
  const safeRadius = Number.isFinite(args.objectRadius) ? Math.max(0, args.objectRadius) : 0;
  const safeMinDistance = Number.isFinite(args.minDistance)
    ? Math.max(0, args.minDistance)
    : 0;
  return Math.max(
    THIRD_FOCUS_CAMERA_DISTANCE,
    safeMinDistance,
    safeRadius * THIRD_FOCUS_PADDING_MULTIPLIER
  );
};
