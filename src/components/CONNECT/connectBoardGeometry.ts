import { toTronGridPoint, tronIdToCell } from '../../connect/tronEngine';
import type { TronCell, TronGridPoint } from '../../connect/types';

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

export const toCanvasPoint = (
  point: TronGridPoint,
  metrics: ConnectBoardMetrics,
): ConnectTrailPoint => ({
  x: metrics.offsetX + (point.x * metrics.cellSize),
  y: metrics.offsetY + (point.y * metrics.cellSize),
});

export const getCellCenter = (
  cell: TronCell,
  metrics: ConnectBoardMetrics,
): ConnectTrailPoint => toCanvasPoint(toTronGridPoint(cell), metrics);

export const buildTrailPolyline = (args: {
  trailCellIds: number[];
  columns: number;
  metrics: ConnectBoardMetrics;
  impactPoint?: TronGridPoint | null;
}): ConnectTrailPoint[] => {
  const points = args.trailCellIds.map((cellId) => (
    getCellCenter(tronIdToCell(args.columns, cellId), args.metrics)
  ));

  if (args.impactPoint) {
    points.push(toCanvasPoint(args.impactPoint, args.metrics));
  }

  return points;
};

export const getTrailStrokeWidth = (
  cellSize: number,
  mode: 'panel' | 'fullscreen',
): number => {
  const base = mode === 'fullscreen' ? cellSize * 0.16 : cellSize * 0.12;
  return Math.max(1.25, Math.min(mode === 'fullscreen' ? 5 : 3.5, base));
};
