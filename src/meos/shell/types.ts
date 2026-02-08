/**
 * Shared type definitions for the ME.OS shell foundation.
 * M1 focuses on window lifecycle, display mode switching, and persistence.
 */

export type MeOsDisplayMode = 'panel' | 'fullscreen';

export type MeOsAppId = 'home' | 'about' | 'projects' | 'media';

export type MeOsWindow = {
  id: string;
  title: string;
  appId: MeOsAppId;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
};

export type MeOsWindowTemplate = Omit<MeOsWindow, 'zIndex' | 'minimized'>;

export type MeOsPersistedSnapshot = {
  version: 1;
  windows: MeOsWindow[];
};

