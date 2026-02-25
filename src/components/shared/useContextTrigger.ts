import { useEffect, useMemo } from 'react';
import type React from 'react';

export type ContextTriggerSource = 'contextmenu' | 'longpress' | 'keyboard';

export type ContextTriggerOpenDetail = {
  x: number;
  y: number;
  source: ContextTriggerSource;
};

export const CONTEXT_LONG_PRESS_MS = 450;
export const CONTEXT_MOVE_TOLERANCE_PX = 10;

const INTERACTIVE_TARGET_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[data-context-ignore="true"]',
].join(', ');

type TargetLike = {
  closest?: (selector: string) => unknown;
  isContentEditable?: boolean;
};

export const isInteractiveContextTarget = (target: EventTarget | null): boolean => {
  if (!target || typeof target !== 'object') return false;
  const candidate = target as TargetLike;
  if (candidate.isContentEditable) return true;
  if (typeof candidate.closest !== 'function') return false;
  try {
    return Boolean(candidate.closest(INTERACTIVE_TARGET_SELECTOR));
  } catch {
    return false;
  }
};

export const isKeyboardContextShortcut = (key: string, shiftKey: boolean): boolean => (
  key === 'ContextMenu' || (key === 'F10' && shiftKey)
);

export const exceededMoveTolerance = (
  start: { x: number; y: number },
  current: { x: number; y: number },
  tolerancePx: number
): boolean => {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  return Math.hypot(dx, dy) > tolerancePx;
};

type PointerLike = {
  pointerId: number;
  pointerType: string;
  clientX: number;
  clientY: number;
  button?: number;
  target?: EventTarget | null;
};

type KeyboardLike = {
  key: string;
  shiftKey: boolean;
  rect: {
    left: number;
    top: number;
  };
};

type ContextTriggerControllerOptions = {
  onOpen: (detail: ContextTriggerOpenDetail) => void;
  disabled?: boolean;
  longPressMs?: number;
  moveTolerancePx?: number;
  suppressInteractiveTargets?: boolean;
};

export type ContextTriggerController = {
  contextMenu: (args: { clientX: number; clientY: number; target?: EventTarget | null }) => boolean;
  pointerDown: (args: PointerLike) => void;
  pointerMove: (args: Pick<PointerLike, 'pointerId' | 'clientX' | 'clientY'>) => void;
  pointerUp: (args: Pick<PointerLike, 'pointerId'>) => void;
  pointerCancel: (args?: Pick<PointerLike, 'pointerId'>) => void;
  keyboard: (args: KeyboardLike) => boolean;
  consumeClickSuppression: () => boolean;
  dispose: () => void;
};

type PointerPressState = {
  pointerId: number;
  x: number;
  y: number;
};

