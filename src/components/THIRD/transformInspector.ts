export const MIN_INSPECTOR_SCALE = 0.05;

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

export const radToDeg = (radians: number): number => radians * RAD_TO_DEG;

export const degToRad = (degrees: number): number => degrees * DEG_TO_RAD;

export const parseInspectorNumber = (raw: string): number | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
};

export const clampInspectorScale = (value: number, min = MIN_INSPECTOR_SCALE): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, value);
};

export const formatInspectorNumber = (value: number, precision = 3): string => {
  if (!Number.isFinite(value)) return '0';
  const epsilon = 10 ** -precision;
  const normalized = Math.abs(value) < epsilon ? 0 : value;
  return normalized.toFixed(precision).replace(/\.?0+$/, '');
};
