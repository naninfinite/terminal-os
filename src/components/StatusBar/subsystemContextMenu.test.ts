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
      connectStatus: 'idle',
      connectRoomCode: null,
      connectCanRequestRematch: false,
      connectActiveMatch: false,
      connectMultiplayerAvailable: true,
    });

    expect(model.title).toBe('ME.EXE');
    expect(model.rows.map((row) => row.kind)).toEqual([
      'status',
      'action',
      'divider',
      'action',
      'action',
      'action',
      'action',
      'action',
    ]);

    const actionIds = model.rows
      .filter((row): row is Extract<typeof row, { kind: 'action' }> => row.kind === 'action')
      .map((row) => row.id);
    expect(actionIds).toEqual([
      'open_me',
      'open_home',
      'open_projects',
      'open_media',
      'open_about',
      'open_contact',
    ]);
  });

  it('builds expanded ME panel menu rows with recent and direct open actions', () => {
    const model = buildSubsystemContextMenu({
      scope: 'me',
      origin: 'panel',
      meWindowCount: 2,
      youHasDraft: false,
      youUnreadCount: 0,
      thirdNotificationCount: 0,
      thirdMode: 'play',
      connectNotificationCount: 0,
      connectStatus: 'idle',
      connectRoomCode: null,
      connectCanRequestRematch: false,
      connectActiveMatch: false,
      connectMultiplayerAvailable: true,
    });

    expect(model.rows.map((row) => row.kind)).toEqual([
      'status',
      'action',
      'action',
      'divider',
      'action',
      'action',
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
      'open_home',
      'open_projects',
      'open_media',
      'open_about',
      'open_contact',
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
      connectStatus: 'idle',
      connectRoomCode: null,
      connectCanRequestRematch: false,
      connectActiveMatch: false,
      connectMultiplayerAvailable: true,
    });
    const noDraftActions = noDraft.rows
      .filter((row): row is Extract<typeof row, { kind: 'action' }> => row.kind === 'action');

    expect(noDraftActions.map((row) => row.id)).toContain('you_type_message');
    expect(noDraftActions.find((row) => row.id === 'you_type_message')?.disabled).toBeFalsy();
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
      connectStatus: 'idle',
      connectRoomCode: null,
      connectCanRequestRematch: false,
      connectActiveMatch: false,
      connectMultiplayerAvailable: true,
    });
    const withDraftActions = withDraft.rows
      .filter((row): row is Extract<typeof row, { kind: 'action' }> => row.kind === 'action');

    expect(withDraftActions.map((row) => row.id)).toContain('you_type_message');
    expect(withDraftActions.find((row) => row.id === 'you_type_message')?.disabled).toBeFalsy();
    expect(withDraftActions.find((row) => row.id === 'you_save_input')?.disabled).toBe(false);
    expect(withDraftActions.find((row) => row.id === 'you_clear_input')?.disabled).toBe(false);
  });

  it('builds THIRD menu with mode action and CONNECT room controls', () => {
    const third = buildSubsystemContextMenu({
      scope: 'third',
      origin: 'dock',
      meWindowCount: 0,
      youHasDraft: false,
      youUnreadCount: 0,
      thirdNotificationCount: 0,
      thirdMode: 'play',
      connectNotificationCount: 0,
      connectStatus: 'idle',
      connectRoomCode: null,
      connectCanRequestRematch: false,
      connectActiveMatch: false,
      connectMultiplayerAvailable: true,
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
      connectStatus: 'round_over',
      connectRoomCode: 'AB12ZX',
      connectCanRequestRematch: true,
      connectActiveMatch: true,
      connectMultiplayerAvailable: true,
    });

    const thirdModeAction = third.rows.find(
      (row) => row.kind === 'action' && row.id === 'third_set_edit_mode'
    );
    const connectRematch = connect.rows.find(
      (row) => row.kind === 'action' && row.id === 'connect_rematch'
    );
    const connectLeave = connect.rows.find(
      (row) => row.kind === 'action' && row.id === 'connect_leave_match'
    );

    expect(thirdModeAction && thirdModeAction.kind === 'action' ? thirdModeAction.disabled : undefined).toBeFalsy();
    expect(connectRematch && connectRematch.kind === 'action' ? connectRematch.disabled : undefined).toBe(false);
    expect(connectLeave && connectLeave.kind === 'action' ? connectLeave.disabled : undefined).toBe(false);
  });
});
