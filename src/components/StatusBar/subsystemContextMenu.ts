import type { ContextTriggerSource } from '../shared/useContextTrigger';
import type { SubsystemScope } from './subsystemDock';
import type { ThirdEditorMode } from '../../third/types';

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
  | 'open_me_recent'
  | 'open_you'
  | 'open_third'
  | 'open_connect'
  | 'open_home'
  | 'open_projects'
  | 'open_media'
  | 'open_about'
  | 'open_contact'
  | 'you_type_message'
  | 'you_save_input'
  | 'you_clear_input'
  | 'third_set_edit_mode'
  | 'third_set_play_mode'
  | 'third_reset_scene'
  | 'connect_copy_banner'
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
  dockPromotesPanels: boolean;
  meWindowCount: number;
  youHasDraft: boolean;
  youUnreadCount: number;
  thirdNotificationCount: number;
  thirdMode: ThirdEditorMode;
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

const openLabelForScope = (args: {
  scope: SubsystemScope;
  origin: SubsystemContextMenuOrigin;
  dockPromotesPanels: boolean;
}): string => {
  if (args.origin === 'panel') {
    return `OPEN ${titleForScope(args.scope)} FULLSCREEN`;
  }
  if (args.dockPromotesPanels) {
    return `PROMOTE / FOCUS ${titleForScope(args.scope)}`;
  }
  if (args.scope === 'you') {
    return 'OPEN / FOCUS YOU.EXE';
  }
  return `OPEN ${titleForScope(args.scope)}`;
};

export const buildSubsystemContextMenu = (args: BuildSubsystemContextMenuArgs): SubsystemContextMenuModel => {
  const title = titleForScope(args.scope);

  switch (args.scope) {
    case 'me': {
      const panelRows: SubsystemContextMenuRow[] = args.origin === 'panel'
        ? [
          { key: 'act_open_me_recent', kind: 'action', id: 'open_me_recent', label: 'OPEN RECENT' },
        ]
        : [];
      return {
        title,
        rows: [
          { key: 'status_windows', kind: 'status', label: `OPEN WINDOWS: ${args.meWindowCount}` },
          {
            key: 'act_open_me',
            kind: 'action',
            id: 'open_me',
            label: openLabelForScope({ scope: 'me', origin: args.origin, dockPromotesPanels: args.dockPromotesPanels }),
          },
          ...panelRows,
          { key: 'div_apps', kind: 'divider' },
          { key: 'act_open_home', kind: 'action', id: 'open_home', label: 'OPEN HOME' },
          { key: 'act_open_projects', kind: 'action', id: 'open_projects', label: 'OPEN PROJECTS' },
          { key: 'act_open_media', kind: 'action', id: 'open_media', label: 'OPEN MEDIA' },
          { key: 'act_open_about', kind: 'action', id: 'open_about', label: 'OPEN ABOUT' },
          { key: 'act_open_contact', kind: 'action', id: 'open_contact', label: 'OPEN CONTACT' },
        ],
      };
    }
    case 'you':
      return {
        title,
        rows: [
          { key: 'status_unread', kind: 'status', label: `UNREAD: ${args.youUnreadCount}` },
          { key: 'status_draft', kind: 'status', label: `DRAFT: ${args.youHasDraft ? 'YES' : 'NO'}` },
          { key: 'div_actions', kind: 'divider' },
          {
            key: 'act_open_you',
            kind: 'action',
            id: 'open_you',
            label: openLabelForScope({ scope: 'you', origin: args.origin, dockPromotesPanels: args.dockPromotesPanels }),
          },
          { key: 'act_you_type', kind: 'action', id: 'you_type_message', label: 'TYPE MESSAGE' },
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
      // Mode action is intentionally discoverable in context menus for V1.
      {
        const modeAction = args.thirdMode === 'edit'
          ? { id: 'third_set_play_mode' as const, label: 'SWITCH TO PLAY MODE' }
          : { id: 'third_set_edit_mode' as const, label: 'SWITCH TO EDIT MODE' };
      return {
        title,
        rows: [
          { key: 'status_notifications', kind: 'status', label: `NOTIFICATIONS: ${args.thirdNotificationCount}` },
          { key: 'status_mode', kind: 'status', label: `MODE: ${args.thirdMode.toUpperCase()}` },
          {
            key: 'act_open_third',
            kind: 'action',
            id: 'open_third',
            label: openLabelForScope({ scope: 'third', origin: args.origin, dockPromotesPanels: args.dockPromotesPanels }),
          },
          { key: 'act_third_mode', kind: 'action', id: modeAction.id, label: modeAction.label },
          { key: 'act_third_reset', kind: 'action', id: 'third_reset_scene', label: 'RESET SCENE' },
        ],
      };
      }
    case 'connect':
      return {
        title,
        rows: [
          { key: 'status_notifications', kind: 'status', label: `NOTIFICATIONS: ${args.connectNotificationCount}` },
          {
            key: 'act_open_connect',
            kind: 'action',
            id: 'open_connect',
            label: openLabelForScope({
              scope: 'connect',
              origin: args.origin,
              dockPromotesPanels: args.dockPromotesPanels,
            }),
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
