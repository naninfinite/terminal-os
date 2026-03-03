import { formatInspectorNumber } from './transformInspector';
import type { ThirdPrimitiveType, ThirdVec3 } from '../../third/types';

export const THIRD_EDIT_MODE_NUDGE_REQUIRED_CLICKS = 2;
export const THIRD_EDIT_MODE_NUDGE_CLICK_WINDOW_MS = 650;
export const THIRD_EDIT_MODE_NUDGE_COOLDOWN_MS = 2200;

export type ThirdObjectHoverCardContent = {
  title: string;
  subtitle: string;
};

export type ThirdEditModeNudgeState = {
  objectId: string | null;
  clickCount: number;
  lastClickAt: number;
  cooldownUntil: number;
};

export type ResolveThirdEditModeNudgeResult = {
  nextState: ThirdEditModeNudgeState;
  shouldShow: boolean;
};

export const createInitialThirdEditModeNudgeState = (): ThirdEditModeNudgeState => ({
  objectId: null,
  clickCount: 0,
  lastClickAt: 0,
  cooldownUntil: 0,
});

export const buildThirdObjectHoverCardContent = (
  name: string,
  type: ThirdPrimitiveType,
  worldPosition: ThirdVec3
): ThirdObjectHoverCardContent => ({
  title: `${name} | ${type}`,
  subtitle: [
    formatInspectorNumber(worldPosition.x),
    formatInspectorNumber(worldPosition.y),
    formatInspectorNumber(worldPosition.z),
  ].join(' / '),
});

export const resolveThirdEditModeNudge = (
  state: ThirdEditModeNudgeState,
  args: {
    objectId: string;
    at: number;
  }
): ResolveThirdEditModeNudgeResult => {
  if (args.at < state.cooldownUntil) {
    return {
      nextState: state,
      shouldShow: false,
    };
  }

  const repeatedObject = state.objectId === args.objectId;
  const withinClickWindow = args.at - state.lastClickAt <= THIRD_EDIT_MODE_NUDGE_CLICK_WINDOW_MS;
  const clickCount = repeatedObject && withinClickWindow
    ? state.clickCount + 1
    : 1;

  if (clickCount >= THIRD_EDIT_MODE_NUDGE_REQUIRED_CLICKS) {
    return {
      nextState: {
        objectId: null,
        clickCount: 0,
        lastClickAt: 0,
        cooldownUntil: args.at + THIRD_EDIT_MODE_NUDGE_COOLDOWN_MS,
      },
      shouldShow: true,
    };
  }

  return {
    nextState: {
      objectId: args.objectId,
      clickCount,
      lastClickAt: args.at,
      cooldownUntil: state.cooldownUntil,
    },
    shouldShow: false,
  };
};
