import type { MeOsWindow, MeOsWindowRect } from './types';

const asFiniteNumber = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

export const isValidWindowRect = (value: unknown): value is MeOsWindowRect => {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  return (
    asFiniteNumber(data.x) !== null
    && asFiniteNumber(data.y) !== null
    && asFiniteNumber(data.width) !== null
    && asFiniteNumber(data.height) !== null
  );
};

export const sanitizePersistedWindowState = (raw: {
  maximized?: unknown;
  restoreRect?: unknown;
}): Pick<MeOsWindow, 'maximized' | 'restoreRect'> => {
  const maximized = raw.maximized === true;
  const restoreRect = isValidWindowRect(raw.restoreRect) ? raw.restoreRect : undefined;
  return { maximized, restoreRect };
};

export const toggleWindowMaximize = (
  windowState: MeOsWindow,
  fallbackRect: MeOsWindowRect
): MeOsWindow => {
  if (windowState.maximized) {
    const restore = windowState.restoreRect ?? fallbackRect;
    return {
      ...windowState,
      ...restore,
      maximized: false,
      restoreRect: undefined,
    };
  }

  return {
    ...windowState,
    maximized: true,
    restoreRect: fallbackRect,
  };
};
