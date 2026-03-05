import React from 'react';
import styles from './SnakeGameWindow.module.scss';
import {
  DEFAULT_SNAKE_GAME_CONFIG,
  advanceSnakeGame,
  createSnakeGameState,
  queueSnakeDirection,
  restartSnakeGame,
  toggleSnakePause,
  type SnakeCell,
  type SnakeDirection,
  type SnakeGameState,
} from './snakeGame';
import {
  loadSnakeGameSession,
  saveSnakeGameSession,
} from './snakeGameSession';

type SnakeGameWindowProps = {
  windowId: string;
  name: string;
  description?: string;
};

type SnakeSurfaceMetrics = {
  cellSize: number;
  boardWidth: number;
  boardHeight: number;
};

type PixelPoint = {
  x: number;
  y: number;
};

const DEFAULT_CELL_SIZE = 12;
const MIN_CELL_SIZE = 8;
const MAX_FRAME_DELTA_MS = 250;

const KEY_TO_DIRECTION: Record<string, SnakeDirection> = {
  ArrowUp: 'up',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  w: 'up',
  W: 'up',
  d: 'right',
  D: 'right',
  s: 'down',
  S: 'down',
  a: 'left',
  A: 'left',
};

const createDefaultSurfaceMetrics = (columns: number, rows: number): SnakeSurfaceMetrics => ({
  cellSize: DEFAULT_CELL_SIZE,
  boardWidth: columns * DEFAULT_CELL_SIZE,
  boardHeight: rows * DEFAULT_CELL_SIZE,
});

const resolveSurfaceMetrics = (
  width: number,
  height: number,
  columns: number,
  rows: number,
): SnakeSurfaceMetrics => {
  const safeWidth = width > 0 ? width : columns * DEFAULT_CELL_SIZE;
  const safeHeight = height > 0 ? height : rows * DEFAULT_CELL_SIZE;
  const cellSize = Math.max(MIN_CELL_SIZE, Math.floor(Math.min(safeWidth / columns, safeHeight / rows)));
  return {
    cellSize,
    boardWidth: cellSize * columns,
    boardHeight: cellSize * rows,
  };
};

const getCellCenter = (cell: SnakeCell, cellSize: number): PixelPoint => ({
  x: (cell.x * cellSize) + (cellSize / 2),
  y: (cell.y * cellSize) + (cellSize / 2),
});

const getWrapBridge = (args: {
  from: SnakeCell;
  to: SnakeCell;
  columns: number;
  rows: number;
  cellSize: number;
  boardWidth: number;
  boardHeight: number;
}): { exit: PixelPoint; enter: PixelPoint } | null => {
  if (args.from.y === args.to.y && Math.abs(args.from.x - args.to.x) === args.columns - 1) {
    const y = (args.from.y * args.cellSize) + (args.cellSize / 2);
    if (args.from.x === args.columns - 1 && args.to.x === 0) {
      return {
        exit: { x: args.boardWidth, y },
        enter: { x: 0, y },
      };
    }
    if (args.from.x === 0 && args.to.x === args.columns - 1) {
      return {
        exit: { x: 0, y },
        enter: { x: args.boardWidth, y },
      };
    }
  }

  if (args.from.x === args.to.x && Math.abs(args.from.y - args.to.y) === args.rows - 1) {
    const x = (args.from.x * args.cellSize) + (args.cellSize / 2);
    if (args.from.y === args.rows - 1 && args.to.y === 0) {
      return {
        exit: { x, y: args.boardHeight },
        enter: { x, y: 0 },
      };
    }
    if (args.from.y === 0 && args.to.y === args.rows - 1) {
      return {
        exit: { x, y: 0 },
        enter: { x, y: args.boardHeight },
      };
    }
  }

  return null;
};

