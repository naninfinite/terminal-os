/**
 * Shared type definitions for the ME.OS shell foundation.
 * M1 focuses on window lifecycle, display mode switching, and persistence.
 */

export type MeOsDisplayMode = 'panel' | 'fullscreen';

export type MeOsViewerKind = 'text' | 'image' | 'video' | 'project';

export type MeOsFixedAppId = 'file' | 'about' | 'projects' | 'media';

export type MeOsAppId = MeOsFixedAppId | 'viewer_text' | 'viewer_image' | 'viewer_video' | 'viewer_project';

export type MeOsWindowRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
  maximized: boolean;
  restoreRect?: MeOsWindowRect;
  nodeId?: string;
  viewerKind?: MeOsViewerKind;
};

export type MeOsWindowTemplate = Omit<MeOsWindow, 'zIndex' | 'minimized' | 'maximized' | 'restoreRect' | 'nodeId' | 'viewerKind'>;

export type MeOsPersistedSnapshot = {
  version: 1;
  windows: MeOsWindow[];
};
