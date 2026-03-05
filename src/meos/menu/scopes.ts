import type { MeOsDisplayMode } from '../shell/types';

export type MenuScopeId = 'desktop' | 'meos' | 'you' | 'third' | 'connect';

export type MenuCommandId =
  | 'open_meos'
  | 'exit_meos'
  | 'open_home'
  | 'open_projects'
  | 'open_media'
  | 'open_about'
  | 'open_contact'
  | 'toggle_theme'
  | 'focus_you_panel'
  | 'you_save_input'
  | 'you_clear_input'
  | 'focus_third_panel'
  | 'third_toggle_mode'
  | 'third_reset_scene'
  | 'focus_connect_panel'
  | 'connect_quick_match'
  | 'connect_play_cpu'
  | 'noop';

export type MenuItemConfig = {
  id: MenuCommandId;
  label: string;
};

export type MenuScopeConfig = {
  title: string;
  items: MenuItemConfig[];
};

const THEME_MENU_ITEMS: MenuItemConfig[] = [
  { id: 'toggle_theme', label: 'TOGGLE THEME' },
];

export const MENU_SCOPE_CONFIG: Record<MenuScopeId, MenuScopeConfig> = {
  desktop: {
    title: 'DESKTOP',
    items: [
      { id: 'open_meos', label: 'OPEN ME.EXE' },
      { id: 'open_home', label: 'OPEN HOME' },
      ...THEME_MENU_ITEMS,
    ],
  },
  meos: {
    title: 'ME.EXE',
    items: [
      { id: 'open_home', label: 'OPEN HOME' },
      { id: 'open_projects', label: 'OPEN PROJECTS' },
      { id: 'open_media', label: 'OPEN MEDIA' },
      { id: 'open_about', label: 'OPEN ABOUT' },
      { id: 'open_contact', label: 'OPEN CONTACT' },
      { id: 'exit_meos', label: 'EXIT ME.EXE' },
      ...THEME_MENU_ITEMS,
    ],
  },
  you: {
    title: 'YOU',
    items: [
      { id: 'focus_you_panel', label: 'FOCUS YOU PANEL' },
      { id: 'you_save_input', label: 'POST MESSAGE' },
      { id: 'you_clear_input', label: 'CLEAR DRAFT' },
      ...THEME_MENU_ITEMS,
    ],
  },
  third: {
    title: 'THIRD',
    items: [
      { id: 'focus_third_panel', label: 'FOCUS THIRD PANEL' },
      { id: 'third_toggle_mode', label: 'TOGGLE EDIT MODE' },
      { id: 'third_reset_scene', label: 'RESET SCENE' },
      ...THEME_MENU_ITEMS,
    ],
  },
  connect: {
    title: 'CONNECT',
    items: [
      { id: 'focus_connect_panel', label: 'FOCUS CONNECT PANEL' },
      { id: 'connect_quick_match', label: 'QUICK MATCH' },
      { id: 'connect_play_cpu', label: 'PLAY CPU' },
      ...THEME_MENU_ITEMS,
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
