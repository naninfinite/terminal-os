import { describe, expect, it } from 'vitest';
import { buildSubsystemContextMenu } from './subsystemContextMenu';

describe('subsystemContextMenu model', () => {
  it('builds ME menu rows with safe action set', () => {
    const model = buildSubsystemContextMenu({
      scope: 'me',
      origin: 'dock',
      meWindowCount: 3,
      youHasDraft: false,
      youUnreadCount: 0,
      thirdNotificationCount: 0,
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

  it('builds YOU menu with draft/unread status and deterministic disable rules', () => {
    const noDraft = buildSubsystemContextMenu({
      scope: 'you',
      origin: 'dock',
      meWindowCount: 0,
      youHasDraft: false,
      youUnreadCount: 2,
      thirdNotificationCount: 0,
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
      connectNotificationCount: 0,
    });
    const withDraftActions = withDraft.rows
      .filter((row): row is Extract<typeof row, { kind: 'action' }> => row.kind === 'action');

    expect(withDraftActions.find((row) => row.id === 'you_save_input')?.disabled).toBe(false);
    expect(withDraftActions.find((row) => row.id === 'you_clear_input')?.disabled).toBe(false);
  });

  it('builds THIRD and CONNECT menus with disabled TODO placeholders', () => {
    const third = buildSubsystemContextMenu({
      scope: 'third',
      origin: 'dock',
      meWindowCount: 0,
      youHasDraft: false,
      youUnreadCount: 0,
      thirdNotificationCount: 0,
      connectNotificationCount: 0,
    });
    const connect = buildSubsystemContextMenu({
      scope: 'connect',
      origin: 'dock',
      meWindowCount: 0,
      youHasDraft: false,
      youUnreadCount: 0,
      thirdNotificationCount: 0,
      connectNotificationCount: 0,
    });

    const thirdTodo = third.rows.find((row) => row.kind === 'action' && row.id === 'todo_third_new_shape');
    const connectTodo = connect.rows.find(
      (row) => row.kind === 'action' && row.id === 'todo_connect_notifications'
    );

    expect(thirdTodo && thirdTodo.kind === 'action' ? thirdTodo.disabled : undefined).toBe(true);
    expect(connectTodo && connectTodo.kind === 'action' ? connectTodo.disabled : undefined).toBe(true);
  });
});
