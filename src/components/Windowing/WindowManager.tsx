import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WindowId, WindowManagerContextValue, WindowState } from './WindowTypes';
import { Window } from './Window';
import { getItemSafe, setItemSafe } from '../../utils/storage';

export const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);

let idCounter = 0;
const nextId = (): WindowId => `win_${++idCounter}`;

export const WindowManagerProvider: React.FC<{ children: React.ReactNode }>
  = ({ children }) => {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const zRef = useRef(1);
  const boundsRef = useRef<HTMLDivElement | null>(null);
  const STORAGE_KEY = 'terminal_os_windows_v1';

  // Load persisted windows (simple restore with placeholder content)
  useEffect(() => {
    const stored = getItemSafe<any[]>(STORAGE_KEY, null as any);
    if (stored && Array.isArray(stored)) {
      const restored: WindowState[] = stored.map(s => ({
        id: s.id,
        title: s.title,
        rect: s.rect,
        zIndex: s.zIndex || 1,
        minimized: !!s.minimized,
        maximized: !!s.maximized,
        content: (<div style={{ padding: 8 }}>Restored: {s.title}</div>),
      }));
      setWindows(restored);
      // set zRef to max zIndex so future focuses increase properly
      const maxZ = restored.reduce((m, w) => Math.max(m, w.zIndex || 1), 1);
      zRef.current = maxZ;
    }
  }, []);

  const persist = useCallback((ws: WindowState[]) => {
    try {
      const simple = ws.map(w => ({ id: w.id, title: w.title, rect: w.rect, zIndex: w.zIndex, minimized: w.minimized, maximized: w.maximized }));
      setItemSafe(STORAGE_KEY, simple);
    } catch {}
  }, []);

  const focusWindow = useCallback((id: WindowId) => {
    setWindows(ws => {
      const next = ws.map(w => w.id === id ? { ...w, zIndex: ++zRef.current } : w);
      persist(next);
      return next;
    });
  }, []);

  const openWindow = useCallback<WindowManagerContextValue['openWindow']>((win) => {
    const id = win.id ?? nextId();
    const newWin: WindowState = {
      id,
      title: win.title,
      rect: win.rect,
      zIndex: ++zRef.current,
      minimized: false,
      maximized: false,
      content: win.content,
    };
    setWindows(ws => {
      const next = [...ws, newWin];
      persist(next);
      return next;
    });
    return id;
  }, []);

  const closeWindow = useCallback((id: WindowId) => {
    setWindows(ws => {
      const next = ws.filter(w => w.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const moveWindow = useCallback((id: WindowId, x: number, y: number) => {
    setWindows(ws => {
      const next = ws.map(w => w.id === id ? { ...w, rect: { ...w.rect, x, y } } : w);
      persist(next);
      return next;
    });
  }, []);

  const resizeWindow = useCallback((id: WindowId, width: number, height: number) => {
    setWindows(ws => {
      const next = ws.map(w => w.id === id ? { ...w, rect: { ...w.rect, width, height } } : w);
      persist(next);
      return next;
    });
  }, []);

  const toggleMaximize = useCallback((id: WindowId) => {
    setWindows(ws => {
      const next = ws.map(w => w.id === id ? { ...w, maximized: !w.maximized, minimized: false } : w);
      persist(next);
      return next;
    });
  }, []);

  const minimizeWindow = useCallback((id: WindowId) => {
    setWindows(ws => {
      const next = ws.map(w => w.id === id ? { ...w, minimized: true, maximized: false } : w);
      persist(next);
      return next;
    });
  }, []);

  const restoreWindow = useCallback((id: WindowId) => {
    setWindows(ws => {
      const next = ws.map(w => w.id === id ? { ...w, minimized: false } : w);
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo<WindowManagerContextValue>(() => ({
    windows,
    openWindow,
    closeWindow,
    focusWindow,
    moveWindow,
    resizeWindow,
    toggleMaximize,
    minimizeWindow,
    restoreWindow,
    boundsRef,
  }), [windows, openWindow, closeWindow, focusWindow, moveWindow, resizeWindow, toggleMaximize, minimizeWindow, restoreWindow]);

  return (
    <WindowManagerContext.Provider value={value}>
      <div ref={boundsRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
        {children}
        {windows.map(w => (
          <Window key={w.id} win={w} />
        ))}
      </div>
    </WindowManagerContext.Provider>
  );
};


