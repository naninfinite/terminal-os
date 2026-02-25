import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type ThirdDisplayMode = 'panel' | 'fullscreen';

export type ThirdRuntimeSnapshot = {
  rotationX: number;
  rotationY: number;
  rotationZ: number;
};

type ThirdContextValue = {
  displayMode: ThirdDisplayMode;
  openFullscreen: () => void;
  closeFullscreen: () => void;
  getSnapshot: () => ThirdRuntimeSnapshot;
  saveSnapshot: (snapshot: ThirdRuntimeSnapshot) => void;
};

const DEFAULT_SNAPSHOT: ThirdRuntimeSnapshot = {
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
};

const ThirdContext = createContext<ThirdContextValue | null>(null);

export const ThirdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [displayMode, setDisplayMode] = useState<ThirdDisplayMode>('panel');
  const snapshotRef = useRef<ThirdRuntimeSnapshot>(DEFAULT_SNAPSHOT);

  const openFullscreen = useCallback(() => setDisplayMode('fullscreen'), []);
  const closeFullscreen = useCallback(() => setDisplayMode('panel'), []);
  const getSnapshot = useCallback((): ThirdRuntimeSnapshot => snapshotRef.current, []);
  const saveSnapshot = useCallback((snapshot: ThirdRuntimeSnapshot) => {
    snapshotRef.current = snapshot;
  }, []);

  const value = useMemo<ThirdContextValue>(() => ({
    displayMode,
    openFullscreen,
    closeFullscreen,
    getSnapshot,
    saveSnapshot,
  }), [
    closeFullscreen,
    displayMode,
    getSnapshot,
    openFullscreen,
    saveSnapshot,
  ]);

  return <ThirdContext.Provider value={value}>{children}</ThirdContext.Provider>;
};

export const useThirdRuntime = (): ThirdContextValue => {
  const ctx = useContext(ThirdContext);
  if (!ctx) throw new Error('useThirdRuntime must be used within <ThirdProvider>.');
  return ctx;
};
