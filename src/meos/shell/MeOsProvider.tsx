/**
 * ME.OS shell state provider.
 *
 * Responsibilities:
 * - Manage panel/fullscreen display mode.
 * - Manage internal ME.OS windows (open/focus/move/minimize/close/restore).
 * - Open fixed apps and dynamic viewer windows.
 * - Persist shell window state to a namespaced versioned key.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getItemSafe, setItemSafe } from '../../utils/storage';
import type {
  MeOsAppId,
  MeOsDisplayMode,
  MeOsFixedAppId,
  MeOsPersistedSnapshot,
  MeOsViewerKind,
  MeOsWindow,
  MeOsWindowTemplate,
} from './types';

const STORAGE_KEY = 'terminalOS.meos.v1.shell';
const STORAGE_VERSION = 1 as const;
const STATUS_BAR_HEIGHT = 28;
const SPAWN_MARGIN = 12;
const SPAWN_CASCADE_STEP = 18;
const SPAWN_CASCADE_MAX = 126;
const MIN_VISIBLE_HEADER_WIDTH = 200;
const MIN_VISIBLE_HEADER_HEIGHT = 56;

const WINDOW_TEMPLATES: Record<MeOsFixedAppId, MeOsWindowTemplate> = {
  file: {
    id: 'meos_fileman',
    title: 'FILE.EXE',
    appId: 'file',
    x: 36,
    y: 30,
    width: 700,
    height: 430,
  },
  about: {
    id: 'meos_about',
    title: 'ABOUT.TXT',
    appId: 'about',
    x: 120,
    y: 70,
    width: 430,
    height: 280,
  },
  projects: {
    id: 'meos_projects',
    title: 'PROJECTS.DIR',
    appId: 'projects',
    x: 160,
    y: 90,
    width: 470,
    height: 300,
  },
  media: {
    id: 'meos_media',
    title: 'MEDIA.DIR',
    appId: 'media',
    x: 210,
    y: 120,
    width: 480,
    height: 300,
  },
};

const createDefaultWindows = (): MeOsWindow[] => [
  // Start with a clean desktop surface; windows open on demand.
];

const VIEWER_APP_BY_KIND: Record<MeOsViewerKind, MeOsAppId> = {
  text: 'viewer_text',
  image: 'viewer_image',
  video: 'viewer_video',
  project: 'viewer_project',
};

const asNumber = (value: unknown, fallback: number): number => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

const sanitizeWindow = (raw: unknown): MeOsWindow | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const rawAppId = data.appId;
  const appId = rawAppId === 'fileman' ? 'file' : rawAppId;
  if (
    appId !== 'file'
    && appId !== 'about'
    && appId !== 'projects'
    && appId !== 'media'
    && appId !== 'viewer_text'
    && appId !== 'viewer_image'
    && appId !== 'viewer_video'
    && appId !== 'viewer_project'
  ) return null;
  const id = typeof data.id === 'string' ? data.id : '';
  const title = typeof data.title === 'string' ? data.title : '';
  if (!id || !title) return null;
  const nodeId = typeof data.nodeId === 'string' ? data.nodeId : undefined;
  const viewerKind = (
    data.viewerKind === 'text'
    || data.viewerKind === 'image'
    || data.viewerKind === 'video'
    || data.viewerKind === 'project'
  ) ? data.viewerKind : undefined;
  return {
    id,
    title,
    appId,
    x: asNumber(data.x, 24),
    y: asNumber(data.y, 24),
    width: Math.max(260, asNumber(data.width, 420)),
    height: Math.max(180, asNumber(data.height, 240)),
    zIndex: Math.max(1, asNumber(data.zIndex, 1)),
    minimized: Boolean(data.minimized),
    nodeId,
    viewerKind,
  };
};

const sortByZ = (windows: MeOsWindow[]): MeOsWindow[] => [...windows].sort((a, b) => a.zIndex - b.zIndex);

const getMaxZ = (windows: MeOsWindow[]): number => windows.reduce((max, w) => Math.max(max, w.zIndex), 1);

const loadPersistedWindows = (): MeOsWindow[] => {
  const snapshot = getItemSafe<MeOsPersistedSnapshot | null>(STORAGE_KEY, null);
  if (!snapshot || snapshot.version !== STORAGE_VERSION || !Array.isArray(snapshot.windows)) {
    return createDefaultWindows();
  }
  const parsed = snapshot.windows
    .map(sanitizeWindow)
    .filter((w): w is MeOsWindow => w != null);
  if (parsed.length === 0) return createDefaultWindows();
  return sortByZ(parsed);
};

const getSpawnViewport = (): { width: number; height: number } => {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 720 };
  }
  return {
    width: Math.max(320, window.innerWidth),
    height: Math.max(240, window.innerHeight - STATUS_BAR_HEIGHT),
  };
};

const clampSpawnPosition = (x: number, y: number): { x: number; y: number } => {
  const viewport = getSpawnViewport();
  const maxX = Math.max(SPAWN_MARGIN, viewport.width - MIN_VISIBLE_HEADER_WIDTH);
  const maxY = Math.max(SPAWN_MARGIN, viewport.height - MIN_VISIBLE_HEADER_HEIGHT);
  return {
    x: Math.min(Math.max(SPAWN_MARGIN, x), maxX),
    y: Math.min(Math.max(SPAWN_MARGIN, y), maxY),
  };
};

const getCascadeOffset = (windows: MeOsWindow[]): number => Math.min(SPAWN_CASCADE_MAX, windows.length * SPAWN_CASCADE_STEP);

type MeOsContextValue = {
  displayMode: MeOsDisplayMode;
  windows: MeOsWindow[];
  activeScope: 'you' | 'third' | 'connect' | null;
  setActiveScope: (scope: 'you' | 'third' | 'connect' | null) => void;
  openFullscreen: () => void;
  closeFullscreen: () => void;
  openApp: (appId: MeOsFixedAppId) => void;
  openViewer: (args: { nodeId: string; title: string; kind: MeOsViewerKind }) => void;
  focusWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  minimizeWindow: (id: string) => void;
  restoreWindow: (id: string) => void;
  closeWindow: (id: string) => void;
};

const MeOsContext = createContext<MeOsContextValue | null>(null);

export const MeOsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [displayMode, setDisplayMode] = useState<MeOsDisplayMode>('panel');
  const [windows, setWindows] = useState<MeOsWindow[]>(() => loadPersistedWindows());
  const [activeScope, setActiveScopeState] = useState<'you' | 'third' | 'connect' | null>(null);
  const zRef = useRef<number>(getMaxZ(windows));

  useEffect(() => {
    zRef.current = getMaxZ(windows);
    setItemSafe<MeOsPersistedSnapshot>(STORAGE_KEY, {
      version: STORAGE_VERSION,
      windows,
    });
  }, [windows]);

  const setActiveScope = useCallback((scope: 'you' | 'third' | 'connect' | null) => {
    setActiveScopeState(scope);
  }, []);

  const openFullscreen = useCallback(() => {
    setDisplayMode('fullscreen');
    setActiveScopeState(null);
  }, []);
  const closeFullscreen = useCallback(() => setDisplayMode('panel'), []);

  const bringToFront = useCallback((id: string) => {
    setWindows((prev) => {
      if (!prev.some((w) => w.id === id)) return prev;
      const nextZ = zRef.current + 1;
      zRef.current = nextZ;
      return prev.map((w) => (w.id === id ? { ...w, zIndex: nextZ, minimized: false } : w));
    });
  }, []);

  const focusWindow = useCallback((id: string) => {
    bringToFront(id);
  }, [bringToFront]);

  const openApp = useCallback((appId: MeOsFixedAppId) => {
    const template = WINDOW_TEMPLATES[appId];
    setWindows((prev) => {
      const existing = prev.find((w) => w.id === template.id);
      if (existing) {
        const nextZ = zRef.current + 1;
        zRef.current = nextZ;
        return prev.map((w) => (
          w.id === template.id
            ? {
              ...w,
              zIndex: nextZ,
              minimized: false,
              x: appId === 'file' ? template.x : w.x,
              y: appId === 'file' ? template.y : w.y,
            }
            : w
        ));
      }
      const nextZ = zRef.current + 1;
      zRef.current = nextZ;
      const offset = getCascadeOffset(prev);
      const spawn = clampSpawnPosition(template.x + offset, template.y + offset);
      const next: MeOsWindow = {
        ...template,
        x: spawn.x,
        y: spawn.y,
        zIndex: nextZ,
        minimized: false,
      };
      return [...prev, next];
    });
  }, []);

  const openViewer = useCallback((args: { nodeId: string; title: string; kind: MeOsViewerKind }) => {
    const { nodeId, title, kind } = args;
    const viewerId = `viewer_${nodeId}`;
    const viewerAppId = VIEWER_APP_BY_KIND[kind];
    setWindows((prev) => {
      const existing = prev.find((w) => w.id === viewerId);
      if (existing) {
        const nextZ = zRef.current + 1;
        zRef.current = nextZ;
        return prev.map((w) => (
          w.id === viewerId
            ? {
              ...w,
              zIndex: nextZ,
              minimized: false,
              title,
              appId: viewerAppId,
              nodeId,
              viewerKind: kind,
            }
            : w
        ));
      }

      const nextZ = zRef.current + 1;
      zRef.current = nextZ;
      const offset = getCascadeOffset(prev);
      const spawn = clampSpawnPosition(120 + offset, 80 + offset);
      const next: MeOsWindow = {
        id: viewerId,
        title,
        appId: viewerAppId,
        x: spawn.x,
        y: spawn.y,
        width: 560,
        height: 360,
        zIndex: nextZ,
        minimized: false,
        nodeId,
        viewerKind: kind,
      };
      return [...prev, next];
    });
  }, []);

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) => prev.map((w) => (
      w.id === id
        ? { ...w, x: Math.max(0, x), y: Math.max(0, y) }
        : w
    )));
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)));
  }, []);

  const restoreWindow = useCallback((id: string) => {
    bringToFront(id);
  }, [bringToFront]);

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => {
      const next = prev.filter((w) => w.id !== id);
      if (next.length === 0) zRef.current = 1;
      return next;
    });
  }, []);

  const value = useMemo<MeOsContextValue>(() => ({
    displayMode,
    windows,
    activeScope,
    setActiveScope,
    openFullscreen,
    closeFullscreen,
    openApp,
    openViewer,
    focusWindow,
    moveWindow,
    minimizeWindow,
    restoreWindow,
    closeWindow,
  }), [
    closeFullscreen,
    closeWindow,
    activeScope,
    displayMode,
    focusWindow,
    minimizeWindow,
    moveWindow,
    openApp,
    openViewer,
    openFullscreen,
    restoreWindow,
    setActiveScope,
    windows,
  ]);

  return <MeOsContext.Provider value={value}>{children}</MeOsContext.Provider>;
};

export const useMeOs = (): MeOsContextValue => {
  const ctx = useContext(MeOsContext);
  if (!ctx) throw new Error('useMeOs must be used within <MeOsProvider>.');
  return ctx;
};
