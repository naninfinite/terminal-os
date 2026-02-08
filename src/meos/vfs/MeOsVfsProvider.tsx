/**
 * React binding for the ME.OS VFS service.
 * Keeps UI components declarative while filesystem logic remains in the service.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMeOsVfsService } from './service';
import type { VfsFileKind, VfsNode, VfsSnapshot } from './types';

type MeOsVfsContextValue = {
  snapshot: VfsSnapshot;
  listChildren: (parentId: string) => VfsNode[];
  createFolder: (parentId: string, name: string) => VfsNode | null;
  createFile: (parentId: string, name: string, kind?: VfsFileKind) => VfsNode | null;
  rename: (nodeId: string, name: string) => boolean;
  deleteNode: (nodeId: string) => boolean;
  reset: () => void;
};

const MeOsVfsContext = createContext<MeOsVfsContextValue | null>(null);

export const MeOsVfsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const service = useMemo(() => getMeOsVfsService(), []);
  const [snapshot, setSnapshot] = useState<VfsSnapshot>(() => service.getSnapshot());

  useEffect(() => {
    const unsub = service.subscribe(() => setSnapshot(service.getSnapshot()));
    return unsub;
  }, [service]);

  const value = useMemo<MeOsVfsContextValue>(() => ({
    snapshot,
    listChildren: (id) => service.listChildren(id),
    createFolder: (id, name) => service.createFolder(id, name),
    createFile: (id, name, kind) => service.createFile(id, name, kind),
    rename: (id, name) => service.rename(id, name),
    deleteNode: (id) => service.deleteNode(id),
    reset: () => service.reset(),
  }), [service, snapshot]);

  return <MeOsVfsContext.Provider value={value}>{children}</MeOsVfsContext.Provider>;
};

export const useMeOsVfs = (): MeOsVfsContextValue => {
  const ctx = useContext(MeOsVfsContext);
  if (!ctx) throw new Error('useMeOsVfs must be used within <MeOsVfsProvider>.');
  return ctx;
};

