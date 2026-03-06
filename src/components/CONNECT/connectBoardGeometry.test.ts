import { describe, expect, it } from 'vitest';
import {
  buildTrailPolyline,
  getTrailStrokeWidth,
  resolveConnectBoardMetrics,
} from './connectBoardGeometry';

describe('connectBoardGeometry', () => {
  it('fits the board inside the available frame', () => {
    const metrics = resolveConnectBoardMetrics(520, 300, 60, 40);

    expect(metrics.boardWidth).toBeLessThanOrEqual(520);
    expect(metrics.boardHeight).toBeLessThanOrEqual(300);
    expect(metrics.cellSize).toBeGreaterThan(0);
  });

  it('builds ordered trail polylines from cell ids', () => {
    const metrics = resolveConnectBoardMetrics(600, 400, 10, 10);
    const points = buildTrailPolyline([0, 1, 11], 10, metrics);

    expect(points).toHaveLength(3);
    expect(points[1]!.x).toBeGreaterThan(points[0]!.x);
    expect(points[2]!.y).toBeGreaterThan(points[1]!.y);
  });

  it('clamps trail width across panel and fullscreen modes', () => {
    expect(getTrailStrokeWidth(8, 'panel')).toBeGreaterThanOrEqual(1.5);
    expect(getTrailStrokeWidth(24, 'fullscreen')).toBeLessThanOrEqual(6);
  });
});
