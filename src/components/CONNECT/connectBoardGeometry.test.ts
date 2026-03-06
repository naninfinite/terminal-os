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
    const points = buildTrailPolyline({
      trailCellIds: [0, 1, 11],
      columns: 10,
      metrics,
    });

    expect(points).toHaveLength(3);
    expect(points[1]!.x).toBeGreaterThan(points[0]!.x);
    expect(points[2]!.y).toBeGreaterThan(points[1]!.y);
  });

  it('appends visual impact points for eliminated riders', () => {
    const metrics = resolveConnectBoardMetrics(600, 400, 10, 10);
    const points = buildTrailPolyline({
      trailCellIds: [0, 1],
      columns: 10,
      metrics,
      impactPoint: { x: 3.5, y: 2.5 },
    });

    expect(points).toHaveLength(3);
    expect(points[2]!.x).toBeGreaterThan(points[1]!.x);
  });

  it('clamps trail width across panel and fullscreen modes', () => {
    expect(getTrailStrokeWidth(8, 'panel')).toBeGreaterThanOrEqual(1.25);
    expect(getTrailStrokeWidth(24, 'fullscreen')).toBeLessThanOrEqual(5);
  });
});
