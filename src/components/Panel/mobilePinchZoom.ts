export type PinchPoint = {
  x: number;
  y: number;
};

export const PANEL_ZOOM_MIN = 1;
export const PANEL_ZOOM_MAX = 2.5;

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

const sanitizeBound = (value: number, fallback: number): number => (
  isFiniteNumber(value) && value > 0 ? value : fallback
);

export const pinchDistance = (a: PinchPoint, b: PinchPoint): number => {
  if (!isFiniteNumber(a.x) || !isFiniteNumber(a.y) || !isFiniteNumber(b.x) || !isFiniteNumber(b.y)) {
    return 0;
  }
  return Math.hypot(a.x - b.x, a.y - b.y);
};

export const clampPanelScale = (
  scale: number,
  minScale = PANEL_ZOOM_MIN,
  maxScale = PANEL_ZOOM_MAX
): number => {
  const safeMin = sanitizeBound(minScale, PANEL_ZOOM_MIN);
  const safeMax = sanitizeBound(maxScale, PANEL_ZOOM_MAX);
  const lower = Math.min(safeMin, safeMax);
  const upper = Math.max(safeMin, safeMax);
  if (!isFiniteNumber(scale)) return lower;
  return Math.min(upper, Math.max(lower, scale));
};

export const derivePinchScale = (args: {
  startDistance: number;
  currentDistance: number;
  startScale: number;
  minScale?: number;
  maxScale?: number;
}): number => {
  const safeStartScale = clampPanelScale(args.startScale, args.minScale, args.maxScale);
  if (!isFiniteNumber(args.startDistance) || args.startDistance <= 0) return safeStartScale;
  if (!isFiniteNumber(args.currentDistance) || args.currentDistance <= 0) return safeStartScale;

  const ratio = args.currentDistance / args.startDistance;
  return clampPanelScale(safeStartScale * ratio, args.minScale, args.maxScale);
};
