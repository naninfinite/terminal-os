import React from 'react';
import styles from './CONNECT.module.scss';
import {
  buildTrailPolyline,
  getCellCenter,
  getTrailStrokeWidth,
  resolveConnectBoardMetrics,
} from './connectBoardGeometry';
import type { TronGameState, TronPlayerId } from '../../connect/types';

type ConnectBoardCanvasProps = {
  game: TronGameState;
  mode?: 'panel' | 'fullscreen';
};

const BACKGROUND_COLOR = '#001108';
const GRID_COLOR = 'rgb(0 255 102 / 0.05)';
const BOARD_BORDER = 'rgb(0 255 102 / 0.35)';
const TRAIL_COLORS: Record<TronPlayerId, string> = {
  p1: '#7dffb7',
  p2: '#66cfff',
  p3: '#ffb84a',
  p4: '#f4ea63',
};
const HEAD_COLORS: Record<TronPlayerId, string> = {
  p1: '#d7ffe8',
  p2: '#dbf6ff',
  p3: '#ffe2a9',
  p4: '#fffbd1',
};
const DEAD_COLORS: Record<TronPlayerId, string> = {
  p1: 'rgb(125 255 183 / 0.32)',
  p2: 'rgb(102 207 255 / 0.32)',
  p3: 'rgb(255 184 74 / 0.32)',
  p4: 'rgb(244 234 99 / 0.32)',
};

const ConnectBoardCanvas: React.FC<ConnectBoardCanvasProps> = ({ game, mode = 'panel' }) => {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

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
    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, size.width, size.height);
    context.fillStyle = BACKGROUND_COLOR;
    context.fillRect(0, 0, size.width, size.height);

    context.strokeStyle = BOARD_BORDER;
    context.lineWidth = 1;
    context.strokeRect(
      metrics.offsetX + 0.5,
      metrics.offsetY + 0.5,
      metrics.boardWidth - 1,
      metrics.boardHeight - 1,
    );

    context.strokeStyle = GRID_COLOR;
    context.lineWidth = 1;
    for (let x = 1; x < game.columns; x += 1) {
      const pixelX = metrics.offsetX + (x * metrics.cellSize) + 0.5;
      context.beginPath();
      context.moveTo(pixelX, metrics.offsetY);
      context.lineTo(pixelX, metrics.offsetY + metrics.boardHeight);
      context.stroke();
    }
    for (let y = 1; y < game.rows; y += 1) {
      const pixelY = metrics.offsetY + (y * metrics.cellSize) + 0.5;
      context.beginPath();
      context.moveTo(metrics.offsetX, pixelY);
      context.lineTo(metrics.offsetX + metrics.boardWidth, pixelY);
      context.stroke();
    }

    const strokeWidth = getTrailStrokeWidth(metrics.cellSize, mode);

    game.activePlayerIds.forEach((playerId) => {
      const player = game.players[playerId];
      if (player.trailCellIds.length === 0) return;
      const points = buildTrailPolyline(player.trailCellIds, game.columns, metrics);
      if (points.length === 0) return;

      context.beginPath();
      context.moveTo(points[0]!.x, points[0]!.y);
      for (let index = 1; index < points.length; index += 1) {
        const point = points[index]!;
        context.lineTo(point.x, point.y);
      }
      context.strokeStyle = player.alive ? TRAIL_COLORS[playerId] : DEAD_COLORS[playerId];
      context.lineWidth = strokeWidth;
      context.lineJoin = 'miter';
      context.lineCap = 'square';
      context.stroke();

      const head = getCellCenter(player.head, metrics);
      const headSize = Math.max(2, Math.floor(metrics.cellSize * 0.3));
      context.fillStyle = player.alive ? HEAD_COLORS[playerId] : DEAD_COLORS[playerId];
      context.fillRect(
        Math.floor(head.x - (headSize / 2)),
        Math.floor(head.y - (headSize / 2)),
        headSize,
        headSize,
      );
    });
  }, [game, mode, size.height, size.width]);

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
        aria-label={`Tron grid ${game.columns} by ${game.rows}`}
      />
    </div>
  );
};

export default ConnectBoardCanvas;
