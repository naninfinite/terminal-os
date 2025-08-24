import { getItemSafe, setItemSafe } from './storage';

export type DebugFlags = {
  showScanlines: boolean;
  showCursor: boolean;
  showOverlay: boolean;
};

const STORAGE_KEY = 'terminal_os_debug_flags_v1';
export const DEBUG_FLAGS_UPDATED_EVENT = 'terminal_os_debug_flags_updated';

const DEFAULT_FLAGS: DebugFlags = {
  showScanlines: true,
  showCursor: true,
  showOverlay: false,
};

export function readFlags(): DebugFlags {
  return getItemSafe<DebugFlags>(STORAGE_KEY, DEFAULT_FLAGS);
}

export function writeFlags(flags: DebugFlags): boolean {
  const ok = setItemSafe(STORAGE_KEY, flags);
  try { window.dispatchEvent(new Event(DEBUG_FLAGS_UPDATED_EVENT)); } catch {}
  return ok;
}

export function setFlag<K extends keyof DebugFlags>(key: K, value: DebugFlags[K]): boolean {
  const next = { ...readFlags(), [key]: value } as DebugFlags;
  return writeFlags(next);
}

export function resetFlags(): boolean {
  return writeFlags(DEFAULT_FLAGS);
}

export function subscribeFlags(listener: () => void): () => void {
  const l = listener as EventListener;
  window.addEventListener(DEBUG_FLAGS_UPDATED_EVENT, l);
  return () => window.removeEventListener(DEBUG_FLAGS_UPDATED_EVENT, l);
}


