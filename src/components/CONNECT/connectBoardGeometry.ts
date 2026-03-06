import { tronIdToCell } from '../../connect/tronEngine';
import type { TronCell } from '../../connect/types';

export type ConnectBoardMetrics = {
  boardWidth: number;
  boardHeight: number;
  cellSize: number;
  offsetX: number;
  offsetY: number;
};

export type ConnectTrailPoint = {
  x: number;
  y: number;
};

export const resolveConnectBoardMetrics = (
  frameWidth: number,
  frameHeight: number,
  columns: number,
  rows: number,
): ConnectBoardMetrics => {
  const safeWidth = Math.max(1, Math.floor(frameWidth));
  const safeHeight = Math.max(1, Math.floor(frameHeight));
  const cellSize = Math.max(1, Math.floor(Math.min(safeWidth / columns, safeHeight / rows)));
  const boardWidth = cellSize * columns;
  const boardHeight = cellSize * rows;
  return {
    boardWidth,
    boardHeight,
    cellSize,
    offsetX: Math.floor((safeWidth - boardWidth) / 2),
    offsetY: Math.floor((safeHeight - boardHeight) / 2),
  };
};

export const getCellCenter = (
  cell: TronCell,
  metrics: ConnectBoardMetrics,
): ConnectTrailPoint => ({
  x: metrics.offsetX + (cell.x * metrics.cellSize) + (metrics.cellSize / 2),
  y: metrics.offsetY + (cell.y * metrics.cellSize) + (metrics.cellSize / 2),
});

export const buildTrailPolyline = (
  trailCellIds: number[],
  columns: number,
  metrics: ConnectBoardMetrics,
): ConnectTrailPoint[] => trailCellIds.map((cellId) => getCellCenter(tronIdToCell(columns, cellId), metrics));

export const getTrailStrokeWidth = (
  cellSize: number,
  mode: 'panel' | 'fullscreen',
): number => {
  const base = mode === 'fullscreen' ? cellSize * 0.18 : cellSize * 0.14;
  return Math.max(1.5, Math.min(mode === 'fullscreen' ? 6 : 4, base));
};
