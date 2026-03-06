import { describe, expect, it } from 'vitest';
import {
  buildGameConfigFromLobby,
  canStartLobby,
  claimOnlineSeat,
  createLocalCustomLobby,
  createOnlineCustomLobby,
  releaseClientSeats,
  releaseOnlineSeat,
  setSeatMode,
} from './lobby';

describe('lobby', () => {
  it('enforces local-only lobby rules and host local seat limits', () => {
    let lobby = createLocalCustomLobby();
    expect(canStartLobby(lobby)).toBe(true);

    lobby = setSeatMode(lobby, 'p3', 'local');
    expect(lobby.seats.p3.mode).toBe('local');

    const rejected = setSeatMode(lobby, 'p4', 'local');
    expect(rejected.seats.p4.mode).toBe('closed');

    const invalidOnline = setSeatMode(lobby, 'p4', 'online');
    expect(invalidOnline.seats.p4.mode).toBe('closed');
  });

  it('claims and releases online seats with a max of two human seats per client', () => {
    let lobby = createOnlineCustomLobby('host', 'AB12ZX');
    lobby = setSeatMode(lobby, 'p3', 'online');
    lobby = setSeatMode(lobby, 'p4', 'online');

    lobby = claimOnlineSeat(lobby, 'p2', 'guest');
    lobby = claimOnlineSeat(lobby, 'p3', 'guest');
    const rejected = claimOnlineSeat(lobby, 'p4', 'guest');

    expect(lobby.seats.p2.ownerClientId).toBe('guest');
    expect(lobby.seats.p3.ownerClientId).toBe('guest');
    expect(rejected.seats.p4.ownerClientId).toBeNull();

    const released = releaseOnlineSeat(lobby, 'p3', 'guest');
    expect(released.seats.p3.ownerClientId).toBeNull();
  });

  it('reclaims room seats when a remote client disconnects', () => {
    let lobby = createOnlineCustomLobby('host', 'AB12ZX');
    lobby = setSeatMode(lobby, 'p3', 'online');
    lobby = claimOnlineSeat(lobby, 'p2', 'guest');
    lobby = claimOnlineSeat(lobby, 'p3', 'guest');

    const next = releaseClientSeats(lobby, 'guest');

    expect(next.seats.p2.ownerClientId).toBeNull();
    expect(next.seats.p3.ownerClientId).toBeNull();
    expect(canStartLobby(next)).toBe(false);
  });

  it('builds game config from valid lobby snapshots', () => {
    let lobby = createOnlineCustomLobby('host', 'AB12ZX');
    lobby = setSeatMode(lobby, 'p3', 'cpu');
    lobby = claimOnlineSeat(lobby, 'p2', 'guest');

    expect(canStartLobby(lobby)).toBe(true);
    expect(buildGameConfigFromLobby(lobby)).toEqual({
      activePlayerIds: ['p1', 'p2', 'p3'],
    });
  });
});
