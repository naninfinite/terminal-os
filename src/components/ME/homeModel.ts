import { getItemSafe, setItemSafe } from '../../utils/storage';

export type HomeItem = {
  id: string;
  name: string; // Display name, e.g., "NOTES.EXE"
  kind: 'app' | 'doc' | 'link';
  preview?: string; // Short ASCII preview text
  data?: { text?: string; url?: string };
};

const STORAGE_KEY = 'terminal_os_home_items_v1';

export const DEFAULT_HOME_ITEMS: HomeItem[] = [
  { id: 'notes', name: 'NOTES.EXE', kind: 'app', preview: 'Write notes...', data: { text: 'Notes app placeholder' } },
  { id: 'terminal', name: 'TERMINAL.EXE', kind: 'app', preview: 'Run commands', data: { text: 'Terminal placeholder' } },
  { id: 'browser', name: 'BROWSER.EXE', kind: 'app', preview: 'Browse files' },
  { id: 'recents', name: 'RECENTS.EXE', kind: 'app', preview: 'Recently opened' },
  { id: 'about', name: 'ABOUT.TXT', kind: 'doc', preview: 'Read me', data: { text: 'Terminal-OS Home' } },
  { id: 'home', name: 'HOME.EXE', kind: 'app', preview: 'Reorder items' },
];

export function loadHomeItems(): HomeItem[] {
  return getItemSafe<HomeItem[]>(STORAGE_KEY, DEFAULT_HOME_ITEMS);
}

export function saveHomeItems(items: HomeItem[]): boolean {
  return setItemSafe(STORAGE_KEY, items);
}

// Simple in-browser filesystem persistence for FileBrowser
export type FileNode = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  fileType?: 'notes' | 'about' | 'terminal' | 'text';
  children?: FileNode[];
};

const FS_KEY = 'terminal_os_fs_v1';

export const DEFAULT_FS_NODE: FileNode = {
  id: 'root', name: '/', type: 'folder', children: [
    { id: 'docs', name: 'docs', type: 'folder', children: [ { id: 'about', name: 'ABOUT.TXT', type: 'file', fileType: 'about' } ] },
    { id: 'notes', name: 'NOTES.EXE', type: 'file', fileType: 'notes' },
    { id: 'terminal', name: 'TERMINAL.EXE', type: 'file', fileType: 'terminal' },
  ],
};

export function loadFileSystem(): FileNode {
  return getItemSafe<FileNode>(FS_KEY, DEFAULT_FS_NODE);
}

export function saveFileSystem(root: FileNode): boolean {
  return setItemSafe(FS_KEY, root);
}

export const ITEMS_UPDATED_EVENT = 'terminal_os_home_items_updated';
export function emitHomeItemsUpdated(): void {
  try { window.dispatchEvent(new Event(ITEMS_UPDATED_EVENT)); } catch {}
}


