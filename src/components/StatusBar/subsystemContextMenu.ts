import type { ContextTriggerSource } from '../shared/useContextTrigger';
import type { SubsystemScope } from './subsystemDock';

export const SUBSYSTEM_CONTEXT_MENU_EVENT = 'terminalos:subsystem-context-menu';

export type SubsystemContextMenuOrigin = 'dock' | 'panel';

export type SubsystemContextMenuEventDetail = {
  scope: SubsystemScope;
  origin: SubsystemContextMenuOrigin;
  source: ContextTriggerSource;
  x: number;
  y: number;
};

export type SubsystemContextMenuActionId =
  | 'open_me'
  | 'open_you'
  | 'open_third'
  | 'open_connect'
  | 'open_file'
  | 'open_projects'
  | 'open_media'
  | 'you_save_input'
  | 'you_clear_input'
  | 'third_reset_scene'
  | 'connect_copy_banner'
  | 'todo_third_new_shape'
  | 'todo_connect_notifications';

export type SubsystemContextMenuRow =
  | { key: string; kind: 'status'; label: string }
  | { key: string; kind: 'divider' }
  | { key: string; kind: 'action'; id: SubsystemContextMenuActionId; label: string; disabled?: boolean };

export type SubsystemContextMenuModel = {
  title: string;
  rows: ReadonlyArray<SubsystemContextMenuRow>;
};

type BuildSubsystemContextMenuArgs = {
  scope: SubsystemScope;
  origin: SubsystemContextMenuOrigin;
  meWindowCount: number;
  youHasDraft: boolean;
  youUnreadCount: number;
  thirdNotificationCount: number;
  connectNotificationCount: number;
};

const titleForScope = (scope: SubsystemScope): string => {
  switch (scope) {
    case 'me':
      return 'ME.EXE';
    case 'you':
      return 'YOU.EXE';
    case 'third':
      return 'THIRD.EXE';
    case 'connect':
      return 'CONNECT.EXE';
    default:
      return 'SUBSYSTEM';
  }
};

const openLabelForScope = (scope: SubsystemScope, origin: SubsystemContextMenuOrigin): string => {
  if (scope === 'you') {
    return origin === 'panel' ? 'OPEN YOU.EXE FULLSCREEN' : 'OPEN / FOCUS YOU.EXE';
  }
  return `OPEN ${titleForScope(scope)}`;
};

export const buildSubsystemContextMenu = (args: BuildSubsystemContextMenuArgs): SubsystemContextMenuModel => {
  const title = titleForScope(args.scope);

  switch (args.scope) {
    case 'me':
      return {
        title,
        rows: [
          { key: 'status_windows', kind: 'status', label: `OPEN WINDOWS: ${args.meWindowCount}` },
          { key: 'act_open_me', kind: 'action', id: 'open_me', label: openLabelForScope('me', args.origin) },
          { key: 'div_apps', kind: 'divider' },
          { key: 'act_open_file', kind: 'action', id: 'open_file', label: 'OPEN FILE' },
          { key: 'act_open_projects', kind: 'action', id: 'open_projects', label: 'OPEN PROJECTS' },
          { key: 'act_open_media', kind: 'action', id: 'open_media', label: 'OPEN MEDIA' },
        ],
      };
    case 'you':
      return {
        title,
        rows: [
          { key: 'status_unread', kind: 'status', label: `UNREAD: ${args.youUnreadCount}` },
          { key: 'status_draft', kind: 'status', label: `DRAFT: ${args.youHasDraft ? 'YES' : 'NO'}` },
          { key: 'div_actions', kind: 'divider' },
          { key: 'act_open_you', kind: 'action', id: 'open_you', label: openLabelForScope('you', args.origin) },
          {
            key: 'act_you_save',
            kind: 'action',
            id: 'you_save_input',
            label: 'POST MESSAGE',
            disabled: !args.youHasDraft,
          },
          {
            key: 'act_you_clear',
            kind: 'action',
            id: 'you_clear_input',
            label: 'CLEAR DRAFT',
            disabled: !args.youHasDraft,
          },
        ],
      };
    case 'third':
      return {
        title,
        rows: [
          { key: 'status_notifications', kind: 'status', label: `NOTIFICATIONS: ${args.thirdNotificationCount}` },
          { key: 'act_open_third', kind: 'action', id: 'open_third', label: openLabelForScope('third', args.origin) },
          { key: 'act_third_reset', kind: 'action', id: 'third_reset_scene', label: 'RESET SCENE' },
          { key: 'div_todo', kind: 'divider' },
          {
            key: 'act_todo_shapes',
            kind: 'action',
            id: 'todo_third_new_shape',
            label: 'TODO: NEW SHAPE (CUBE / SPHERE / TORUS)',
            disabled: true,
          },
        ],
      };
    case 'connect':
      return {
        title,
        rows: [
          { key: 'status_notifications', kind: 'status', label: `NOTIFICATIONS: ${args.connectNotificationCount}` },
          {
            key: 'act_open_connect',
            kind: 'action',
            id: 'open_connect',
            label: openLabelForScope('connect', args.origin),
          },
          { key: 'act_connect_copy', kind: 'action', id: 'connect_copy_banner', label: 'COPY BANNER' },
          { key: 'div_todo', kind: 'divider' },
          {
            key: 'act_todo_notifications',
            kind: 'action',
            id: 'todo_connect_notifications',
            label: 'TODO: NOTIFICATION ACTIONS',
            disabled: true,
          },
        ],
      };
    default:
      return { title, rows: [] };
  }
};