const drawSnakeTrail = (args: {
  context: CanvasRenderingContext2D;
  snake: SnakeCell[];
  columns: number;
  rows: number;
  cellSize: number;
  boardWidth: number;
  boardHeight: number;
  ink: string;
}) => {
  if (args.snake.length < 2) return;

  const points = [...args.snake].reverse();
  const context = args.context;
  context.strokeStyle = args.ink;
  context.lineWidth = Math.max(2, Math.floor(args.cellSize / 4));
  context.lineJoin = 'miter';
  context.lineCap = 'butt';

  let currentCell = points[0]!;
  let currentPoint = getCellCenter(currentCell, args.cellSize);
  context.beginPath();
  context.moveTo(currentPoint.x, currentPoint.y);

  for (let index = 1; index < points.length; index += 1) {
    const nextCell = points[index]!;
    const bridge = getWrapBridge({
      from: currentCell,
      to: nextCell,
      columns: args.columns,
      rows: args.rows,
      cellSize: args.cellSize,
      boardWidth: args.boardWidth,
      boardHeight: args.boardHeight,
    });
    const nextPoint = getCellCenter(nextCell, args.cellSize);

    if (bridge) {
      context.lineTo(bridge.exit.x, bridge.exit.y);
      context.stroke();
      context.beginPath();
      context.moveTo(bridge.enter.x, bridge.enter.y);
      context.lineTo(nextPoint.x, nextPoint.y);
    } else {
      context.lineTo(nextPoint.x, nextPoint.y);
    }

    currentCell = nextCell;
    currentPoint = nextPoint;
  }

  context.stroke();
};

const formatStatus = (state: SnakeGameState): string => {
  if (state.status === 'ready') return 'READY';
  if (state.status === 'running') return 'RUN';
  if (state.status === 'paused') return 'PAUSE';
  return state.outcome === 'cleared' ? 'CLEAR' : 'OVER';
};

const formatHint = (state: SnakeGameState): string => {
  if (state.status === 'ready') return 'ARROWS/WASD START. SPACE PAUSE.';
  if (state.status === 'paused') return 'AUTO/MANUAL PAUSE. PRESS SPACE OR MOVE.';
  if (state.status === 'game_over') {
    return state.outcome === 'cleared'
      ? 'BOARD CLEARED. PRESS R TO RESTART.'
      : 'SELF COLLISION. PRESS R TO RESTART.';
  }
  return 'WRAP EDGES. EAT APPLES. AVOID YOUR TRAIL.';
};

