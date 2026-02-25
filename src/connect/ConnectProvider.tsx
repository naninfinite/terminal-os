import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type ConnectDisplayMode = 'panel' | 'fullscreen';

type ConnectContextValue = {
  displayMode: ConnectDisplayMode;
  notificationCount: number;
  setNotificationCount: (count: number) => void;
  openFullscreen: () => void;
  closeFullscreen: () => void;
};

const ConnectContext = createContext<ConnectContextValue | null>(null);

export const ConnectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [displayMode, setDisplayMode] = useState<ConnectDisplayMode>('panel');
  const [notificationCount, setNotificationCount] = useState(0);

  const openFullscreen = useCallback(() => setDisplayMode('fullscreen'), []);
  const closeFullscreen = useCallback(() => setDisplayMode('panel'), []);

  const value = useMemo<ConnectContextValue>(() => ({
    displayMode,
    notificationCount,
    setNotificationCount,
    openFullscreen,
    closeFullscreen,
  }), [
    closeFullscreen,
    displayMode,
    notificationCount,
    openFullscreen,
  ]);

  return <ConnectContext.Provider value={value}>{children}</ConnectContext.Provider>;
};

export const useConnectRuntime = (): ConnectContextValue => {
  const ctx = useContext(ConnectContext);
  if (!ctx) throw new Error('useConnectRuntime must be used within <ConnectProvider>.');
  return ctx;
};
