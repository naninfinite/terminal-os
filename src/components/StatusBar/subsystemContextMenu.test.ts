import { describe, expect, it } from 'vitest';
import { buildSubsystemContextMenu } from './subsystemContextMenu';

describe('subsystemContextMenu model', () => {
  it('builds compact ME dock menu rows', () => {
    const model = buildSubsystemContextMenu({
      scope: 'me',
      origin: 'dock',
      meWindowCount: 3,
      youHasDraft: false,
      youUnreadCount: 0,
      thirdNotificationCount: 0,
      thirdMode: 'play',
      connectNotificationCount: 0,
    });

    expect(model.title).toBe('ME.EXE');
    expect(model.rows.map((row) => row.kind)).toEqual([
      'status',
      'action',
      'divider',
      'action',
      'action',
      'action',
    ]);

    const actionIds = model.rows
      .filter((row): row is Extract<typeof row, { kind: 'action' }> => row.kind === 'action')
      .map((row) => row.id);
    expect(actionIds).toEqual([
      'open_me',
      'open_file',
      'open_projects',
      'open_media',
    ]);
  });

  it('builds expanded ME panel menu rows with create/recent actions', () => {
    const model = buildSubsystemContextMenu({
      scope: 'me',
      origin: 'panel',
      meWindowCount: 2,
      youHasDraft: false,
      youUnreadCount: 0,
      thirdNotificationCount: 0,
      thirdMode: 'play',
      connectNotificationCount: 0,
    });

    expect(model.rows.map((row) => row.kind)).toEqual([
      'status',
      'action',
      'action',
      'divider',
      'action',
      'action',
      'divider',
      'action',
      'action',
      'action',
    ]);

    const actionIds = model.rows
      .filter((row): row is Extract<typeof row, { kind: 'action' }> => row.kind === 'action')
      .map((row) => row.id);
    expect(actionIds).toEqual([
      'open_me',
      'open_me_recent',
      'me_new_file',
      'me_new_folder',
      'open_file',
      'open_projects',
      'open_media',
    ]);
  });

  it('builds YOU menu with draft/unread status and deterministic disable rules', () => {
    const noDraft = buildSubsystemContextMenu({
      scope: 'you',
      origin: 'dock',
      meWindowCount: 0,
      youHasDraft: false,
      youUnreadCount: 2,
      thirdNotificationCount: 0,
      thirdMode: 'play',
      connectNotificationCount: 0,
    });
    const noDraftActions = noDraft.rows
      .filter((row): row is Extract<typeof row, { kind: 'action' }> => row.kind === 'action');

    expect(noDraftActions.find((row) => row.id === 'you_save_input')?.disabled).toBe(true);
    expect(noDraftActions.find((row) => row.id === 'you_clear_input')?.disabled).toBe(true);

    const withDraft = buildSubsystemContextMenu({
      scope: 'you',
      origin: 'panel',
      meWindowCount: 0,
      youHasDraft: true,
      youUnreadCount: 1,
      thirdNotificationCount: 0,
      thirdMode: 'play',
      connectNotificationCount: 0,
    });
    const withDraftActions = withDraft.rows
      .filter((row): row is Extract<typeof row, { kind: 'action' }> => row.kind === 'action');

    expect(withDraftActions.find((row) => row.id === 'you_save_input')?.disabled).toBe(false);
    expect(withDraftActions.find((row) => row.id === 'you_clear_input')?.disabled).toBe(false);
  });

  it('builds THIRD menu with mode action and CONNECT TODO placeholder', () => {
    const third = buildSubsystemContextMenu({
      scope: 'third',
      origin: 'dock',
      meWindowCount: 0,
      youHasDraft: false,
      youUnreadCount: 0,
      thirdNotificationCount: 0,
      thirdMode: 'play',
      connectNotificationCount: 0,
    });
    const connect = buildSubsystemContextMenu({
      scope: 'connect',
      origin: 'dock',
      meWindowCount: 0,
      youHasDraft: false,
      youUnreadCount: 0,
      thirdNotificationCount: 0,
      thirdMode: 'edit',
      connectNotificationCount: 0,
    });

    const thirdModeAction = third.rows.find(
      (row) => row.kind === 'action' && row.id === 'third_set_edit_mode'
    );
    const connectTodo = connect.rows.find(
      (row) => row.kind === 'action' && row.id === 'todo_connect_notifications'
    );

    expect(thirdModeAction && thirdModeAction.kind === 'action' ? thirdModeAction.disabled : undefined).toBeFalsy();
    expect(connectTodo && connectTodo.kind === 'action' ? connectTodo.disabled : undefined).toBe(true);
  });
});
