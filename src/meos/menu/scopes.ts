import type { MeOsDisplayMode } from '../shell/types';

export type MenuScopeId = 'desktop' | 'meos' | 'you' | 'third' | 'connect';

export type MenuCommandId =
  | 'open_meos'
  | 'exit_meos'
  | 'open_home'
  | 'open_fileman'
  | 'open_projects'
  | 'open_media'
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
      { id: 'open_meos', label: 'OPEN ME.OS' },
      { id: 'open_fileman', label: 'OPEN FILEMAN' },
      { id: 'open_home', label: 'OPEN HOME' },
    ],
  },
  meos: {
    title: 'ME.OS',
    items: [
      { id: 'open_fileman', label: 'OPEN FILEMAN' },
      { id: 'open_home', label: 'OPEN HOME' },
      { id: 'open_projects', label: 'OPEN PROJECTS' },
      { id: 'open_media', label: 'OPEN MEDIA' },
      { id: 'exit_meos', label: 'EXIT ME.OS' },
    ],
  },
  you: {
    title: 'YOU',
    items: [{ id: 'noop', label: 'COMING SOON' }],
  },
  third: {
    title: 'THIRD',
    items: [{ id: 'noop', label: 'COMING SOON' }],
  },
  connect: {
    title: 'CONNECT',
    items: [{ id: 'noop', label: 'COMING SOON' }],
  },
};

export const resolveMenuScope = (args: {
  displayMode: MeOsDisplayMode;
  activeScope?: Exclude<MenuScopeId, 'desktop' | 'meos'>;
}): MenuScopeId => {
  if (args.activeScope) return args.activeScope;
  return args.displayMode === 'fullscreen' ? 'meos' : 'desktop';
};
