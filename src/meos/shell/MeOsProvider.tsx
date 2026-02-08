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

const WINDOW_TEMPLATES: Record<MeOsFixedAppId, MeOsWindowTemplate> = {
  home: {
    id: 'meos_home',
    title: 'HOME.EXE',
    appId: 'home',
    x: 36,
    y: 30,
    width: 560,
    height: 360,
  },
  fileman: {
    id: 'meos_fileman',
    title: 'FILEMAN.EXE',
    appId: 'fileman',
    x: 72,
    y: 48,
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
  { ...WINDOW_TEMPLATES.home, zIndex: 1, minimized: false },
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
  const appId = data.appId;
  if (
    appId !== 'home'
    && appId !== 'fileman'
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

const ensureHomeWindow = (windows: MeOsWindow[]): MeOsWindow[] => {
  const hasHome = windows.some((w) => w.appId === 'home');
  if (hasHome) return windows;
  const maxZ = getMaxZ(windows);
  return [...windows, { ...WINDOW_TEMPLATES.home, zIndex: maxZ + 1, minimized: false }];
};

const loadPersistedWindows = (): MeOsWindow[] => {
  const snapshot = getItemSafe<MeOsPersistedSnapshot | null>(STORAGE_KEY, null);
  if (!snapshot || snapshot.version !== STORAGE_VERSION || !Array.isArray(snapshot.windows)) {
    return createDefaultWindows();
  }
  const parsed = snapshot.windows
    .map(sanitizeWindow)
    .filter((w): w is MeOsWindow => w != null);
  if (parsed.length === 0) return createDefaultWindows();
  return ensureHomeWindow(sortByZ(parsed));
};

type MeOsContextValue = {
  displayMode: MeOsDisplayMode;
  windows: MeOsWindow[];
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
  const zRef = useRef<number>(getMaxZ(windows));

  useEffect(() => {
    zRef.current = getMaxZ(windows);
    setItemSafe<MeOsPersistedSnapshot>(STORAGE_KEY, {
      version: STORAGE_VERSION,
      windows,
    });
  }, [windows]);

  const openFullscreen = useCallback(() => setDisplayMode('fullscreen'), []);
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
        return prev.map((w) => (w.id === template.id ? { ...w, zIndex: nextZ, minimized: false } : w));
      }
      const nextZ = zRef.current + 1;
      zRef.current = nextZ;
      const next: MeOsWindow = {
        ...template,
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
      const offset = Math.min(120, prev.length * 18);
      const next: MeOsWindow = {
        id: viewerId,
        title,
        appId: viewerAppId,
        x: 120 + offset,
        y: 80 + offset,
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
      if (next.length === 0) {
        zRef.current = 1;
        return createDefaultWindows();
      }
      return next;
    });
  }, []);

  const value = useMemo<MeOsContextValue>(() => ({
    displayMode,
    windows,
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
    displayMode,
    focusWindow,
    minimizeWindow,
    moveWindow,
    openApp,
    openViewer,
    openFullscreen,
    restoreWindow,
    windows,
  ]);

  return <MeOsContext.Provider value={value}>{children}</MeOsContext.Provider>;
};

export const useMeOs = (): MeOsContextValue => {
  const ctx = useContext(MeOsContext);
  if (!ctx) throw new Error('useMeOs must be used within <MeOsProvider>.');
  return ctx;
};
