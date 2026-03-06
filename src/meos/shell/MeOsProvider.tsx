/**
 * ME.OS shell state provider.
 *
 * Responsibilities:
 * - Manage panel/fullscreen display mode.
 * - Manage internal ME.OS windows (open/focus/move/minimize/close/restore).
 * - Open folder, document, and info windows from canonical VFS nodes.
 * - Persist shell window state to a namespaced versioned key.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getItemSafe, setItemSafe } from '../../utils/storage';
import { ABOUT_DOC_ID, HOME_ID, MEDIA_ID, PROJECTS_ID } from '../vfs/seed';
import { getMeOsVfsService } from '../vfs/service';
import type { VfsNode } from '../vfs/types';
import { createDesktopEntries } from './desktopEntries';
import {
  reorderSurfaceItemOrder,
  resolveSurfaceItemOrder,
  sanitizeSurfaceItemOrder,
} from './surfaceItemOrder';
import type {
  MeOsActiveScope,
  MeOsAppId,
  MeOsDesktopEntryId,
  MeOsDisplayMode,
  MeOsPersistedSnapshot,
  MeOsShellScope,
  MeOsSurfaceKey,
  MeOsViewerKind,
  MeOsWindow,
  MeOsWindowRect,
} from './types';
import { sanitizePersistedWindowState, toggleWindowMaximize } from './windowState';
import { clearSnakeGameSession } from '../apps/viewers/snakeGameSession';

const STORAGE_KEY = 'terminalOS.meos.v1.shell';
const STORAGE_VERSION = 3 as const;
const STATUS_BAR_HEIGHT = 28;
const SPAWN_MARGIN = 12;
const SPAWN_CASCADE_STEP = 18;
const SPAWN_CASCADE_MAX = 126;
const MIN_WINDOW_WIDTH = 260;
const MIN_WINDOW_HEIGHT = 180;
const VIEWPORT_GUTTER_X = 48;
const VIEWPORT_GUTTER_Y = 96;
const WINDOW_EDGE_BUFFER = 8;

const FOLDER_WINDOW_RECTS: Record<string, { x: number; y: number; width: number; height: number }> = {
  [HOME_ID]: { x: 48, y: 34, width: 700, height: 440 },
  [PROJECTS_ID]: { x: 118, y: 66, width: 560, height: 380 },
  [MEDIA_ID]: { x: 156, y: 92, width: 580, height: 392 },
  archive: { x: 198, y: 118, width: 500, height: 340 },
};

const VIEWER_APP_BY_KIND: Record<MeOsViewerKind, MeOsAppId> = {
  text: 'viewer_text',
  image: 'viewer_image',
  video: 'viewer_video',
  project: 'viewer_project',
  contact: 'viewer_contact',
  game: 'viewer_game',
};

const VIEWER_SIZE_BY_KIND: Record<MeOsViewerKind, { width: number; height: number }> = {
  text: { width: 560, height: 390 },
  image: { width: 620, height: 400 },
  video: { width: 740, height: 460 },
  project: { width: 560, height: 360 },
  contact: { width: 500, height: 340 },
  game: { width: 540, height: 640 },
};

const INFO_WINDOW_RECT = { x: 88, y: 72, width: 340, height: 260 };

type LegacyAppId = MeOsAppId | 'file' | 'about' | 'projects' | 'media' | 'fileman';

type LegacyWindow = Omit<MeOsWindow, 'appId'> & {
  appId: LegacyAppId;
};

const createDefaultWindows = (): MeOsWindow[] => [];

const asNumber = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const isLegacyAppId = (value: unknown): value is LegacyAppId => (
  value === 'folder'
  || value === 'info'
  || value === 'viewer_text'
  || value === 'viewer_image'
  || value === 'viewer_video'
  || value === 'viewer_project'
  || value === 'viewer_contact'
  || value === 'viewer_game'
  || value === 'file'
  || value === 'about'
  || value === 'projects'
  || value === 'media'
  || value === 'fileman'
);

const normalizeWindowId = (raw: string, fallback: string): string => raw.trim() || fallback;

const getMaxZ = (windows: MeOsWindow[]): number => windows.reduce((max, w) => Math.max(max, w.zIndex), 1);

const sortByZ = (windows: MeOsWindow[]): MeOsWindow[] => [...windows].sort((a, b) => a.zIndex - b.zIndex);

const getSpawnViewport = (): { width: number; height: number } => {
  if (typeof window === 'undefined') {
    return { width: 1080, height: 620 };
  }
  return {
    width: Math.max(320, window.innerWidth - VIEWPORT_GUTTER_X),
    height: Math.max(240, window.innerHeight - STATUS_BAR_HEIGHT - VIEWPORT_GUTTER_Y),
  };
};

const clampWindowSize = (width: number, height: number): { width: number; height: number } => {
  const viewport = getSpawnViewport();
  const maxWidth = Math.max(MIN_WINDOW_WIDTH, viewport.width - SPAWN_MARGIN * 2 - WINDOW_EDGE_BUFFER);
  const maxHeight = Math.max(MIN_WINDOW_HEIGHT, viewport.height - SPAWN_MARGIN * 2 - WINDOW_EDGE_BUFFER);
  return {
    width: Math.min(Math.max(MIN_WINDOW_WIDTH, width), maxWidth),
    height: Math.min(Math.max(MIN_WINDOW_HEIGHT, height), maxHeight),
  };
};

const clampWindowPosition = (x: number, y: number, width: number, height: number): { x: number; y: number } => {
  const viewport = getSpawnViewport();
  const maxX = Math.max(SPAWN_MARGIN, viewport.width - width - SPAWN_MARGIN - WINDOW_EDGE_BUFFER);
  const maxY = Math.max(SPAWN_MARGIN, viewport.height - height - SPAWN_MARGIN - WINDOW_EDGE_BUFFER);
  return {
    x: Math.min(Math.max(SPAWN_MARGIN, x), maxX),
    y: Math.min(Math.max(SPAWN_MARGIN, y), maxY),
  };
};

const normalizeWindowRect = (args: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { x: number; y: number; width: number; height: number } => {
  const size = clampWindowSize(args.width, args.height);
  const pos = clampWindowPosition(args.x, args.y, size.width, size.height);
  return {
    x: pos.x,
    y: pos.y,
    width: size.width,
    height: size.height,
  };
};

const getCascadeOffset = (windows: MeOsWindow[]): number => Math.min(SPAWN_CASCADE_MAX, windows.length * SPAWN_CASCADE_STEP);

const withRect = (win: MeOsWindow): MeOsWindow => ({
  ...win,
  ...normalizeWindowRect(win),
  restoreRect: win.restoreRect ? normalizeWindowRect(win.restoreRect) : undefined,
});

const dedupeWindows = (windows: MeOsWindow[]): MeOsWindow[] => {
  const byId = new Map<string, MeOsWindow>();
  for (const win of sortByZ(windows)) {
    byId.set(win.id, win);
  }
  return sortByZ([...byId.values()]);
};

export const getFolderWindowId = (nodeId: string): string => `folder_${nodeId}`;
export const getViewerWindowId = (nodeId: string): string => `viewer_${nodeId}`;
export const getInfoWindowId = (args: { nodeId: string; desktopEntryId?: MeOsDesktopEntryId }): string => (
  args.desktopEntryId ? `info_entry_${args.desktopEntryId}` : `info_node_${args.nodeId}`
);

const getViewerKindForNode = (node: VfsNode): MeOsViewerKind => (
  node.kind === 'image'
  || node.kind === 'video'
  || node.kind === 'project'
  || node.kind === 'contact'
  || node.kind === 'game'
    ? node.kind
    : 'text'
);

const sortSurfaceNodes = (entries: VfsNode[]): VfsNode[] => [...entries].sort((a, b) => {
  if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
  return a.name.localeCompare(b.name);
});

const getFolderRectForNode = (nodeId: string): { x: number; y: number; width: number; height: number } => (
  FOLDER_WINDOW_RECTS[nodeId] ?? { x: 120, y: 80, width: 540, height: 360 }
);

const createFolderWindow = (node: VfsNode, zIndex: number, existingWindows: MeOsWindow[]): MeOsWindow => {
  const offset = getCascadeOffset(existingWindows);
  const baseRect = getFolderRectForNode(node.id);
  const rect = normalizeWindowRect({
    x: baseRect.x + offset,
    y: baseRect.y + offset,
    width: baseRect.width,
    height: baseRect.height,
  });
  return {
    id: getFolderWindowId(node.id),
    title: node.name,
    appId: 'folder',
    nodeId: node.id,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    zIndex,
    minimized: false,
    maximized: false,
  };
};

const createViewerWindow = (node: VfsNode, zIndex: number, existingWindows: MeOsWindow[]): MeOsWindow => {
  const kind = getViewerKindForNode(node);
  const offset = getCascadeOffset(existingWindows);
  const size = VIEWER_SIZE_BY_KIND[kind];
  const rect = normalizeWindowRect({
    x: 120 + offset,
    y: 80 + offset,
    width: size.width,
    height: size.height,
  });
  return {
    id: getViewerWindowId(node.id),
    title: node.name,
    appId: VIEWER_APP_BY_KIND[kind],
    nodeId: node.id,
    viewerKind: kind,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    zIndex,
    minimized: false,
    maximized: false,
  };
};

const createInfoWindow = (args: {
  nodeId: string;
  label: string;
  desktopEntryId?: MeOsDesktopEntryId;
  zIndex: number;
  existingWindows: MeOsWindow[];
}): MeOsWindow => {
  const offset = getCascadeOffset(args.existingWindows);
  const rect = normalizeWindowRect({
    x: INFO_WINDOW_RECT.x + offset,
    y: INFO_WINDOW_RECT.y + offset,
    width: INFO_WINDOW_RECT.width,
    height: INFO_WINDOW_RECT.height,
  });
  return {
    id: getInfoWindowId({ nodeId: args.nodeId, desktopEntryId: args.desktopEntryId }),
    title: `${args.label} Info`,
    appId: 'info',
    nodeId: args.nodeId,
    desktopEntryId: args.desktopEntryId,
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    zIndex: args.zIndex,
    minimized: false,
    maximized: false,
  };
};

const sanitizeWindow = (raw: unknown): LegacyWindow | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (!isLegacyAppId(data.appId)) return null;
  const id = normalizeWindowId(typeof data.id === 'string' ? data.id : '', `legacy_${String(data.appId)}`);
  const title = typeof data.title === 'string' ? data.title : '';
  const persistedState = sanitizePersistedWindowState({
    maximized: data.maximized,
    restoreRect: data.restoreRect,
  });
  const desktopEntryId = (
    data.desktopEntryId === 'home'
    || data.desktopEntryId === 'projects'
    || data.desktopEntryId === 'media'
    || data.desktopEntryId === 'about'
    || data.desktopEntryId === 'contact'
    || data.desktopEntryId === 'archive'
    || data.desktopEntryId === 'readme'
  ) ? data.desktopEntryId : undefined;
  const viewerKind = (
    data.viewerKind === 'text'
    || data.viewerKind === 'image'
    || data.viewerKind === 'video'
    || data.viewerKind === 'project'
    || data.viewerKind === 'contact'
    || data.viewerKind === 'game'
  ) ? data.viewerKind : undefined;

  return {
    id,
    title,
    appId: data.appId,
    x: asNumber(data.x, 24),
    y: asNumber(data.y, 24),
    width: Math.max(MIN_WINDOW_WIDTH, asNumber(data.width, 420)),
    height: Math.max(MIN_WINDOW_HEIGHT, asNumber(data.height, 240)),
    zIndex: Math.max(1, asNumber(data.zIndex, 1)),
    minimized: Boolean(data.minimized),
    maximized: persistedState.maximized,
    restoreRect: persistedState.restoreRect,
    nodeId: typeof data.nodeId === 'string' ? data.nodeId : undefined,
    viewerKind,
    desktopEntryId,
  };
};

export const migratePersistedWindows = (windows: LegacyWindow[], nodes: Record<string, VfsNode>): MeOsWindow[] => {
  const migrated = windows
    .map((win): MeOsWindow | null => {
      const legacyNodeId = win.appId === 'file' || win.appId === 'fileman'
        ? HOME_ID
        : win.appId === 'projects'
          ? PROJECTS_ID
          : win.appId === 'media'
            ? MEDIA_ID
            : win.appId === 'about'
              ? ABOUT_DOC_ID
              : win.nodeId;

      if ((win.appId === 'folder' || win.appId === 'file' || win.appId === 'fileman' || win.appId === 'projects' || win.appId === 'media')) {
        if (!legacyNodeId || nodes[legacyNodeId]?.type !== 'folder') return null;
        const node = nodes[legacyNodeId];
        return withRect({
          ...win,
          id: getFolderWindowId(node.id),
          title: node.name,
          appId: 'folder',
          nodeId: node.id,
          viewerKind: undefined,
          desktopEntryId: undefined,
        });
      }

      if (win.appId === 'info') {
        return withRect({
          ...win,
          id: getInfoWindowId({ nodeId: win.nodeId ?? HOME_ID, desktopEntryId: win.desktopEntryId }),
          appId: 'info',
        });
      }

      if (!legacyNodeId || nodes[legacyNodeId]?.type !== 'file') return null;
      const node = nodes[legacyNodeId];
      const viewerKind = getViewerKindForNode(node);
      return withRect({
        ...win,
        id: getViewerWindowId(node.id),
        title: node.name,
        appId: VIEWER_APP_BY_KIND[viewerKind],
        nodeId: node.id,
        viewerKind,
        desktopEntryId: undefined,
      });
    })
    .filter((win): win is MeOsWindow => win != null);

  return dedupeWindows(migrated);
};

type LoadedShellState = {
  windows: MeOsWindow[];
  surfaceItemOrder: Record<string, string[]>;
};

const resolveDefaultSurfaceIds = (surfaceKey: MeOsSurfaceKey, vfsService: ReturnType<typeof getMeOsVfsService>): string[] => {
  if (surfaceKey === 'desktop') {
    return createDesktopEntries(vfsService.getSnapshot()).map((entry) => entry.id);
  }
  if (!surfaceKey.startsWith('folder:')) return [];
  const folderId = surfaceKey.slice('folder:'.length);
  return sortSurfaceNodes(vfsService.listChildren(folderId)).map((node) => node.id);
};

const loadPersistedShellState = (): LoadedShellState => {
  const snapshot = getItemSafe<
    MeOsPersistedSnapshot | { version: 1 | 2; windows: unknown[]; surfaceItemOrder?: unknown } | null
  >(STORAGE_KEY, null);
  if (!snapshot || !Array.isArray(snapshot.windows)) {
    return {
      windows: createDefaultWindows(),
      surfaceItemOrder: {},
    };
  }
  const parsed = snapshot.windows
    .map(sanitizeWindow)
    .filter((win): win is LegacyWindow => win != null);
  const surfaceItemOrder = sanitizeSurfaceItemOrder((snapshot as { surfaceItemOrder?: unknown }).surfaceItemOrder);
  if (parsed.length === 0) {
    return {
      windows: createDefaultWindows(),
      surfaceItemOrder,
    };
  }
  const vfsSnapshot = getMeOsVfsService().getSnapshot();
  return {
    windows: migratePersistedWindows(parsed, vfsSnapshot.nodes),
    surfaceItemOrder,
  };
};

type MeOsContextValue = {
  displayMode: MeOsDisplayMode;
  windows: MeOsWindow[];
  activeScope: MeOsActiveScope;
  setActiveScope: (scope: MeOsActiveScope) => void;
  featuredPanel: MeOsShellScope;
  setFeaturedPanel: (scope: MeOsShellScope) => void;
  openFullscreen: () => void;
  closeFullscreen: () => void;
  openNode: (nodeId: string) => void;
  openFolder: (nodeId: string) => void;
  openInfo: (args: { nodeId: string; desktopEntryId?: MeOsDesktopEntryId; label: string }) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, args: { width: number; height: number; x?: number; y?: number }) => void;
  toggleMaximizeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  closeWindow: (id: string) => void;
  getSurfaceItemOrder: <T extends string>(surfaceKey: MeOsSurfaceKey, defaultIds: readonly T[]) => T[];
  reorderSurfaceItem: (surfaceKey: MeOsSurfaceKey, itemId: string, toIndex: number) => void;
};

const MeOsContext = createContext<MeOsContextValue | null>(null);

export const MeOsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const vfsService = useMemo(() => getMeOsVfsService(), []);
  const initialShellState = useMemo(() => loadPersistedShellState(), []);
  const [displayMode, setDisplayMode] = useState<MeOsDisplayMode>('panel');
  const [windows, setWindows] = useState<MeOsWindow[]>(() => initialShellState.windows);
  const [surfaceItemOrder, setSurfaceItemOrder] = useState<Record<string, string[]>>(
    () => initialShellState.surfaceItemOrder
  );
  const [activeScope, setActiveScopeState] = useState<MeOsActiveScope>(null);
  const [featuredPanel, setFeaturedPanelState] = useState<MeOsShellScope>('me');
  const zRef = useRef<number>(getMaxZ(windows));

  useEffect(() => {
    zRef.current = getMaxZ(windows);
    setItemSafe<MeOsPersistedSnapshot>(STORAGE_KEY, {
      version: STORAGE_VERSION,
      windows,
      surfaceItemOrder,
    });
  }, [surfaceItemOrder, windows]);

  useEffect(() => {
    const onResize = () => {
      setWindows((prev) => prev.map((win) => withRect(win)));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setActiveScope = useCallback((scope: MeOsActiveScope) => {
    setActiveScopeState(scope);
  }, []);

  const setFeaturedPanel = useCallback((scope: MeOsShellScope) => {
    setFeaturedPanelState(scope);
  }, []);

  const openFullscreen = useCallback(() => {
    setDisplayMode('fullscreen');
    setActiveScopeState(null);
  }, []);

  const closeFullscreen = useCallback(() => setDisplayMode('panel'), []);

  const bringToFront = useCallback((id: string) => {
    setWindows((prev) => {
      if (!prev.some((win) => win.id === id)) return prev;
      const nextZ = zRef.current + 1;
      zRef.current = nextZ;
      return prev.map((win) => (win.id === id ? { ...win, zIndex: nextZ, minimized: false } : win));
    });
  }, []);

  const focusWindow = useCallback((id: string) => {
    bringToFront(id);
  }, [bringToFront]);

  const openFolder = useCallback((nodeId: string) => {
    const node = vfsService.getNode(nodeId);
    if (!node || node.type !== 'folder') return;
    const windowId = getFolderWindowId(node.id);
    setWindows((prev) => {
      const existing = prev.find((win) => win.id === windowId);
      const nextZ = zRef.current + 1;
      zRef.current = nextZ;
      if (existing) {
        return prev.map((win) => (
          win.id === windowId
            ? { ...win, title: node.name, zIndex: nextZ, minimized: false, nodeId: node.id }
            : win
        ));
      }
      return [...prev, createFolderWindow(node, nextZ, prev)];
    });
  }, [vfsService]);

  const openNode = useCallback((nodeId: string) => {
    const node = vfsService.getNode(nodeId);
    if (!node) return;
    if (node.type === 'folder') {
      openFolder(node.id);
      return;
    }

    const viewerKind = getViewerKindForNode(node);
    const windowId = getViewerWindowId(node.id);
    const viewerSize = VIEWER_SIZE_BY_KIND[viewerKind];
    setWindows((prev) => {
      const existing = prev.find((win) => win.id === windowId);
      const nextZ = zRef.current + 1;
      zRef.current = nextZ;
      if (existing) {
        return prev.map((win) => (
          win.id === windowId
            ? {
              ...win,
              title: node.name,
              appId: VIEWER_APP_BY_KIND[viewerKind],
              nodeId: node.id,
              viewerKind,
              zIndex: nextZ,
              minimized: false,
              width: Math.max(existing.width, viewerSize.width),
              height: Math.max(existing.height, viewerSize.height),
            }
            : win
        ));
      }
      return [...prev, createViewerWindow(node, nextZ, prev)];
    });
  }, [openFolder, vfsService]);

  const openInfo = useCallback((args: { nodeId: string; desktopEntryId?: MeOsDesktopEntryId; label: string }) => {
    const node = vfsService.getNode(args.nodeId);
    if (!node) return;
    const windowId = getInfoWindowId({ nodeId: args.nodeId, desktopEntryId: args.desktopEntryId });
    setWindows((prev) => {
      const existing = prev.find((win) => win.id === windowId);
      const nextZ = zRef.current + 1;
      zRef.current = nextZ;
      if (existing) {
        return prev.map((win) => (
          win.id === windowId
            ? {
              ...win,
              title: `${args.label} Info`,
              nodeId: args.nodeId,
              desktopEntryId: args.desktopEntryId,
              zIndex: nextZ,
              minimized: false,
            }
            : win
        ));
      }
      return [...prev, createInfoWindow({ ...args, zIndex: nextZ, existingWindows: prev })];
    });
  }, [vfsService]);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) => prev.map((win) => (
      win.id === id && !win.maximized ? { ...win, ...normalizeWindowRect({ ...win, x, y }) } : win
    )));
  }, []);

  const resizeWindow = useCallback((id: string, args: { width: number; height: number; x?: number; y?: number }) => {
    setWindows((prev) => prev.map((win) => (
      win.id === id && !win.maximized
        ? {
          ...win,
          ...normalizeWindowRect({
            ...win,
            width: args.width,
            height: args.height,
            x: args.x ?? win.x,
            y: args.y ?? win.y,
          }),
        }
        : win
    )));
  }, []);

  const toggleMaximizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((win) => {
      if (win.id !== id) return win;

      const nextZ = zRef.current + 1;
      zRef.current = nextZ;
      const currentRect: MeOsWindowRect = normalizeWindowRect({
        x: win.x,
        y: win.y,
        width: win.width,
        height: win.height,
      });
      const toggled = toggleWindowMaximize(
        { ...win, ...currentRect },
        currentRect
      );

      if (toggled.maximized) {
        return {
          ...toggled,
          ...currentRect,
          zIndex: nextZ,
          minimized: false,
        };
      }

      const restoredRect = normalizeWindowRect({
        x: toggled.x,
        y: toggled.y,
        width: toggled.width,
        height: toggled.height,
      });
      return {
        ...toggled,
        ...restoredRect,
        zIndex: nextZ,
        minimized: false,
      };
    }));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((win) => (win.id === id ? { ...win, minimized: true } : win)));
  }, []);

  const restoreWindow = useCallback((id: string) => {
    bringToFront(id);
  }, [bringToFront]);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const closingWindow = prev.find((win) => win.id === id);
      if (closingWindow?.appId === 'viewer_game') {
        clearSnakeGameSession(id);
      }
      const next = prev.filter((win) => win.id !== id);
      if (next.length === 0) zRef.current = 1;
      return next;
    });
  }, []);

  const getSurfaceItemOrder = useCallback(<T extends string>(surfaceKey: MeOsSurfaceKey, defaultIds: readonly T[]) => (
    resolveSurfaceItemOrder(defaultIds, surfaceItemOrder[surfaceKey])
  ), [surfaceItemOrder]);

  const reorderSurfaceItem = useCallback((surfaceKey: MeOsSurfaceKey, itemId: string, toIndex: number) => {
    setSurfaceItemOrder((prev) => {
      const defaultIds = resolveDefaultSurfaceIds(surfaceKey, vfsService);
      const current = resolveSurfaceItemOrder(defaultIds, prev[surfaceKey]);
      const nextOrder = reorderSurfaceItemOrder(current, itemId, toIndex);
      const existing = prev[surfaceKey] ?? [];
      if (
        existing.length === nextOrder.length
        && existing.every((id, index) => id === nextOrder[index])
      ) {
        return prev;
      }
      return {
        ...prev,
        [surfaceKey]: nextOrder,
      };
    });
  }, [vfsService]);

  const value = useMemo<MeOsContextValue>(() => ({
    displayMode,
    windows,
    activeScope,
    setActiveScope,
    featuredPanel,
    setFeaturedPanel,
    openFullscreen,
    closeFullscreen,
    openNode,
    openFolder,
    openInfo,
    focusWindow,
    moveWindow,
    resizeWindow,
    toggleMaximizeWindow,
    minimizeWindow,
    restoreWindow,
    closeWindow,
    getSurfaceItemOrder,
    reorderSurfaceItem,
  }), [
    activeScope,
    closeFullscreen,
    closeWindow,
    displayMode,
    featuredPanel,
    focusWindow,
    getSurfaceItemOrder,
    minimizeWindow,
    moveWindow,
    openFolder,
    openFullscreen,
    openInfo,
    openNode,
    reorderSurfaceItem,
    resizeWindow,
    restoreWindow,
    setActiveScope,
    setFeaturedPanel,
    toggleMaximizeWindow,
    windows,
  ]);

  return <MeOsContext.Provider value={value}>{children}</MeOsContext.Provider>;
};

export const useMeOs = (): MeOsContextValue => {
  const ctx = useContext(MeOsContext);
  if (!ctx) throw new Error('useMeOs must be used within <MeOsProvider>.');
  return ctx;
};
