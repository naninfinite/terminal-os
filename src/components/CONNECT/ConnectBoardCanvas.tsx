import React from 'react';
import styles from './CONNECT.module.scss';
import {
  buildTrailPolyline,
  getCellCenter,
  getTrailStrokeWidth,
  resolveConnectBoardMetrics,
  toCanvasPoint,
} from './connectBoardGeometry';
import {
  createCrashEffect,
  getCrashEffectProgress,
  isCrashEffectActive,
  resolveCrashBurstVectors,
  type ConnectCrashEffect,
} from './connectCrashEffects';
import type { TronCrashEvent, TronGameState, TronPlayerId } from '../../connect/types';

type ConnectBoardCanvasProps = {
  game: TronGameState;
  crashEvents: TronCrashEvent[];
  mode?: 'panel' | 'fullscreen';
};

const BACKGROUND_COLOR = '#010d08';
const ARENA_COLOR = '#02150d';
const BOARD_BORDER = 'rgb(0 255 102 / 0.42)';
const TRAIL_COLORS: Record<TronPlayerId, string> = {
  p1: '#7dffb7',
  p2: '#66cfff',
  p3: '#ffb84a',
  p4: '#f4ea63',
};
const HEAD_COLORS: Record<TronPlayerId, string> = {
  p1: '#d8ffea',
  p2: '#e0f7ff',
  p3: '#ffe3b1',
  p4: '#fffcd4',
};
const DEAD_COLORS: Record<TronPlayerId, string> = {
  p1: 'rgb(125 255 183 / 0.28)',
  p2: 'rgb(102 207 255 / 0.28)',
  p3: 'rgb(255 184 74 / 0.3)',
  p4: 'rgb(244 234 99 / 0.3)',
};

const nowMs = (): number => (
  typeof performance !== 'undefined' ? performance.now() : Date.now()
);

