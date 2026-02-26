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
  contextMenu: (args: {
    clientX: number;
    clientY: number;
    button?: number;
    target?: EventTarget | null;
  }) => boolean;
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
  pressId: number;
  x: number;
  y: number;
};

type TouchLike = {
  identifier: number;
  clientX: number;
  clientY: number;
  target?: EventTarget | null;
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
    if (detail.source === 'longpress') suppressNextClick = true;
  };

  const beginPress = (args: {
    pressId: number;
    clientX: number;
    clientY: number;
    target?: EventTarget | null;
  }) => {
    if (options.disabled) return;
    if (suppressInteractiveTargets && isInteractiveContextTarget(args.target ?? null)) return;

    clearPointerState();
    pointerPressState = { pressId: args.pressId, x: args.clientX, y: args.clientY };
    timerId = setTimeout(() => {
      if (!pointerPressState || pointerPressState.pressId !== args.pressId) return;
      openAt({ x: pointerPressState.x, y: pointerPressState.y, source: 'longpress' });
      clearPointerState();
    }, longPressMs);
  };

  const movePress = (args: { pressId: number; clientX: number; clientY: number }) => {
    if (!pointerPressState || pointerPressState.pressId !== args.pressId) return;
    if (
      exceededMoveTolerance(
        { x: pointerPressState.x, y: pointerPressState.y },
        { x: args.clientX, y: args.clientY },
        moveTolerancePx
      )
    ) {
      clearPointerState();
    }
  };

  const endPress = (pressId?: number) => {
    if (!pointerPressState) return;
    if (typeof pressId === 'number' && pointerPressState.pressId !== pressId) return;
    clearPointerState();
  };

  return {
    contextMenu: ({ clientX, clientY, button, target }) => {
      if (options.disabled) return false;
      if (suppressInteractiveTargets && isInteractiveContextTarget(target ?? null)) return false;
      openAt({ x: clientX, y: clientY, source: 'contextmenu' });
      // Long-press contextmenu on touch UAs frequently emits `button === 0` then a click.
      if (button === 0) suppressNextClick = true;
      return true;
    },
    pointerDown: ({ pointerId, pointerType, clientX, clientY, button, target }) => {
      // Accept touch/pen and unknown pointer types; skip true mouse interactions.
      if (pointerType === 'mouse') return;
      if (typeof button === 'number' && button !== 0) return;
      beginPress({
        pressId: pointerId,
        clientX,
        clientY,
        target,
      });
    },
    pointerMove: ({ pointerId, clientX, clientY }) => {
      movePress({ pressId: pointerId, clientX, clientY });
    },
    pointerUp: ({ pointerId }) => {
      endPress(pointerId);
    },
    pointerCancel: (args) => {
      endPress(args?.pointerId);
    },
    touchStart: ({ identifier, clientX, clientY, target }) => {
      beginPress({
        pressId: identifier,
        clientX,
        clientY,
        target,
      });
    },
    touchMove: ({ identifier, clientX, clientY }) => {
      movePress({
        pressId: identifier,
        clientX,
        clientY,
      });
    },
    touchEnd: ({ identifier }) => {
      endPress(identifier);
    },
    touchCancel: (args) => {
      endPress(args?.identifier);
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
        button: event.button,
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
      const touch = event.changedTouches.item(0) ?? event.touches.item(0);
      if (!touch) return;
      controller.touchStart({
        identifier: touch.identifier,
        clientX: touch.clientX,
        clientY: touch.clientY,
        target: event.target,
      });
    },
    onTouchMove: (event) => {
      const touch = event.changedTouches.item(0) ?? event.touches.item(0);
      if (!touch) return;
      controller.touchMove({
        identifier: touch.identifier,
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
    },
    onTouchEnd: (event) => {
      const touch = event.changedTouches.item(0);
      if (!touch) return;
      controller.touchEnd({ identifier: touch.identifier });
    },
    onTouchCancel: (event) => {
      const touch = event.changedTouches.item(0);
      if (!touch) {
        controller.touchCancel();
        return;
      }
      controller.touchCancel({ identifier: touch.identifier });
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
