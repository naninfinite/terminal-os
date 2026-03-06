/**
 * `Panel` is the basic "window" primitive used across the desktop UI.
 * It provides a framed container with a header label and a flexible body area.
 *
 * Notes:
 * - `stretchBody` is used when the child needs to fill the available space (e.g. canvas).
 * - `disableHover` is used on screens where hover animation feels wrong (e.g. landing).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './Panel.module.scss';
import { useContextTrigger, type ContextTriggerSource } from '../shared/useContextTrigger';
import {
  PANEL_ZOOM_MAX,
  PANEL_ZOOM_MIN,
  derivePinchScale,
  pinchDistance,
} from './mobilePinchZoom';

type PanelScopeId = 'me' | 'you' | 'third' | 'connect';

export type PanelProps = {
  title: string;
  children?: React.ReactNode;
  className?: string;
  /** Optional action content rendered on the right side of the header. */
  headerActions?: React.ReactNode;
  /** Scope identifier used by menu routing/focus helpers. */
  scopeId?: PanelScopeId;
  /** Stretch the body to fill the panel instead of centering children. */
  stretchBody?: boolean;
  /** Disable hover/focus lift animation for this panel. */
  disableHover?: boolean;
  /** Hide the standard bracketed header (rare; use sparingly). */
  hideHeader?: boolean;
  /** Optional extra class for the body wrapper. */
  bodyClassName?: string;
  /** Enable touch-event fallback for long-press context menus on touch-only browsers. */
  enableTouchContextFallback?: boolean;
  /** Enable panel-local pinch zoom on touch devices for this panel instance. */
  enableMobilePinchZoom?: boolean;
  /** Suppress context trigger on interactive descendants (inputs, buttons, links). */
  suppressInteractiveTargets?: boolean;
  /** Optional hook for notifying parent when this panel becomes active/focused. */
  onActivate?: () => void;
  /** Optional hook for opening scope-level context menu from panel roots. */
  onRequestContextMenu?: (args: {
    scopeId: PanelScopeId;
    origin: 'panel';
    source: ContextTriggerSource;
    x: number;
    y: number;
  }) => void;
};

type TouchPoint = {
  x: number;
  y: number;
};

type PointerPinchState = {
  pointerIds: [number, number];
  startDistance: number;
  startScale: number;
};

type TouchPinchState = {
  startDistance: number;
  startScale: number;
};

const PANEL_ZOOM_BLOCK_SELECTOR = '[data-panel-zoom-block="true"]';

const isZoomBlockedTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(PANEL_ZOOM_BLOCK_SELECTOR));
};

/**
 * Small panel frame with optional behavior flags:
 * - `stretchBody`: child fills available panel body dimensions.
 * - `disableHover`: suppresses elevation effect in contexts where motion is distracting.
 * - `hideHeader`: removes bracket title bar for custom compositions.
 */
