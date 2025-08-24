import type { ReactNode, RefObject } from 'react';
export type WindowId = string;

export type WindowRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type WindowState = {
  id: WindowId;
  title: string;
  rect: WindowRect;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  content: ReactNode;
};

export type WindowManagerContextValue = {
  windows: WindowState[];
  openWindow: (win: Omit<WindowState, 'id' | 'zIndex' | 'minimized' | 'maximized'> & { id?: WindowId }) => WindowId;
  closeWindow: (id: WindowId) => void;
  focusWindow: (id: WindowId) => void;
  moveWindow: (id: WindowId, x: number, y: number) => void;
  resizeWindow: (id: WindowId, width: number, height: number) => void;
  toggleMaximize: (id: WindowId) => void;
  minimizeWindow: (id: WindowId) => void;
  restoreWindow: (id: WindowId) => void;
  boundsRef: RefObject<HTMLDivElement>;
};