export const createContextTriggerController = (
  options: ContextTriggerControllerOptions
): ContextTriggerController => {
  const longPressMs = options.longPressMs ?? CONTEXT_LONG_PRESS_MS;
  const moveTolerancePx = options.moveTolerancePx ?? CONTEXT_MOVE_TOLERANCE_PX;
  const suppressInteractiveTargets = options.suppressInteractiveTargets ?? true;

  let pointerPressState: PointerPressState | null = null;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let suppressNextClick = false;

  const clearPointerState = () => {
    if (timerId != null) {
      clearTimeout(timerId);
      timerId = null;
    }
    pointerPressState = null;
  };

  const openAt = (detail: ContextTriggerOpenDetail) => {
    if (options.disabled) return;
    options.onOpen(detail);
    suppressNextClick = detail.source === 'longpress';
  };

  return {
    contextMenu: ({ clientX, clientY, target }) => {
      if (options.disabled) return false;
      if (suppressInteractiveTargets && isInteractiveContextTarget(target ?? null)) return false;
      openAt({ x: clientX, y: clientY, source: 'contextmenu' });
      return true;
    },
    pointerDown: ({ pointerId, pointerType, clientX, clientY, button, target }) => {
      if (options.disabled) return;
      if (pointerType !== 'touch' && pointerType !== 'pen') return;
      if (typeof button === 'number' && button !== 0) return;
      if (suppressInteractiveTargets && isInteractiveContextTarget(target ?? null)) return;

      clearPointerState();
      pointerPressState = { pointerId, x: clientX, y: clientY };
      timerId = setTimeout(() => {
        if (!pointerPressState || pointerPressState.pointerId !== pointerId) return;
        openAt({ x: pointerPressState.x, y: pointerPressState.y, source: 'longpress' });
        clearPointerState();
      }, longPressMs);
    },
    pointerMove: ({ pointerId, clientX, clientY }) => {
      if (!pointerPressState || pointerPressState.pointerId !== pointerId) return;
      if (
        exceededMoveTolerance(
          { x: pointerPressState.x, y: pointerPressState.y },
          { x: clientX, y: clientY },
          moveTolerancePx
        )
      ) {
        clearPointerState();
      }
    },
    pointerUp: ({ pointerId }) => {
      if (!pointerPressState || pointerPressState.pointerId !== pointerId) return;
      clearPointerState();
    },
    pointerCancel: (args) => {
      if (!pointerPressState) return;
      if (!args || pointerPressState.pointerId === args.pointerId) clearPointerState();
    },
    keyboard: ({ key, shiftKey, rect }) => {
      if (options.disabled) return false;
      if (!isKeyboardContextShortcut(key, shiftKey)) return false;
      openAt({ x: rect.left + 8, y: rect.top + 8, source: 'keyboard' });
      return true;
    },
    consumeClickSuppression: () => {
      if (!suppressNextClick) return false;
      suppressNextClick = false;
      return true;
    },
    dispose: () => {
      clearPointerState();
      suppressNextClick = false;
    },
  };
};

export type ContextTriggerHandlers<T extends HTMLElement = HTMLElement> = {
  onContextMenu: React.MouseEventHandler<T>;
  onPointerDown: React.PointerEventHandler<T>;
  onPointerMove: React.PointerEventHandler<T>;
  onPointerUp: React.PointerEventHandler<T>;
  onPointerCancel: React.PointerEventHandler<T>;
  onClickCapture: React.MouseEventHandler<T>;
  onKeyDown: React.KeyboardEventHandler<T>;
};

type UseContextTriggerOptions = {
  onOpen: (detail: ContextTriggerOpenDetail) => void;
  disabled?: boolean;
  longPressMs?: number;
  moveTolerancePx?: number;
  suppressInteractiveTargets?: boolean;
};

export const useContextTrigger = <T extends HTMLElement = HTMLElement>(
  options: UseContextTriggerOptions
): ContextTriggerHandlers<T> => {
  const controller = useMemo(
    () => createContextTriggerController(options),
    [
      options.disabled,
      options.longPressMs,
      options.moveTolerancePx,
      options.onOpen,
      options.suppressInteractiveTargets,
    ]
  );

  useEffect(() => () => controller.dispose(), [controller]);

  return {
    onContextMenu: (event) => {
      const handled = controller.contextMenu({
        clientX: event.clientX,
        clientY: event.clientY,
        target: event.target,
      });
      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
    },
    onPointerDown: (event) => {
      controller.pointerDown({
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        clientX: event.clientX,
        clientY: event.clientY,
        button: event.button,
        target: event.target,
      });
    },
    onPointerMove: (event) => {
      controller.pointerMove({
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
      });
    },
    onPointerUp: (event) => {
      controller.pointerUp({ pointerId: event.pointerId });
    },
    onPointerCancel: (event) => {
      controller.pointerCancel({ pointerId: event.pointerId });
    },
    onClickCapture: (event) => {
      if (!controller.consumeClickSuppression()) return;
      event.preventDefault();
      event.stopPropagation();
    },
    onKeyDown: (event) => {
      const handled = controller.keyboard({
        key: event.key,
        shiftKey: event.shiftKey,
        rect: event.currentTarget.getBoundingClientRect(),
      });
      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
    },
  };
};