const Panel: React.FC<PanelProps> = ({
  title,
  children,
  className,
  headerActions,
  scopeId,
  stretchBody,
  disableHover,
  hideHeader,
  bodyClassName,
  enableTouchContextFallback,
  enableMobilePinchZoom,
  suppressInteractiveTargets,
  onActivate,
  onRequestContextMenu,
}) => {
  const [zoomScale, setZoomScale] = useState(1);
  const zoomScaleRef = useRef(zoomScale);
  const pointerTouchPointsRef = useRef<Map<number, TouchPoint>>(new Map());
  const pointerPinchRef = useRef<PointerPinchState | null>(null);
  const touchPinchRef = useRef<TouchPinchState | null>(null);
  zoomScaleRef.current = zoomScale;

  const contextTrigger = useContextTrigger<HTMLElement>({
    disabled: !scopeId || !onRequestContextMenu,
    suppressInteractiveTargets,
    onOpen: ({ x, y, source }) => {
      if (!scopeId || !onRequestContextMenu) return;
      onRequestContextMenu({
        scopeId,
        origin: 'panel',
        source,
        x,
        y,
      });
    },
  });

  useEffect(() => {
    if (enableMobilePinchZoom) return;
    pointerTouchPointsRef.current.clear();
    pointerPinchRef.current = null;
    touchPinchRef.current = null;
  }, [enableMobilePinchZoom]);

  const setZoomScaleIfChanged = (nextScale: number) => {
    if (nextScale === zoomScaleRef.current) return;
    zoomScaleRef.current = nextScale;
    setZoomScale(nextScale);
  };

  const resetPointerPinch = () => {
    pointerPinchRef.current = null;
  };

  const updatePointerPinchFromCurrentTouches = () => {
    if (pointerTouchPointsRef.current.size !== 2) {
      resetPointerPinch();
      return;
    }
    const entries = [...pointerTouchPointsRef.current.entries()];
    const first = entries[0];
    const second = entries[1];
    if (!first || !second) {
      resetPointerPinch();
      return;
    }

    const startDistance = pinchDistance(first[1], second[1]);
    if (startDistance <= 0) {
      resetPointerPinch();
      return;
    }

    pointerPinchRef.current = {
      pointerIds: [first[0], second[0]],
      startDistance,
      startScale: zoomScaleRef.current,
    };
  };

  const onPanelPointerDown: React.PointerEventHandler<HTMLElement> = (event) => {
    onActivate?.();
    contextTrigger.onPointerDown(event);
  };

  const onPanelTouchStart = enableTouchContextFallback
    ? ((event: React.TouchEvent<HTMLElement>) => {
      onActivate?.();
      contextTrigger.onTouchStart(event);
    })
    : undefined;

  const onZoomPointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!enableMobilePinchZoom) return;
    if (event.pointerType !== 'touch') return;
    if (isZoomBlockedTarget(event.target)) return;

    pointerTouchPointsRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointerTouchPointsRef.current.size > 2) {
      resetPointerPinch();
      return;
    }

    updatePointerPinchFromCurrentTouches();
    if (pointerPinchRef.current && event.cancelable) {
      event.preventDefault();
    }
  };

  const onZoomPointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!enableMobilePinchZoom) return;
    if (event.pointerType !== 'touch') return;
    if (!pointerTouchPointsRef.current.has(event.pointerId)) return;

    pointerTouchPointsRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const pinchState = pointerPinchRef.current;
    if (!pinchState) return;

    const first = pointerTouchPointsRef.current.get(pinchState.pointerIds[0]);
    const second = pointerTouchPointsRef.current.get(pinchState.pointerIds[1]);
    if (!first || !second) return;

    const currentDistance = pinchDistance(first, second);
    const nextScale = derivePinchScale({
      startDistance: pinchState.startDistance,
      currentDistance,
      startScale: pinchState.startScale,
      minScale: PANEL_ZOOM_MIN,
      maxScale: PANEL_ZOOM_MAX,
    });
    setZoomScaleIfChanged(nextScale);
    if (event.cancelable) {
      event.preventDefault();
    }
  };

  const onZoomPointerUpOrCancel: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.pointerType !== 'touch') return;
    pointerTouchPointsRef.current.delete(event.pointerId);
    updatePointerPinchFromCurrentTouches();
  };

  const onZoomTouchStart: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (!enableMobilePinchZoom) return;
    if (isZoomBlockedTarget(event.target)) return;
    if (event.touches.length < 2) {
      touchPinchRef.current = null;
      return;
    }

    const first = event.touches.item(0);
    const second = event.touches.item(1);
    if (!first || !second) return;

    const startDistance = pinchDistance(
      { x: first.clientX, y: first.clientY },
      { x: second.clientX, y: second.clientY }
    );
    if (startDistance <= 0) return;

    touchPinchRef.current = {
      startDistance,
      startScale: zoomScaleRef.current,
    };
    if (event.cancelable) {
      event.preventDefault();
    }
  };

  const onZoomTouchMove: React.TouchEventHandler<HTMLDivElement> = (event) => {
    if (!enableMobilePinchZoom) return;
    const pinchState = touchPinchRef.current;
    if (!pinchState) return;
    if (event.touches.length < 2) {
      touchPinchRef.current = null;
      return;
    }

    const first = event.touches.item(0);
    const second = event.touches.item(1);
    if (!first || !second) return;

    const currentDistance = pinchDistance(
      { x: first.clientX, y: first.clientY },
      { x: second.clientX, y: second.clientY }
    );
    const nextScale = derivePinchScale({
      startDistance: pinchState.startDistance,
      currentDistance,
      startScale: pinchState.startScale,
      minScale: PANEL_ZOOM_MIN,
      maxScale: PANEL_ZOOM_MAX,
    });
    setZoomScaleIfChanged(nextScale);
    if (event.cancelable) {
      event.preventDefault();
    }
  };

  const onZoomTouchEndOrCancel: React.TouchEventHandler<HTMLDivElement> = () => {
    touchPinchRef.current = null;
  };

  const zoomStyle = useMemo(
    () => ({ '--panel-zoom-scale': zoomScale.toString() } as React.CSSProperties),
    [zoomScale]
  );

  return (
    <section
      // Class composition keeps API surface small while still allowing overrides.
      className={`${styles.panel} ${className ?? ''} ${disableHover ? styles.noHover : ''}`.trim()}
      aria-label={title}
      data-panel-scope={scopeId}
      tabIndex={0}
      onMouseEnter={onActivate}
      onFocusCapture={onActivate}
      onMouseDown={onActivate}
      onContextMenu={contextTrigger.onContextMenu}
      onPointerDown={onPanelPointerDown}
      onPointerMove={contextTrigger.onPointerMove}
      onPointerUp={contextTrigger.onPointerUp}
      onPointerCancel={contextTrigger.onPointerCancel}
      onTouchStart={onPanelTouchStart}
      onTouchMove={enableTouchContextFallback ? contextTrigger.onTouchMove : undefined}
      onTouchEnd={enableTouchContextFallback ? contextTrigger.onTouchEnd : undefined}
      onTouchCancel={enableTouchContextFallback ? contextTrigger.onTouchCancel : undefined}
      onClickCapture={contextTrigger.onClickCapture}
      onKeyDown={contextTrigger.onKeyDown}
    >
      <header className={`${styles.header} ${hideHeader ? styles.hiddenHeader : ''}`.trim()}>
        <div className={styles.headerInner}>
          <span className={styles.headerTitle}>[{title}]</span>
          {headerActions ? (
            <div className={styles.headerActions}>
              {headerActions}
            </div>
          ) : null}
        </div>
      </header>
      <div
        className={`${styles.body} ${stretchBody ? styles.bodyStretch : ''} ${enableMobilePinchZoom ? styles.bodyZoomEnabled : ''} ${bodyClassName ?? ''}`.trim()}
        onPointerDown={onZoomPointerDown}
        onPointerMove={onZoomPointerMove}
        onPointerUp={onZoomPointerUpOrCancel}
        onPointerCancel={onZoomPointerUpOrCancel}
        onTouchStart={onZoomTouchStart}
        onTouchMove={onZoomTouchMove}
        onTouchEnd={onZoomTouchEndOrCancel}
        onTouchCancel={onZoomTouchEndOrCancel}
      >
        <div className={styles.zoomViewport}>
          <div className={styles.zoomContent} style={zoomStyle}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Panel;
