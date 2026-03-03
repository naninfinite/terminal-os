import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { gsap } from 'gsap';
import styles from './DigitalRain.module.scss';

const DEFAULT_CHARSET = 'ｦｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DEFAULT_FONT_SIZE = 15;
const DEFAULT_SPEED = 0.9;
const DEFAULT_FADE_ALPHA = 0.075;
const DEFAULT_FPS = 30;
const DEFAULT_DIRECTION = 'rtl';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const DEFAULT_GRID_RGB = [0, 255, 102] as const;

type DigitalRainRow = {
  x: number;
  speed: number;
  wrapOffset: number;
};

type DigitalRainMetrics = {
  cssWidth: number;
  cssHeight: number;
  pixelWidth: number;
  pixelHeight: number;
  dpr: number;
  rowCount: number;
  colCount: number;
  frameIntervalMs: number;
  lastRenderAtMs: number;
  reducedMotion: boolean;
  active: boolean;
  fontFamily: string;
  fillColor: string;
  headColor: string;
  shadowColor: string;
};

export type DigitalRainProps = {
  enabled: boolean;
  className?: string;
  direction?: 'ltr' | 'rtl';
  fontSize?: number;
  speed?: number;
  fadeAlpha?: number;
  charset?: string;
  fps?: number;
};

const parseRgbTriplet = (value: string): [number, number, number] => {
  const matches = value.match(/\d+/g)?.slice(0, 3).map((entry) => Number.parseInt(entry, 10));
  if (!matches || matches.length !== 3 || matches.some(Number.isNaN)) {
    return [...DEFAULT_GRID_RGB];
  }

  return [matches[0], matches[1], matches[2]];
};

const createRow = (colCount: number, speed: number): DigitalRainRow => {
  const resetSpan = Math.max(6, colCount * 0.25);
  return {
    x: (Math.random() * (colCount + resetSpan)) - resetSpan,
    speed: speed * (0.7 + (Math.random() * 0.6)),
    wrapOffset: Math.random() * Math.max(3, colCount * 0.1),
  };
};

const createRows = (
  rowCount: number,
  colCount: number,
  speed: number,
): DigitalRainRow[] => Array.from({ length: rowCount }, () => createRow(colCount, speed));

