import { describe, expect, it } from 'vitest';
import { ABOUT_DOC_ID, CONTACT_CARD_ID, HOME_ID, createSeedSnapshot } from '../vfs/seed';
import { getFolderWindowId, getInfoWindowId, getViewerWindowId, migratePersistedWindows } from './MeOsProvider';

describe('MeOsProvider helpers', () => {
  it('uses deterministic folder, viewer, and info window ids', () => {
    expect(getFolderWindowId(HOME_ID)).toBe('folder_home');
    expect(getViewerWindowId(CONTACT_CARD_ID)).toBe('viewer_contact_card');
    expect(getInfoWindowId({ nodeId: HOME_ID })).toBe('info_node_home');
    expect(getInfoWindowId({ nodeId: ABOUT_DOC_ID, desktopEntryId: 'about' })).toBe('info_entry_about');
  });

  it('migrates legacy fixed-app windows to canonical node-backed windows', () => {
    const snapshot = createSeedSnapshot();
    const migrated = migratePersistedWindows([
      {
        id: 'meos_fileman',
        title: 'FILE.EXE',
        appId: 'file',
        x: 36,
        y: 30,
        width: 700,
        height: 430,
        zIndex: 1,
        minimized: false,
        maximized: false,
      },
      {
        id: 'meos_about',
        title: 'ABOUT.TXT',
        appId: 'about',
        x: 120,
        y: 70,
        width: 430,
        height: 280,
        zIndex: 2,
        minimized: false,
        maximized: false,
      },
      {
        id: 'viewer_contact_card',
        title: 'Contact',
        appId: 'viewer_contact',
        nodeId: CONTACT_CARD_ID,
        x: 180,
        y: 120,
        width: 500,
        height: 340,
        zIndex: 3,
        minimized: false,
        maximized: false,
        viewerKind: 'contact',
      },
    ], snapshot.nodes);

    expect(migrated.map((win) => win.id)).toEqual([
      'folder_home',
      'viewer_about_doc',
      'viewer_contact_card',
    ]);
    expect(migrated[0]?.appId).toBe('folder');
    expect(migrated[0]?.nodeId).toBe(HOME_ID);
    expect(migrated[1]?.title).toBe('About');
    expect(migrated[1]?.appId).toBe('viewer_text');
    expect(migrated[2]?.appId).toBe('viewer_contact');
  });
});