const SnakeGameWindow: React.FC<SnakeGameWindowProps> = ({ windowId, name, description }) => {
  const cachedSession = React.useMemo(() => loadSnakeGameSession(windowId), [windowId]);
  const [game, setGame] = React.useState(() => cachedSession?.game ?? createSnakeGameState(DEFAULT_SNAKE_GAME_CONFIG));
  const [surfaceMetrics, setSurfaceMetrics] = React.useState<SnakeSurfaceMetrics>(() => (
    createDefaultSurfaceMetrics(
      cachedSession?.game.columns ?? DEFAULT_SNAKE_GAME_CONFIG.columns,
      cachedSession?.game.rows ?? DEFAULT_SNAKE_GAME_CONFIG.rows,
    )
  ));
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const boardFrameRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const gameRef = React.useRef(game);
  const lastFrameRef = React.useRef<number | null>(null);
  const accumulatorRef = React.useRef(0);
  const loopRafIdRef = React.useRef<number | null>(null);
  const resumeRafIdRef = React.useRef<number | null>(null);
  const autoResumePendingRef = React.useRef(cachedSession?.autoResumePending ?? false);

  React.useEffect(() => {
    gameRef.current = game;
  }, [game]);

  const cancelScheduledResume = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    if (resumeRafIdRef.current == null) return;
    window.cancelAnimationFrame(resumeRafIdRef.current);
    resumeRafIdRef.current = null;
  }, []);

  const focusRoot = React.useCallback(() => {
    rootRef.current?.focus();
  }, []);

  const scheduleAutoResume = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!autoResumePendingRef.current || document.hidden || resumeRafIdRef.current != null) return;

    resumeRafIdRef.current = window.requestAnimationFrame(() => {
      resumeRafIdRef.current = null;
      if (!autoResumePendingRef.current || document.hidden) return;

      accumulatorRef.current = 0;
      lastFrameRef.current = null;
      autoResumePendingRef.current = false;
      setGame((current) => (
        current.status === 'paused'
          ? { ...current, status: 'running', outcome: null }
          : current
      ));
    });
  }, []);

  const autoPause = React.useCallback(() => {
    cancelScheduledResume();
    setGame((current) => {
      if (current.status !== 'running') return current;
      autoResumePendingRef.current = true;
      return { ...current, status: 'paused' };
    });
  }, [cancelScheduledResume]);

  const handleDirection = (direction: SnakeDirection) => {
    autoResumePendingRef.current = false;
    cancelScheduledResume();
    setGame((current) => queueSnakeDirection(current, direction));
    focusRoot();
  };

  const handlePauseToggle = () => {
    autoResumePendingRef.current = false;
    cancelScheduledResume();
    setGame((current) => toggleSnakePause(current));
    focusRoot();
  };

  const handleRestart = () => {
    autoResumePendingRef.current = false;
    cancelScheduledResume();
    accumulatorRef.current = 0;
    lastFrameRef.current = null;
    setGame((current) => restartSnakeGame(current));
    focusRoot();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const direction = KEY_TO_DIRECTION[event.key];
    if (direction) {
      event.preventDefault();
      handleDirection(direction);
      return;
    }

    if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      handlePauseToggle();
      return;
    }

    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      handleRestart();
    }
  };

  const measureBoard = React.useCallback(() => {
    const frame = boardFrameRef.current;
    setSurfaceMetrics(resolveSurfaceMetrics(
      frame?.clientWidth ?? 0,
      frame?.clientHeight ?? 0,
      gameRef.current.columns,
      gameRef.current.rows,
    ));
  }, []);

  React.useEffect(() => {
    focusRoot();
    measureBoard();
    if (autoResumePendingRef.current) {
      scheduleAutoResume();
    }
  }, [focusRoot, measureBoard, scheduleAutoResume]);

  React.useEffect(() => {
    accumulatorRef.current = 0;
    lastFrameRef.current = null;
  }, [game.status, game.tickMs]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    measureBoard();

    const frame = boardFrameRef.current;
    if (!frame) return undefined;

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => measureBoard());
      observer.observe(frame);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', measureBoard);
    return () => window.removeEventListener('resize', measureBoard);
  }, [measureBoard]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onFrame = (timestamp: number) => {
      if (gameRef.current.status === 'running') {
        if (lastFrameRef.current == null) {
          lastFrameRef.current = timestamp;
        } else {
          const delta = Math.min(timestamp - lastFrameRef.current, MAX_FRAME_DELTA_MS);
          lastFrameRef.current = timestamp;
          accumulatorRef.current += delta;

          const tickCount = Math.floor(accumulatorRef.current / gameRef.current.tickMs);
          if (tickCount > 0) {
            accumulatorRef.current -= tickCount * gameRef.current.tickMs;
            setGame((current) => {
              let next = current;
              for (let index = 0; index < tickCount; index += 1) {
                next = advanceSnakeGame(next);
                if (next.status !== 'running') break;
              }
              return next;
            });
          }
        }
      }

      loopRafIdRef.current = window.requestAnimationFrame(onFrame);
    };

    loopRafIdRef.current = window.requestAnimationFrame(onFrame);
    return () => {
      if (loopRafIdRef.current != null) {
        window.cancelAnimationFrame(loopRafIdRef.current);
        loopRafIdRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onWindowBlur = () => autoPause();
    const onWindowFocus = () => {
      if (rootRef.current?.contains(document.activeElement)) {
        scheduleAutoResume();
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        autoPause();
        return;
      }
      if (rootRef.current?.contains(document.activeElement)) {
        scheduleAutoResume();
      }
    };

    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [autoPause, scheduleAutoResume]);

  React.useEffect(() => () => {
    cancelScheduledResume();

    if (typeof window !== 'undefined' && loopRafIdRef.current != null) {
      window.cancelAnimationFrame(loopRafIdRef.current);
      loopRafIdRef.current = null;
    }

    const latest = gameRef.current;
    const shouldAutoResume = autoResumePendingRef.current || latest.status === 'running';
    const gameToSave = latest.status === 'running'
      ? { ...latest, status: 'paused' as const }
      : latest;

    saveSnakeGameSession(windowId, {
      game: gameToSave,
      autoResumePending: shouldAutoResume,
    });
  }, [cancelScheduledResume, windowId]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const boardWidth = surfaceMetrics.boardWidth;
    const boardHeight = surfaceMetrics.boardHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(boardWidth * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(boardHeight * devicePixelRatio));
    canvas.style.width = `${boardWidth}px`;
    canvas.style.height = `${boardHeight}px`;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(devicePixelRatio, devicePixelRatio);
    context.imageSmoothingEnabled = false;

    const computedStyles = window.getComputedStyle(root);
    const lcdBackground = computedStyles.getPropertyValue('--snake-lcd-bg').trim() || '#001108';
    const lcdInk = computedStyles.getPropertyValue('--snake-lcd-ink').trim() || '#00ff66';
    const lcdGrid = computedStyles.getPropertyValue('--snake-lcd-grid').trim() || 'rgb(0 255 102 / 0.12)';

    context.clearRect(0, 0, boardWidth, boardHeight);
    context.fillStyle = lcdBackground;
    context.fillRect(0, 0, boardWidth, boardHeight);

    context.strokeStyle = lcdGrid;
    context.lineWidth = 1;
    for (let x = 0; x <= game.columns; x += 1) {
      const pixelX = x * surfaceMetrics.cellSize;
      context.beginPath();
      context.moveTo(pixelX + 0.5, 0);
      context.lineTo(pixelX + 0.5, boardHeight);
      context.stroke();
    }
    for (let y = 0; y <= game.rows; y += 1) {
      const pixelY = y * surfaceMetrics.cellSize;
      context.beginPath();
      context.moveTo(0, pixelY + 0.5);
      context.lineTo(boardWidth, pixelY + 0.5);
      context.stroke();
    }

    drawSnakeTrail({
      context,
      snake: game.snake,
      columns: game.columns,
      rows: game.rows,
      cellSize: surfaceMetrics.cellSize,
      boardWidth,
      boardHeight,
      ink: lcdInk,
    });

    const appleSize = Math.max(2, Math.floor(surfaceMetrics.cellSize / 3));
    const appleX = (game.food.x * surfaceMetrics.cellSize) + Math.floor((surfaceMetrics.cellSize - appleSize) / 2);
    const appleY = (game.food.y * surfaceMetrics.cellSize) + Math.floor((surfaceMetrics.cellSize - appleSize) / 2);
    context.fillStyle = lcdInk;
    context.fillRect(appleX, appleY, appleSize, appleSize);

  }, [game, surfaceMetrics]);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseDown={focusRoot}
      onFocusCapture={() => {
        if (autoResumePendingRef.current) {
          scheduleAutoResume();
        }
      }}
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && rootRef.current?.contains(nextTarget)) return;
        autoPause();
      }}
      data-allow-select="true"
      aria-label={`${name} game`}
    >
      <div className={styles.hud}>
        <p className={styles.modeLabel}>NOKIA MODE</p>
        <div className={styles.metrics}>
          <span className={styles.metric}>SCORE {String(game.score).padStart(3, '0')}</span>
          <span className={styles.metric}>SPEED {String(game.tickMs).padStart(3, '0')}</span>
          <span className={styles.metric}>STATE {formatStatus(game)}</span>
        </div>
      </div>

      <p className={styles.summary}>
        {description || 'Wraparound Snake with fixed-tick movement and a thin canvas trail.'}
      </p>

      <div ref={boardFrameRef} className={styles.boardFrame}>
        <canvas
          ref={canvasRef}
          className={styles.boardCanvas}
          role="img"
          aria-label={`Snake board ${game.columns} by ${game.rows}`}
        />
      </div>

      <p className={styles.hint} aria-live="polite">{formatHint(game)}</p>

      <div className={styles.controls}>
        <div className={styles.metaControls}>
          <button type="button" className={styles.controlButton} onClick={handlePauseToggle}>
            {game.status === 'running' ? 'PAUSE' : 'START'}
          </button>
          <button type="button" className={styles.controlButton} onClick={handleRestart}>
            RESTART
          </button>
        </div>

        <div className={styles.directionPad} aria-label="On-screen controls">
          <span className={styles.directionSpacer} aria-hidden="true" />
          <button type="button" className={styles.controlButton} onClick={() => handleDirection('up')}>UP</button>
          <span className={styles.directionSpacer} aria-hidden="true" />
          <button type="button" className={styles.controlButton} onClick={() => handleDirection('left')}>LEFT</button>
          <button type="button" className={styles.controlButton} onClick={() => handleDirection('down')}>DOWN</button>
          <button type="button" className={styles.controlButton} onClick={() => handleDirection('right')}>RIGHT</button>
        </div>
      </div>
    </div>
  );
};

export default SnakeGameWindow;
