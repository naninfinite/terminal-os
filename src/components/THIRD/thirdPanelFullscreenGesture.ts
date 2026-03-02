import type { ThirdDisplayMode } from '../../third/types';

export const THIRD_PANEL_DOUBLE_TAP_MS = 300;
export const THIRD_PANEL_DOUBLE_TAP_TOLERANCE_PX = 24;

export type ThirdPanelBackgroundTap = {
  at: number;
  x: number;
  y: number;
};

export const shouldOpenThirdPanelFromSceneDoubleClick = (args: {
  mode: ThirdDisplayMode;
  hasSceneHit: boolean;
}): boolean => (
  args.mode === 'panel' && !args.hasSceneHit
);

export const resolveThirdPanelBackgroundTap = (args: {
  mode: ThirdDisplayMode;
  hasSceneHit: boolean;
  previousTap: ThirdPanelBackgroundTap | null;
  tapAt: number;
  x: number;
  y: number;
}): {
  nextTap: ThirdPanelBackgroundTap | null;
  shouldOpenFullscreen: boolean;
} => {
  if (args.mode !== 'panel' || args.hasSceneHit) {
    return {
      nextTap: null,
      shouldOpenFullscreen: false,
    };
  }

  const previousTap = args.previousTap;
  if (!previousTap) {
    return {
      nextTap: { at: args.tapAt, x: args.x, y: args.y },
      shouldOpenFullscreen: false,
    };
  }

  const withinTimeWindow = args.tapAt - previousTap.at <= THIRD_PANEL_DOUBLE_TAP_MS;
  const travelDistance = Math.hypot(args.x - previousTap.x, args.y - previousTap.y);
  const withinDistanceWindow = travelDistance <= THIRD_PANEL_DOUBLE_TAP_TOLERANCE_PX;

  if (withinTimeWindow && withinDistanceWindow) {
    return {
      nextTap: null,
      shouldOpenFullscreen: true,
    };
  }

  return {
    nextTap: { at: args.tapAt, x: args.x, y: args.y },
    shouldOpenFullscreen: false,
  };
};
