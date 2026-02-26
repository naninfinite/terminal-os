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

type TouchLike = {
  identifier: number;
  clientX: number;
  clientY: number;
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
  touchStart: (args: TouchLike) => void;
  touchMove: (args: Pick<TouchLike, 'identifier' | 'clientX' | 'clientY'>) => void;
  touchEnd: (args: Pick<TouchLike, 'identifier'>) => void;
  touchCancel: (args?: Pick<TouchLike, 'identifier'>) => void;
  keyboard: (args: KeyboardLike) => boolean;
  consumeClickSuppression: () => boolean;
  dispose: () => void;
};

type PointerPressState = {
  pointerId: number;
  x: number;
  y: number;
};

type TouchPressState = {
  identifier: number;
  x: number;
  y: number;
};

const TOUCH_POINTER_DUPLICATE_SUPPRESSION_MS = 80;

export const createContextTriggerController = (
  options: ContextTriggerControllerOptions
): ContextTriggerController => {
  const longPressMs = options.longPressMs ?? CONTEXT_LONG_PRESS_MS;
  const moveTolerancePx = options.moveTolerancePx ?? CONTEXT_MOVE_TOLERANCE_PX;
  const suppressInteractiveTargets = options.suppressInteractiveTargets ?? true;

  let pointerPressState: PointerPressState | null = null;
  let pointerTimerId: ReturnType<typeof setTimeout> | null = null;
  let touchPressState: TouchPressState | null = null;
  let touchTimerId: ReturnType<typeof setTimeout> | null = null;
  let lastTouchPointerDown: { x: number; y: number; at: number } | null = null;
  let suppressNextClick = false;

  const clearPointerState = () => {
    if (pointerTimerId != null) {
      clearTimeout(pointerTimerId);
      pointerTimerId = null;
    }
    pointerPressState = null;
  };

  const clearTouchState = () => {
    if (touchTimerId != null) {
      clearTimeout(touchTimerId);
      touchTimerId = null;
    }
    touchPressState = null;
  };

  const shouldSkipTouchFallback = (args: Pick<TouchLike, 'clientX' | 'clientY'>): boolean => {
    if (!lastTouchPointerDown) return false;
    const elapsedMs = Date.now() - lastTouchPointerDown.at;
    if (elapsedMs > TOUCH_POINTER_DUPLICATE_SUPPRESSION_MS) return false;
    return !exceededMoveTolerance(
      { x: lastTouchPointerDown.x, y: lastTouchPointerDown.y },
      { x: args.clientX, y: args.clientY },
      moveTolerancePx
    );
  };

  const openAt = (detail: ContextTriggerOpenDetail) => {
    if (options.disabled) return;
    clearPointerState();
    clearTouchState();
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
      if (pointerType === 'touch') {
        lastTouchPointerDown = { x: clientX, y: clientY, at: Date.now() };
      }
      pointerTimerId = setTimeout(() => {
        if (!pointerPressState || pointerPressState.pointerId !== pointerId) return;
        openAt({ x: pointerPressState.x, y: pointerPressState.y, source: 'longpress' });
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
    touchStart: ({ identifier, clientX, clientY, target }) => {
      if (options.disabled) return;
      if (suppressInteractiveTargets && isInteractiveContextTarget(target ?? null)) return;
      if (shouldSkipTouchFallback({ clientX, clientY })) return;

      clearTouchState();
      touchPressState = { identifier, x: clientX, y: clientY };
      touchTimerId = setTimeout(() => {
        if (!touchPressState || touchPressState.identifier !== identifier) return;
        openAt({ x: touchPressState.x, y: touchPressState.y, source: 'longpress' });
      }, longPressMs);
    },
    touchMove: ({ identifier, clientX, clientY }) => {
      if (!touchPressState || touchPressState.identifier !== identifier) return;
      if (
        exceededMoveTolerance(
          { x: touchPressState.x, y: touchPressState.y },
          { x: clientX, y: clientY },
          moveTolerancePx
        )
      ) {
        clearTouchState();
      }
    },
    touchEnd: ({ identifier }) => {
      if (!touchPressState || touchPressState.identifier !== identifier) return;
      clearTouchState();
    },
    touchCancel: (args) => {
      if (!touchPressState) return;
      if (!args || touchPressState.identifier === args.identifier) clearTouchState();
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
      clearTouchState();
      lastTouchPointerDown = null;
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
  onTouchStart: React.TouchEventHandler<T>;
  onTouchMove: React.TouchEventHandler<T>;
  onTouchEnd: React.TouchEventHandler<T>;
  onTouchCancel: React.TouchEventHandler<T>;
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
    onTouchStart: (event) => {
      if (event.changedTouches.length === 0) return;
      const touch = event.changedTouches[0];
      controller.touchStart({
        identifier: touch.identifier,
        clientX: touch.clientX,
        clientY: touch.clientY,
        target: event.target,
      });
    },
    onTouchMove: (event) => {
      for (let i = 0; i < event.changedTouches.length; i += 1) {
        const touch = event.changedTouches[i];
        controller.touchMove({
          identifier: touch.identifier,
          clientX: touch.clientX,
          clientY: touch.clientY,
        });
      }
    },
    onTouchEnd: (event) => {
      for (let i = 0; i < event.changedTouches.length; i += 1) {
        controller.touchEnd({ identifier: event.changedTouches[i].identifier });
      }
    },
    onTouchCancel: (event) => {
      for (let i = 0; i < event.changedTouches.length; i += 1) {
        controller.touchCancel({ identifier: event.changedTouches[i].identifier });
      }
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
