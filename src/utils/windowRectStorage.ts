import type { WindowRect } from '../components/Windowing/WindowTypes';
import { getItemSafe, setItemSafe } from './storage';

const KEY_PREFIX = 'terminal_os_window_rect_v1:';

export function loadWindowRect(windowId: string, fallback: WindowRect): WindowRect {
  return getItemSafe<WindowRect>(KEY_PREFIX + windowId, fallback);
}

export function saveWindowRect(windowId: string, rect: WindowRect): boolean {
  return setItemSafe(KEY_PREFIX + windowId, rect);
}


