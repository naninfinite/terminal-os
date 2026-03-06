import type { TronDirection, TronPlayerId } from '../../connect/types';

export type ConnectSeatBinding = {
  playerId: TronPlayerId;
  scheme: 'dual' | 'wasd' | 'arrows';
};

export type ConnectTurnIntent = {
  playerId: TronPlayerId;
  direction: TronDirection;
};

const WASD_TO_DIRECTION: Record<string, TronDirection> = {
  w: 'up',
  W: 'up',
  a: 'left',
  A: 'left',
  s: 'down',
  S: 'down',
  d: 'right',
  D: 'right',
};

const ARROW_TO_DIRECTION: Record<string, TronDirection> = {
  ArrowUp: 'up',
  ArrowLeft: 'left',
  ArrowDown: 'down',
  ArrowRight: 'right',
};

export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!target || typeof target !== 'object') return false;
  if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
    if (target.isContentEditable) return true;
    const tagName = target.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  }
  const genericTarget = target as unknown as {
    tagName?: unknown;
    isContentEditable?: unknown;
  };
  const maybeTagName = typeof genericTarget.tagName === 'string'
    ? genericTarget.tagName.toLowerCase()
    : '';
  const maybeContentEditable = genericTarget.isContentEditable === true;
  if (maybeContentEditable) return true;
  const tagName = maybeTagName;
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
};

export const shouldHandleConnectHotkeys = (args: {
  matchActive: boolean;
  isFullscreen: boolean;
  activeScopeIsConnect: boolean;
  rootContainsFocus: boolean;
  target: EventTarget | null;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}): boolean => {
  if (!args.matchActive) return false;
  if (args.metaKey || args.ctrlKey || args.altKey) return false;
  if (isEditableTarget(args.target)) return false;
  if (args.isFullscreen) return true;
  return args.activeScopeIsConnect || args.rootContainsFocus;
};

export const deriveSeatBindings = (ownedSeatIds: TronPlayerId[]): ConnectSeatBinding[] => {
  const ordered = [...ownedSeatIds].sort((left, right) => left.localeCompare(right)).slice(0, 2);
  if (ordered.length === 1) {
    return [{ playerId: ordered[0]!, scheme: 'dual' }];
  }
  if (ordered.length >= 2) {
    return [
      { playerId: ordered[0]!, scheme: 'wasd' },
      { playerId: ordered[1]!, scheme: 'arrows' },
    ];
  }
  return [];
};

export const resolveConnectTurnIntent = (args: {
  ownedSeatIds: TronPlayerId[];
  key: string;
}): ConnectTurnIntent | null => {
  const bindings = deriveSeatBindings(args.ownedSeatIds);
  if (bindings.length === 0) return null;

  for (const binding of bindings) {
    if (binding.scheme === 'dual') {
      const direction = WASD_TO_DIRECTION[args.key] ?? ARROW_TO_DIRECTION[args.key];
      if (direction) return { playerId: binding.playerId, direction };
      continue;
    }
    if (binding.scheme === 'wasd') {
      const direction = WASD_TO_DIRECTION[args.key];
      if (direction) return { playerId: binding.playerId, direction };
      continue;
    }
    const direction = ARROW_TO_DIRECTION[args.key];
    if (direction) return { playerId: binding.playerId, direction };
  }

  return null;
};
