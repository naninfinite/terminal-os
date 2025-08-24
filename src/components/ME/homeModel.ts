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
  { id: 'about', name: 'ABOUT.TXT', kind: 'doc', preview: 'Read me', data: { text: 'Terminal-OS Home' } },
  { id: 'home', name: 'HOME.EXE', kind: 'app', preview: 'Reorder items' },
];

export function loadHomeItems(): HomeItem[] {
  return getItemSafe<HomeItem[]>(STORAGE_KEY, DEFAULT_HOME_ITEMS);
}

export function saveHomeItems(items: HomeItem[]): boolean {
  return setItemSafe(STORAGE_KEY, items);
}

export const ITEMS_UPDATED_EVENT = 'terminal_os_home_items_updated';
export function emitHomeItemsUpdated(): void {
  try { window.dispatchEvent(new Event(ITEMS_UPDATED_EVENT)); } catch {}
}


