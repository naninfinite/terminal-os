/**
 * Shared type definitions for the ME.OS shell foundation.
 * M1 focuses on window lifecycle, display mode switching, and persistence.
 */

export type MeOsDisplayMode = 'panel' | 'fullscreen';

export type MeOsViewerKind = 'text' | 'image' | 'video' | 'project' | 'contact';

export type MeOsDesktopEntryId =
  | 'home'
  | 'projects'
  | 'media'
  | 'about'
  | 'contact'
  | 'archive'
  | 'readme';

export type MeOsDesktopEntry = {
  id: MeOsDesktopEntryId;
  label: string;
  nodeId: string;
  iconVariant: 'folder' | 'document' | 'contact';
  alias: boolean;
};

export type MeOsAppId =
  | 'folder'
  | 'info'
  | 'viewer_text'
  | 'viewer_image'
  | 'viewer_video'
  | 'viewer_project'
  | 'viewer_contact';

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
  desktopEntryId?: MeOsDesktopEntryId;
};

export type MeOsWindowTemplate = Omit<
  MeOsWindow,
  'zIndex' | 'minimized' | 'maximized' | 'restoreRect' | 'nodeId' | 'viewerKind' | 'desktopEntryId'
>;

export type MeOsPersistedSnapshot = {
  version: 2;
  windows: MeOsWindow[];
};
