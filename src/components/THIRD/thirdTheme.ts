import { RUNTIME_THEME_PALETTE } from '../../theme/runtimePalette';
import type { ResolvedTheme } from '../../theme/types';
import { THIRD_DEFAULT_COLOR } from '../../third/state';

type ThirdThemePalette = {
  background: number;
  accent: number;
  grid: number;
  gridOpacity: number;
  materialDefault: number;
};

export const toThreeHex = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const normalizeHexColor = (value: string, fallbackHex: number): string => {
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  return `#${fallbackHex.toString(16).padStart(6, '0')}`;
};

export const resolveThirdMaterialColorHex = (color: string, fallbackHex: number): number => {
  const normalized = normalizeHexColor(color, fallbackHex);
  // Treat the legacy default as semantic "use theme default color" so light mode can stay monochrome.
  if (normalized === THIRD_DEFAULT_COLOR) return fallbackHex;
  return toThreeHex(normalized, fallbackHex);
};

export const getThirdThemePalette = (theme: ResolvedTheme): ThirdThemePalette => {
  const palette = RUNTIME_THEME_PALETTE[theme];
  const accent = toThreeHex(palette.accent, 0x00ff66);
  const materialDefault = toThreeHex(palette.thirdMaterialDefault, accent);
  const grid = theme === 'dark'
    ? 0x00ff66
    : toThreeHex(palette.thirdGrid, materialDefault);
  const gridOpacity = Number.isFinite(palette.thirdGridOpacity)
    ? Math.min(1, Math.max(0, palette.thirdGridOpacity))
    : 0.45;

  return {
    background: toThreeHex(palette.background, 0x000000),
    accent,
    grid,
    gridOpacity,
    materialDefault,
  };
};

export type { ThirdThemePalette };
