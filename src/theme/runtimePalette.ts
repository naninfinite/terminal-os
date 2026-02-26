import type { ResolvedTheme } from './types';

type RuntimeThemePalette = {
  background: string;
  text: string;
  accent: string;
  thirdGrid: string;
  thirdGridOpacity: number;
  thirdMaterialDefault: string;
};

export const RUNTIME_THEME_PALETTE: Record<ResolvedTheme, RuntimeThemePalette> = {
  dark: {
    background: '#000000',
    text: '#00ff66',
    accent: '#00ff66',
    thirdGrid: '#00ff66',
    thirdGridOpacity: 0.45,
    thirdMaterialDefault: '#00ff66',
  },
  light: {
    background: '#f5f4ef',
    text: '#101010',
    accent: '#0f8f63',
    thirdGrid: '#101010',
    thirdGridOpacity: 0.82,
    thirdMaterialDefault: '#101010',
  },
};
