import React from 'react';
import styles from './CONNECT.module.scss';
import { tronIdToCell } from '../../connect/tronEngine';
import type { TronGameState, TronPlayerId } from '../../connect/types';

type ConnectBoardCanvasProps = {
  game: TronGameState;
  localPlayerId: TronPlayerId;
};

const BACKGROUND_COLOR = '#03110b';
const GRID_COLOR = 'rgba(140, 255, 190, 0.08)';
const TRAIL_COLORS: Record<TronPlayerId, string> = {
  p1: '#7dffb7',
  p2: '#66cfff',
};
const HEAD_COLORS: Record<TronPlayerId, string> = {
  p1: '#d7ffe8',
  p2: '#dbf6ff',
};
const DEAD_COLOR = '#ff7d7d';

const ConnectBoardCanvas: React.FC<ConnectBoardCanvasProps> = ({ game }) => {
  const frameRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;

    const updateSize = () => {
      setSize({
        width: Math.max(1, Math.floor(frame.clientWidth)),
        height: Math.max(1, Math.floor(frame.clientHeight)),
      });
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

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, size.width, size.height);

    const cellWidth = size.width / game.columns;
    const cellHeight = size.height / game.rows;
    const ownerByCellId = new Map<number, TronPlayerId>();

    for (const playerId of ['p1', 'p2'] as TronPlayerId[]) {
      for (const cellId of game.players[playerId].trailCellIds) {
        ownerByCellId.set(cellId, playerId);
      }
    }

    ctx.fillStyle = GRID_COLOR;
    for (let x = 1; x < game.columns; x += 1) {
      ctx.fillRect((x * cellWidth) - 0.5, 0, 1, size.height);
    }
    for (let y = 1; y < game.rows; y += 1) {
      ctx.fillRect(0, (y * cellHeight) - 0.5, size.width, 1);
    }

    ownerByCellId.forEach((playerId, cellId) => {
      const cell = tronIdToCell(game.columns, cellId);
      const insetX = Math.max(1, Math.floor(cellWidth * 0.08));
      const insetY = Math.max(1, Math.floor(cellHeight * 0.08));
      ctx.fillStyle = game.players[playerId].alive ? TRAIL_COLORS[playerId] : DEAD_COLOR;
      ctx.fillRect(
        Math.floor(cell.x * cellWidth) + insetX,
        Math.floor(cell.y * cellHeight) + insetY,
        Math.max(1, Math.ceil(cellWidth - (insetX * 2))),
        Math.max(1, Math.ceil(cellHeight - (insetY * 2))),
      );
    });

    for (const playerId of ['p1', 'p2'] as TronPlayerId[]) {
      const head = game.players[playerId].head;
      const insetX = Math.max(1, Math.floor(cellWidth * 0.18));
      const insetY = Math.max(1, Math.floor(cellHeight * 0.18));
      ctx.fillStyle = game.players[playerId].alive ? HEAD_COLORS[playerId] : DEAD_COLOR;
      ctx.fillRect(
        Math.floor(head.x * cellWidth) + insetX,
        Math.floor(head.y * cellHeight) + insetY,
        Math.max(1, Math.ceil(cellWidth - (insetX * 2))),
        Math.max(1, Math.ceil(cellHeight - (insetY * 2))),
      );
    }
  }, [game, size.height, size.width]);

  return (
    <div ref={frameRef} className={styles.canvasFrame} data-panel-zoom-block="true">
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
