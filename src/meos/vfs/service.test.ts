import { describe, expect, it } from 'vitest';
import {
  ABOUT_DOC_ID,
  ARCHIVE_ID,
  ARCHIVE_LEGACY_ID,
  CONTACT_CARD_ID,
  DSC00479_ID,
  HOME_ID,
  IDG_20250710_004909_371_ID,
  IMG_0285_ID,
  MEDIA_ID,
  PHOTOS_ID,
  PORTRAIT_ID,
  PROJECTS_ID,
  README_ID,
  REEL_ID,
  REEL_THUMBNAIL_ID,
  VIDEOS_ID,
} from './seed';
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
    expect(rootChildren).toEqual(['Home']);
    expect(service.listChildren(HOME_ID).map((node) => node.id)).toEqual([
      PROJECTS_ID,
      MEDIA_ID,
      ARCHIVE_ID,
      ABOUT_DOC_ID,
      CONTACT_CARD_ID,
      README_ID,
    ]);
    expect(service.listChildren(MEDIA_ID).map((node) => node.id)).toEqual([
      PHOTOS_ID,
      VIDEOS_ID,
    ]);
    expect(service.listChildren(PHOTOS_ID).map((node) => node.id)).toEqual([
      PORTRAIT_ID,
      DSC00479_ID,
      IDG_20250710_004909_371_ID,
      IMG_0285_ID,
    ]);
    expect(service.listChildren(VIDEOS_ID).map((node) => node.id)).toEqual([REEL_ID]);
    expect(service.getNode(REEL_ID)?.videoThumbnailId).toBe(REEL_THUMBNAIL_ID);
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

  it('migrates v1 snapshots to canonical Home docs and archives old about/contact folders', () => {
    const legacySnapshot = {
      version: 1,
      rootId: 'root',
      nodes: {
        root: { id: 'root', name: '/', type: 'folder', parentId: null },
        home: { id: 'home', name: 'Home', type: 'folder', parentId: 'root' },
        projects: { id: 'projects', name: 'Projects', type: 'folder', parentId: 'root' },
        media: { id: 'media', name: 'Media', type: 'folder', parentId: 'root' },
        archive: { id: 'archive', name: 'Archive', type: 'folder', parentId: 'root' },
        about: { id: 'about', name: 'About', type: 'folder', parentId: 'root' },
        contact: { id: 'contact', name: 'Contact', type: 'folder', parentId: 'root' },
        about_txt: { id: 'about_txt', name: 'ABOUT.txt', type: 'file', parentId: 'about', kind: 'text', textContent: 'Legacy about copy.' },
        readme_txt: { id: 'readme_txt', name: 'README.txt', type: 'file', parentId: 'home', kind: 'text', textContent: 'Existing README.' },
      },
      children: {
        root: ['home', 'projects', 'media', 'archive', 'about', 'contact'],
        home: ['readme_txt'],
        projects: [],
        media: [],
        archive: [],
        about: ['about_txt'],
        contact: [],
      },
    };
    const storage = createMemoryStorage({
      [VFS_STORAGE_KEY]: JSON.stringify(legacySnapshot),
    });
    const service = new MeOsVfsService(storage);
    const snapshot = service.getSnapshot();

    expect(snapshot.version).toBe(3);
    expect(service.listChildren(snapshot.rootId).map((node) => node.id)).toEqual([HOME_ID]);
    expect(service.getNode(ABOUT_DOC_ID)?.parentId).toBe(HOME_ID);
    expect(service.getNode(ABOUT_DOC_ID)?.textContent).toContain('Legacy about copy.');
    expect(service.getNode(CONTACT_CARD_ID)?.parentId).toBe(HOME_ID);
    expect(service.getNode(README_ID)?.parentId).toBe(HOME_ID);
    expect(service.listChildren(ARCHIVE_LEGACY_ID).map((node) => node.id)).toEqual(['about', 'contact']);
  });

  it('migrates v2 snapshots into nested Home and Media folders', () => {
    const v2Snapshot = {
      version: 2,
      rootId: 'root',
      nodes: {
        root: { id: 'root', name: '/', type: 'folder', parentId: null },
        home: { id: 'home', name: 'Home', type: 'folder', parentId: 'root' },
        projects: { id: 'projects', name: 'Projects', type: 'folder', parentId: 'root' },
        media: { id: 'media', name: 'Media', type: 'folder', parentId: 'root' },
        archive: { id: 'archive', name: 'Archive', type: 'folder', parentId: 'root' },
        about_doc: { id: 'about_doc', name: 'About', type: 'file', parentId: 'home', kind: 'text' },
        contact_card: { id: 'contact_card', name: 'Contact', type: 'file', parentId: 'home', kind: 'contact' },
        readme_txt: { id: 'readme_txt', name: 'README.txt', type: 'file', parentId: 'home', kind: 'text' },
        portrait_png: { id: 'portrait_png', name: 'Portrait.png', type: 'file', parentId: 'media', kind: 'image' },
        reel_mp4: { id: 'reel_mp4', name: 'Reel.mp4', type: 'file', parentId: 'media', kind: 'video', assetSrc: 'src/assets/videos/mp4/juno-echo_web.mp4' },
      },
      children: {
        root: ['home', 'projects', 'media', 'archive'],
        home: ['about_doc', 'contact_card', 'readme_txt'],
        projects: [],
        media: ['portrait_png', 'reel_mp4'],
        archive: [],
      },
    };

    const storage = createMemoryStorage({
      [VFS_STORAGE_KEY]: JSON.stringify(v2Snapshot),
    });
    const service = new MeOsVfsService(storage);
    const snapshot = service.getSnapshot();

    expect(snapshot.version).toBe(3);
    expect(service.listChildren(snapshot.rootId).map((node) => node.id)).toEqual([HOME_ID]);
    expect(service.listChildren(HOME_ID).map((node) => node.id)).toEqual([
      PROJECTS_ID,
      MEDIA_ID,
      ARCHIVE_ID,
      ABOUT_DOC_ID,
      CONTACT_CARD_ID,
      README_ID,
    ]);
    expect(service.listChildren(MEDIA_ID).map((node) => node.id)).toEqual([PHOTOS_ID, VIDEOS_ID]);
    expect(service.listChildren(PHOTOS_ID).map((node) => node.id)).toContain(PORTRAIT_ID);
    expect(service.listChildren(VIDEOS_ID).map((node) => node.id)).toContain(REEL_ID);
  });
});
