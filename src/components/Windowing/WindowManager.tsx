import React, { createContext, useCallback, useMemo, useRef, useState } from 'react';
import type { WindowId, WindowManagerContextValue, WindowState } from './WindowTypes';
import { Window } from './Window';
// import { Dock } from './Dock';

export const WindowManagerContext = createContext<WindowManagerContextValue | null>(null);

let idCounter = 0;
const nextId = (): WindowId => `win_${++idCounter}`;

export const WindowManagerProvider: React.FC<{ children: React.ReactNode }>
  = ({ children }) => {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const zRef = useRef(1);
  const boundsRef = useRef<HTMLDivElement | null>(null);

  const focusWindow = useCallback((id: WindowId) => {
    setWindows(ws => ws.map(w => w.id === id ? { ...w, zIndex: ++zRef.current } : w));
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
    setWindows(ws => [...ws, newWin]);
    return id;
  }, []);

  const closeWindow = useCallback((id: WindowId) => {
    setWindows(ws => ws.filter(w => w.id !== id));
  }, []);

  const moveWindow = useCallback((id: WindowId, x: number, y: number) => {
    setWindows(ws => ws.map(w => w.id === id ? { ...w, rect: { ...w.rect, x, y } } : w));
  }, []);

  const resizeWindow = useCallback((id: WindowId, width: number, height: number) => {
    setWindows(ws => ws.map(w => w.id === id ? { ...w, rect: { ...w.rect, width, height } } : w));
  }, []);

  const toggleMaximize = useCallback((id: WindowId) => {
    setWindows(ws => ws.map(w => w.id === id ? { ...w, maximized: !w.maximized, minimized: false } : w));
  }, []);

  const minimizeWindow = useCallback((id: WindowId) => {
    setWindows(ws => ws.map(w => w.id === id ? { ...w, minimized: true, maximized: false } : w));
  }, []);

  const restoreWindow = useCallback((id: WindowId) => {
    setWindows(ws => ws.map(w => w.id === id ? { ...w, minimized: false } : w));
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


