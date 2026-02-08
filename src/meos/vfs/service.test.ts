import { describe, expect, it } from 'vitest';
import { LEGACY_PHASE3_KEY, MeOsVfsService, VFS_STORAGE_KEY, type VfsStorageAdapter } from './service';

const createMemoryStorage = (initial?: Record<string, string>): VfsStorageAdapter => {
  const mem = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (key) => mem.get(key) ?? null,
    setItem: (key, value) => { mem.set(key, value); },
    removeItem: (key) => { mem.delete(key); },
  };
};

describe('MeOsVfsService', () => {
  it('loads seed snapshot when no persisted state exists', () => {
    const service = new MeOsVfsService(createMemoryStorage());
    const snapshot = service.getSnapshot();
    const rootChildren = service.listChildren(snapshot.rootId).map((node) => node.name);
    expect(rootChildren).toContain('Home');
    expect(rootChildren).toContain('Projects');
    expect(rootChildren).toContain('Media');
  });

  it('persists create/rename/delete operations', () => {
    const storage = createMemoryStorage();
    const service = new MeOsVfsService(storage);
    const rootId = service.getSnapshot().rootId;

    const folder = service.createFolder(rootId, 'Test Folder');
    expect(folder).not.toBeNull();
    if (!folder) return;

    expect(service.rename(folder.id, 'Renamed Folder')).toBe(true);
    const afterRename = service.listChildren(rootId).find((node) => node.id === folder.id);
    expect(afterRename?.name).toBe('Renamed Folder');

    expect(service.deleteNode(folder.id)).toBe(true);
    const afterDelete = service.listChildren(rootId).find((node) => node.id === folder.id);
    expect(afterDelete).toBeUndefined();

    const persistedRaw = storage.getItem(VFS_STORAGE_KEY);
    expect(persistedRaw).toBeTruthy();
  });

  it('resets to deterministic seed state', () => {
    const service = new MeOsVfsService(createMemoryStorage());
    const rootId = service.getSnapshot().rootId;
    service.createFolder(rootId, 'Temp');
    expect(service.listChildren(rootId).some((n) => n.name === 'Temp')).toBe(true);

    service.reset();
    expect(service.listChildren(rootId).some((n) => n.name === 'Temp')).toBe(false);
    expect(service.listChildren(rootId).some((n) => n.name === 'Home')).toBe(true);
  });

  it('migrates legacy phase3 tree on first load', () => {
    const legacy = {
      id: 'root',
      name: '/',
      type: 'folder',
      children: [
        { id: 'legacy_docs', name: 'docs', type: 'folder', children: [] },
        { id: 'legacy_about', name: 'ABOUT.TXT', type: 'file', fileType: 'about' },
      ],
    };
    const storage = createMemoryStorage({
      [LEGACY_PHASE3_KEY]: JSON.stringify(legacy),
    });
    const service = new MeOsVfsService(storage);
    const rootId = service.getSnapshot().rootId;
    const names = service.listChildren(rootId).map((n) => n.name);
    expect(names).toContain('docs');
    expect(names).toContain('ABOUT.TXT');
    expect(storage.getItem(VFS_STORAGE_KEY)).toBeTruthy();
  });
});

