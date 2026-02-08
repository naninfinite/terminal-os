import type { MeOsDisplayMode } from '../shell/types';

export type MenuScopeId = 'desktop' | 'meos' | 'you' | 'third' | 'connect';

export type MenuCommandId =
  | 'open_meos'
  | 'exit_meos'
  | 'open_home'
  | 'open_fileman'
  | 'open_projects'
  | 'open_media'
  | 'focus_you_panel'
  | 'you_save_input'
  | 'you_clear_input'
  | 'focus_third_panel'
  | 'third_reset_scene'
  | 'focus_connect_panel'
  | 'connect_copy_banner'
  | 'noop';

export type MenuItemConfig = {
  id: MenuCommandId;
  label: string;
};

export type MenuScopeConfig = {
  title: string;
  items: MenuItemConfig[];
};

export const MENU_SCOPE_CONFIG: Record<MenuScopeId, MenuScopeConfig> = {
  desktop: {
    title: 'DESKTOP',
    items: [
      { id: 'open_meos', label: 'OPEN ME.EXE' },
      { id: 'open_fileman', label: 'OPEN FILE' },
      { id: 'open_home', label: 'OPEN HOME' },
    ],
  },
  meos: {
    title: 'ME.EXE',
    items: [
      { id: 'open_fileman', label: 'OPEN FILE' },
      { id: 'open_home', label: 'OPEN HOME' },
      { id: 'open_projects', label: 'OPEN PROJECTS' },
      { id: 'open_media', label: 'OPEN MEDIA' },
      { id: 'exit_meos', label: 'EXIT ME.EXE' },
    ],
  },
  you: {
    title: 'YOU',
    items: [
      { id: 'focus_you_panel', label: 'FOCUS YOU PANEL' },
      { id: 'you_save_input', label: 'SAVE INPUT' },
      { id: 'you_clear_input', label: 'CLEAR INPUT' },
    ],
  },
  third: {
    title: 'THIRD',
    items: [
      { id: 'focus_third_panel', label: 'FOCUS THIRD PANEL' },
      { id: 'third_reset_scene', label: 'RESET SCENE' },
    ],
  },
  connect: {
    title: 'CONNECT',
    items: [
      { id: 'focus_connect_panel', label: 'FOCUS CONNECT PANEL' },
      { id: 'connect_copy_banner', label: 'COPY BANNER' },
    ],
  },
};

export const resolveMenuScope = (args: {
  displayMode: MeOsDisplayMode;
  activeScope?: Exclude<MenuScopeId, 'desktop' | 'meos'>;
}): MenuScopeId => {
  if (args.displayMode === 'fullscreen') return 'meos';
  if (args.activeScope) return args.activeScope;
  return 'desktop';
};