const DigitalRain = forwardRef<HTMLCanvasElement, DigitalRainProps>(({
  enabled,
  className,
  direction = DEFAULT_DIRECTION,
  fontSize = DEFAULT_FONT_SIZE,
  speed = DEFAULT_SPEED,
  fadeAlpha = DEFAULT_FADE_ALPHA,
  charset = DEFAULT_CHARSET,
  fps = DEFAULT_FPS,
}, forwardedRef) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const rowsRef = useRef<DigitalRainRow[]>([]);
  const frameCountRef = useRef(0);
  const tickerCallbackRef = useRef<((time: number) => void) | null>(null);
  const resizeFallbackRef = useRef<(() => void) | null>(null);
  const mediaQueryRef = useRef<MediaQueryList | null>(null);
  const settingsRef = useRef({
    enabled,
    direction,
    fontSize,
    speed,
    fadeAlpha,
    charset,
    fps,
  });
  const metricsRef = useRef<DigitalRainMetrics>({
    cssWidth: 0,
    cssHeight: 0,
    pixelWidth: 0,
    pixelHeight: 0,
    dpr: 1,
    rowCount: 0,
    colCount: 0,
    frameIntervalMs: 1000 / DEFAULT_FPS,
    lastRenderAtMs: 0,
    reducedMotion: false,
    active: enabled,
    fontFamily: 'monospace',
    fillColor: 'rgba(0, 255, 102, 0.78)',
    headColor: 'rgba(0, 255, 102, 0.98)',
    shadowColor: 'rgba(0, 255, 102, 0.35)',
  });

  const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
    canvasRef.current = node;

    if (!forwardedRef) {
      return;
    }

    if (typeof forwardedRef === 'function') {
      forwardedRef(node);
      return;
    }

    forwardedRef.current = node;
  }, [forwardedRef]);

  const clearCanvas = useCallback(() => {
    const ctx = contextRef.current;
    const { cssWidth, cssHeight } = metricsRef.current;
    if (!ctx || cssWidth === 0 || cssHeight === 0) {
      return;
    }

    ctx.clearRect(0, 0, cssWidth, cssHeight);
  }, []);

  const syncCanvasMetrics = useCallback(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) {
      return;
    }

    const { fontSize: nextFontSize, speed: nextSpeed, fps: nextFps } = settingsRef.current;
    const rect = root.getBoundingClientRect();
    const cssWidth = Math.max(0, Math.floor(rect.width));
    const cssHeight = Math.max(0, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      contextRef.current = null;
      return;
    }

    contextRef.current = ctx;
    metricsRef.current.cssWidth = cssWidth;
    metricsRef.current.cssHeight = cssHeight;
    metricsRef.current.pixelWidth = pixelWidth;
    metricsRef.current.pixelHeight = pixelHeight;
    metricsRef.current.dpr = dpr;
    metricsRef.current.rowCount = cssHeight > 0 ? Math.max(1, Math.floor(cssHeight / nextFontSize)) : 0;
    metricsRef.current.colCount = cssWidth > 0 ? Math.max(1, Math.ceil(cssWidth / nextFontSize)) : 0;
    metricsRef.current.frameIntervalMs = 1000 / Math.max(1, nextFps);
    metricsRef.current.lastRenderAtMs = 0;

    const computedStyle = window.getComputedStyle(root);
    const [red, green, blue] = parseRgbTriplet(
      computedStyle.getPropertyValue('--landing-grid-rgb')
    );
    const landingText = computedStyle.getPropertyValue('--landing-text').trim();

    metricsRef.current.fontFamily = computedStyle.fontFamily || 'monospace';
    metricsRef.current.fillColor = `rgba(${red}, ${green}, ${blue}, 0.78)`;
    metricsRef.current.headColor = landingText || `rgba(${red}, ${green}, ${blue}, 0.98)`;
    metricsRef.current.shadowColor = `rgba(${red}, ${green}, ${blue}, 0.35)`;

    if (canvas.width !== pixelWidth) {
      canvas.width = pixelWidth;
    }
    if (canvas.height !== pixelHeight) {
      canvas.height = pixelHeight;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.font = `${nextFontSize}px ${metricsRef.current.fontFamily}`;
    ctx.textBaseline = 'top';

    rowsRef.current = createRows(metricsRef.current.rowCount, metricsRef.current.colCount, nextSpeed);
    frameCountRef.current = 0;
  }, []);

  useEffect(() => {
    settingsRef.current = {
      enabled,
      direction,
      fontSize,
      speed,
      fadeAlpha,
      charset,
      fps,
    };
    metricsRef.current.active = enabled;
    metricsRef.current.frameIntervalMs = 1000 / Math.max(1, fps);
    metricsRef.current.lastRenderAtMs = 0;

    syncCanvasMetrics();

    if (!enabled || metricsRef.current.reducedMotion) {
      clearCanvas();
    }
  }, [charset, clearCanvas, direction, enabled, fadeAlpha, fontSize, fps, speed, syncCanvasMetrics]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const handleResize = () => {
      syncCanvasMetrics();
    };

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        handleResize();
      });
      observer.observe(root);
      resizeObserverRef.current = observer;
    } else {
      window.addEventListener('resize', handleResize);
      resizeFallbackRef.current = handleResize;
    }

    syncCanvasMetrics();

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      if (resizeFallbackRef.current) {
        window.removeEventListener('resize', resizeFallbackRef.current);
        resizeFallbackRef.current = null;
      }
    };
  }, [syncCanvasMetrics]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    mediaQueryRef.current = mediaQuery;

    const applyReducedMotionPreference = () => {
      metricsRef.current.reducedMotion = mediaQuery.matches;
      metricsRef.current.lastRenderAtMs = 0;

      if (mediaQuery.matches) {
        clearCanvas();
      } else {
        syncCanvasMetrics();
      }
    };

    applyReducedMotionPreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', applyReducedMotionPreference);
      return () => {
        mediaQuery.removeEventListener('change', applyReducedMotionPreference);
        mediaQueryRef.current = null;
      };
    }

    mediaQuery.addListener(applyReducedMotionPreference);
    return () => {
      mediaQuery.removeListener(applyReducedMotionPreference);
      mediaQueryRef.current = null;
    };
  }, [clearCanvas, syncCanvasMetrics]);

  useEffect(() => {
    const tick = (time: number) => {
      const ctx = contextRef.current;
      const {
        cssWidth,
        cssHeight,
        colCount,
        frameIntervalMs,
        reducedMotion,
        fillColor,
        headColor,
        shadowColor,
        lastRenderAtMs,
      } = metricsRef.current;
      const {
        enabled: active,
        charset: activeCharset,
        direction: activeDirection,
        fadeAlpha: activeFadeAlpha,
        fontSize: activeFontSize,
        speed: baseSpeed,
      } = settingsRef.current;

      if (!ctx || !active || reducedMotion || cssWidth === 0 || cssHeight === 0 || activeCharset.length === 0) {
        return;
      }

      const nowMs = time * 1000;
      if (lastRenderAtMs !== 0 && (nowMs - lastRenderAtMs) < frameIntervalMs) {
        return;
      }
      metricsRef.current.lastRenderAtMs = nowMs;

      frameCountRef.current += 1;

      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(0, 0, 0, ${activeFadeAlpha})`;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      ctx.shadowBlur = 6;
      ctx.shadowColor = shadowColor;

      const rows = rowsRef.current;
      const frame = frameCountRef.current;
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const column = Math.floor(row.x);
        const drawX = activeDirection === 'rtl'
          ? cssWidth - ((column + 1) * activeFontSize)
          : column * activeFontSize;
        const drawY = index * activeFontSize;
        const charIndex = Math.floor(Math.random() * activeCharset.length);
        const isHead = ((frame + index) % 9) === 0;

        ctx.fillStyle = isHead ? headColor : fillColor;
        ctx.fillText(activeCharset.charAt(charIndex), drawX, drawY);

        row.x += row.speed;
        if (row.x > (colCount + row.wrapOffset)) {
          rows[index] = createRow(colCount, baseSpeed);
        }
      }
    };

    tickerCallbackRef.current = tick;
    gsap.ticker.add(tick);

    return () => {
      if (tickerCallbackRef.current) {
        gsap.ticker.remove(tickerCallbackRef.current);
        tickerCallbackRef.current = null;
      }
      rowsRef.current = [];
      contextRef.current = null;
    };
  }, []);

  const rootClassName = className
    ? `${styles.root} ${className}`
    : styles.root;

  return (
    <div
      ref={rootRef}
      className={rootClassName}
      aria-hidden="true"
      data-digital-rain="true"
      data-direction={direction}
      data-enabled={enabled ? 'true' : 'false'}
    >
      <canvas ref={setCanvasRef} className={styles.canvas} />
    </div>
  );
});

DigitalRain.displayName = 'DigitalRain';

export default DigitalRain;
