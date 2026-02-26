import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CONTEXT_LONG_PRESS_MS,
  CONTEXT_MOVE_TOLERANCE_PX,
  createContextTriggerController,
  exceededMoveTolerance,
  isInteractiveContextTarget,
  isKeyboardContextShortcut,
} from './useContextTrigger';

describe('useContextTrigger controller', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on desktop context menu immediately', () => {
    const onOpen = vi.fn();
    const controller = createContextTriggerController({ onOpen });

    controller.contextMenu({ clientX: 16, clientY: 24, target: null });

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith({ x: 16, y: 24, source: 'contextmenu' });
  });

  it('suppresses next click for touch-style context menu events', () => {
    const onOpen = vi.fn();
    const controller = createContextTriggerController({ onOpen });

    controller.contextMenu({ clientX: 16, clientY: 24, button: 0, target: null });

    expect(onOpen).toHaveBeenCalledWith({ x: 16, y: 24, source: 'contextmenu' });
    expect(controller.consumeClickSuppression()).toBe(true);
    expect(controller.consumeClickSuppression()).toBe(false);
  });

  it('does not suppress click for right-button desktop context menu events', () => {
    const onOpen = vi.fn();
    const controller = createContextTriggerController({ onOpen });

    controller.contextMenu({ clientX: 16, clientY: 24, button: 2, target: null });

    expect(onOpen).toHaveBeenCalledWith({ x: 16, y: 24, source: 'contextmenu' });
    expect(controller.consumeClickSuppression()).toBe(false);
  });

  it('suppresses desktop context menu on interactive targets by default', () => {
    const onOpen = vi.fn();
    const target = {
      closest: vi.fn().mockReturnValue({ nodeName: 'BUTTON' }),
    } as unknown as EventTarget;
    const controller = createContextTriggerController({ onOpen });

    const handled = controller.contextMenu({ clientX: 12, clientY: 18, target });

    expect(handled).toBe(false);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('allows desktop context menu on interactive targets when suppression is disabled', () => {
    const onOpen = vi.fn();
    const target = {
      closest: vi.fn().mockReturnValue({ nodeName: 'BUTTON' }),
    } as unknown as EventTarget;
    const controller = createContextTriggerController({
      onOpen,
      suppressInteractiveTargets: false,
    });

    const handled = controller.contextMenu({ clientX: 12, clientY: 18, target });

    expect(handled).toBe(true);
    expect(onOpen).toHaveBeenCalledWith({ x: 12, y: 18, source: 'contextmenu' });
  });

  it('opens on long-press after configured delay and suppresses next click', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const controller = createContextTriggerController({ onOpen });

    controller.pointerDown({
      pointerId: 1,
      pointerType: 'touch',
      clientX: 40,
      clientY: 72,
      target: null,
    });

    vi.advanceTimersByTime(CONTEXT_LONG_PRESS_MS - 1);
    expect(onOpen).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith({ x: 40, y: 72, source: 'longpress' });
    expect(controller.consumeClickSuppression()).toBe(true);
    expect(controller.consumeClickSuppression()).toBe(false);
  });

  it('cancels pointer long-press when a second touch pointer starts', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const controller = createContextTriggerController({ onOpen });

    controller.pointerDown({
      pointerId: 1,
      pointerType: 'touch',
      clientX: 40,
      clientY: 72,
      target: null,
    });
    controller.pointerDown({
      pointerId: 2,
      pointerType: 'touch',
      clientX: 44,
      clientY: 76,
      target: null,
    });

    vi.advanceTimersByTime(CONTEXT_LONG_PRESS_MS);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('keeps long-press click suppression if a contextmenu event follows', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const controller = createContextTriggerController({ onOpen });

    controller.pointerDown({
      pointerId: 6,
      pointerType: 'touch',
      clientX: 80,
      clientY: 120,
      target: null,
    });
    vi.advanceTimersByTime(CONTEXT_LONG_PRESS_MS);

    controller.contextMenu({
      clientX: 80,
      clientY: 120,
      button: 0,
      target: null,
    });

    expect(controller.consumeClickSuppression()).toBe(true);
    expect(controller.consumeClickSuppression()).toBe(false);
  });

  it('opens on long-press via touch-event fallback', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const controller = createContextTriggerController({ onOpen });

    controller.touchStart({
      identifier: 10,
      clientX: 40,
      clientY: 72,
      target: null,
    });

    vi.advanceTimersByTime(CONTEXT_LONG_PRESS_MS - 1);
    expect(onOpen).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith({ x: 40, y: 72, source: 'longpress' });
    expect(controller.consumeClickSuppression()).toBe(true);
    expect(controller.consumeClickSuppression()).toBe(false);
  });

  it('cancels touch-event fallback long-press when a second touch starts', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const controller = createContextTriggerController({ onOpen });

    controller.touchStart({
      identifier: 10,
      clientX: 40,
      clientY: 72,
      target: null,
    });
    controller.touchStart({
      identifier: 11,
      clientX: 44,
      clientY: 76,
      target: null,
    });

    vi.advanceTimersByTime(CONTEXT_LONG_PRESS_MS);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('cancels long-press when pointer movement exceeds threshold', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const controller = createContextTriggerController({ onOpen });

    controller.pointerDown({
      pointerId: 2,
      pointerType: 'touch',
      clientX: 10,
      clientY: 10,
      target: null,
    });
    controller.pointerMove({
      pointerId: 2,
      clientX: 10 + CONTEXT_MOVE_TOLERANCE_PX + 1,
      clientY: 10,
    });

    vi.advanceTimersByTime(CONTEXT_LONG_PRESS_MS);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('cancels long-press on pointer up', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const controller = createContextTriggerController({ onOpen });

    controller.pointerDown({
      pointerId: 3,
      pointerType: 'pen',
      clientX: 88,
      clientY: 99,
      target: null,
    });
    controller.pointerUp({ pointerId: 3 });
    vi.advanceTimersByTime(CONTEXT_LONG_PRESS_MS);

    expect(onOpen).not.toHaveBeenCalled();
  });

  it('does not start long-press for interactive targets', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const target = {
      closest: vi.fn().mockReturnValue({ nodeName: 'TEXTAREA' }),
    } as unknown as EventTarget;
    const controller = createContextTriggerController({ onOpen });

    controller.pointerDown({
      pointerId: 4,
      pointerType: 'touch',
      clientX: 50,
      clientY: 20,
      target,
    });
    vi.advanceTimersByTime(CONTEXT_LONG_PRESS_MS);

    expect(onOpen).not.toHaveBeenCalled();
  });

  it('allows long-press on interactive targets when suppression is disabled', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    const target = {
      closest: vi.fn().mockReturnValue({ nodeName: 'BUTTON' }),
    } as unknown as EventTarget;
    const controller = createContextTriggerController({
      onOpen,
      suppressInteractiveTargets: false,
    });

    controller.pointerDown({
      pointerId: 5,
      pointerType: 'touch',
      clientX: 30,
      clientY: 30,
      target,
    });
    vi.advanceTimersByTime(CONTEXT_LONG_PRESS_MS);

    expect(onOpen).toHaveBeenCalledWith({ x: 30, y: 30, source: 'longpress' });
  });

  it('opens from keyboard shortcuts', () => {
    const onOpen = vi.fn();
    const controller = createContextTriggerController({ onOpen });

    controller.keyboard({
      key: 'ContextMenu',
      shiftKey: false,
      rect: { left: 100, top: 20 },
    });

    expect(onOpen).toHaveBeenCalledWith({ x: 108, y: 28, source: 'keyboard' });
  });

  it('exports deterministic helper predicates', () => {
    expect(isKeyboardContextShortcut('ContextMenu', false)).toBe(true);
    expect(isKeyboardContextShortcut('F10', true)).toBe(true);
    expect(isKeyboardContextShortcut('F10', false)).toBe(false);

    expect(exceededMoveTolerance({ x: 0, y: 0 }, { x: 11, y: 0 }, 10)).toBe(true);
    expect(exceededMoveTolerance({ x: 0, y: 0 }, { x: 6, y: 8 }, 10)).toBe(false);

    const editableTarget = { isContentEditable: true } as unknown as EventTarget;
    expect(isInteractiveContextTarget(editableTarget)).toBe(true);
  });
});