const ConnectBoardCanvas: React.FC<ConnectBoardCanvasProps> = ({
  game,
  crashEvents,
  mode = 'panel',
}) => {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const effectsRef = React.useRef<Map<string, ConnectCrashEffect>>(new Map());
  const seenEventIdsRef = React.useRef<Set<string>>(new Set());
  const rafIdRef = React.useRef<number>(0);

  const renderFrame = React.useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;

    const metrics = resolveConnectBoardMetrics(size.width, size.height, game.columns, game.rows);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);
    context.imageSmoothingEnabled = true;
    context.clearRect(0, 0, size.width, size.height);
    context.fillStyle = BACKGROUND_COLOR;
    context.fillRect(0, 0, size.width, size.height);
    context.fillStyle = ARENA_COLOR;
    context.fillRect(metrics.offsetX, metrics.offsetY, metrics.boardWidth, metrics.boardHeight);

    context.strokeStyle = BOARD_BORDER;
    context.lineWidth = 1;
    context.strokeRect(
      metrics.offsetX + 0.5,
      metrics.offsetY + 0.5,
      metrics.boardWidth - 1,
      metrics.boardHeight - 1,
    );

    const strokeWidth = getTrailStrokeWidth(metrics.cellSize, mode);

    game.activePlayerIds.forEach((playerId) => {
      const player = game.players[playerId];
      if (player.trailCellIds.length === 0) return;

      const points = buildTrailPolyline({
        trailCellIds: player.trailCellIds,
        columns: game.columns,
        metrics,
        impactPoint: !player.alive ? player.impactPoint : null,
      });
      if (points.length === 0) return;

      context.beginPath();
      context.moveTo(points[0]!.x, points[0]!.y);
      for (let index = 1; index < points.length; index += 1) {
        const point = points[index]!;
        context.lineTo(point.x, point.y);
      }
      context.strokeStyle = player.alive ? TRAIL_COLORS[playerId] : DEAD_COLORS[playerId];
      context.lineWidth = strokeWidth;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.stroke();

      const headPoint = player.alive && !player.impactPoint
        ? getCellCenter(player.head, metrics)
        : (player.impactPoint ? toCanvasPoint(player.impactPoint, metrics) : getCellCenter(player.head, metrics));
      const headRadius = Math.max(1.5, strokeWidth * (player.alive ? 0.68 : 0.5));
      context.fillStyle = player.alive ? HEAD_COLORS[playerId] : DEAD_COLORS[playerId];
      context.beginPath();
      context.arc(headPoint.x, headPoint.y, headRadius, 0, Math.PI * 2);
      context.fill();
    });

    const nextEffects = new Map<string, ConnectCrashEffect>();
    effectsRef.current.forEach((effect, effectId) => {
      if (!isCrashEffectActive(effect, timestamp)) return;
      nextEffects.set(effectId, effect);

      const progress = getCrashEffectProgress(effect, timestamp);
      const alpha = 1 - progress;
      const center = toCanvasPoint(effect.event.impactPoint, metrics);
      const ringRadius = (strokeWidth * 1.6) + (progress * metrics.cellSize * 0.9);
      const coreRadius = Math.max(1.5, strokeWidth * (0.75 - (progress * 0.45)));

      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = HEAD_COLORS[effect.event.playerId];
      context.beginPath();
      context.arc(center.x, center.y, coreRadius, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = HEAD_COLORS[effect.event.playerId];
      context.lineWidth = Math.max(1, strokeWidth * 0.4);
      context.beginPath();
      context.arc(center.x, center.y, ringRadius, 0, Math.PI * 2);
      context.stroke();

      resolveCrashBurstVectors(effect.event.eventId, 4).forEach((burst) => {
        const startRadius = strokeWidth * 0.5;
        const endRadius = ringRadius + (burst.magnitude * metrics.cellSize * progress * 0.55);
        context.beginPath();
        context.moveTo(
          center.x + (burst.dx * startRadius),
          center.y + (burst.dy * startRadius),
        );
        context.lineTo(
          center.x + (burst.dx * endRadius),
          center.y + (burst.dy * endRadius),
        );
        context.stroke();
      });
      context.restore();
    });
    effectsRef.current = nextEffects;
  }, [game, mode, size.height, size.width]);

  const animateEffects = React.useCallback((timestamp: number) => {
    rafIdRef.current = 0;
    renderFrame(timestamp);
    if (effectsRef.current.size > 0) {
      rafIdRef.current = window.requestAnimationFrame(animateEffects);
    }
  }, [renderFrame]);

  const ensureEffectAnimation = React.useCallback(() => {
    if (effectsRef.current.size === 0 || rafIdRef.current !== 0) return;
    rafIdRef.current = window.requestAnimationFrame(animateEffects);
  }, [animateEffects]);

  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const updateSize = () => {
      const nextWidth = Math.max(1, Math.floor(frame.clientWidth));
      const nextHeight = Math.max(1, Math.floor(frame.clientHeight));
      setSize((current) => (
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight }
      ));
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateSize);
      window.addEventListener('orientationchange', updateSize);
      return () => {
        window.removeEventListener('resize', updateSize);
        window.removeEventListener('orientationchange', updateSize);
      };
    }

    const observer = new ResizeObserver(() => updateSize());
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    effectsRef.current.clear();
    seenEventIdsRef.current.clear();
    if (rafIdRef.current !== 0) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    renderFrame(nowMs());
  }, [game.round, renderFrame]);

  React.useEffect(() => {
    const startedAtMs = nowMs();
    crashEvents.forEach((event) => {
      if (seenEventIdsRef.current.has(event.eventId)) return;
      seenEventIdsRef.current.add(event.eventId);
      effectsRef.current.set(event.eventId, createCrashEffect(event, startedAtMs));
    });
    renderFrame(startedAtMs);
    ensureEffectAnimation();
  }, [crashEvents, ensureEffectAnimation, renderFrame]);

  React.useEffect(() => {
    const timestamp = nowMs();
    renderFrame(timestamp);
    ensureEffectAnimation();
  }, [ensureEffectAnimation, game, mode, renderFrame, size.height, size.width]);

  React.useEffect(() => () => {
    if (rafIdRef.current !== 0) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    effectsRef.current.clear();
    seenEventIdsRef.current.clear();
  }, []);

  return (
    <div
      ref={frameRef}
      className={`${styles.canvasFrame} ${mode === 'fullscreen' ? styles.canvasFrameFullscreen : ''}`.trim()}
      data-panel-zoom-block="true"
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={`Tron arena ${game.columns} by ${game.rows}`}
      />
    </div>
  );
};

export default ConnectBoardCanvas;
