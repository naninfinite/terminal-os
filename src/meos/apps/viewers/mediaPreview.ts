import { RUNTIME_THEME_PALETTE } from '../../../theme/runtimePalette';
import type { ResolvedTheme } from '../../../theme/types';
import type { VfsNode } from '../../vfs/types';
import { resolveVideoThumbnailAsset } from '../../vfs/videoThumbnailRegistry';

const FALLBACK_SVG_THEME: Record<ResolvedTheme, {
  background: string;
  frameStroke: string;
  titleColor: string;
  bodyColor: string;
}> = {
  dark: {
    background: RUNTIME_THEME_PALETTE.dark.background,
    frameStroke: RUNTIME_THEME_PALETTE.dark.accent,
    titleColor: RUNTIME_THEME_PALETTE.dark.text,
    bodyColor: RUNTIME_THEME_PALETTE.dark.text,
  },
  light: {
    background: RUNTIME_THEME_PALETTE.light.background,
    frameStroke: RUNTIME_THEME_PALETTE.light.accent,
    titleColor: RUNTIME_THEME_PALETTE.light.text,
    bodyColor: RUNTIME_THEME_PALETTE.light.text,
  },
};

export const createFallbackImagePreview = (label: string, theme: ResolvedTheme): string => {
  const safe = label.replace(/[<>&]/g, '');
  const palette = FALLBACK_SVG_THEME[theme];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <rect width="1280" height="720" fill="${palette.background}" />
      <rect x="24" y="24" width="1232" height="672" fill="none" stroke="${palette.frameStroke}" stroke-opacity="0.3" stroke-width="2" />
      <text x="72" y="128" font-family="monospace" font-size="38" fill="${palette.titleColor}">ME.EXE IMAGE PREVIEW</text>
      <text x="72" y="190" font-family="monospace" font-size="24" fill="${palette.bodyColor}" fill-opacity="0.85">${safe}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const resolveImagePreviewSrc = (node: VfsNode, theme: ResolvedTheme): string => (
  node.assetSrc?.trim() || createFallbackImagePreview(node.name, theme)
);

export const resolveConfiguredVideoPosterSrc = (node: VfsNode): string | null => (
  node.posterSrc?.trim() || resolveVideoThumbnailAsset(node.videoThumbnailId)
);

export const resolveVideoPosterSrc = (node: VfsNode, theme: ResolvedTheme): string => (
  resolveConfiguredVideoPosterSrc(node) || createFallbackImagePreview(`${node.name} (poster)`, theme)
);
