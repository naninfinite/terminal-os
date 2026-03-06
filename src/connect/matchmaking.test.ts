import { describe, expect, it } from 'vitest';
import {
  createMatchOffer,
  createRoomCode,
  normalizeRoomCode,
  pickQuickMatchGroup,
  shouldLeadQuickMatch,
} from './matchmaking';

describe('matchmaking', () => {
  it('normalizes room codes to uppercase alphanumeric six-character tokens', () => {
    expect(normalizeRoomCode(' ab-12_zx ')).toBe('AB12ZX');
  });

  it('groups quick match queues by desired player count and oldest client leads', () => {
    const group = pickQuickMatchGroup([
      { clientId: 'client-b', joinedAt: '2026-03-05T12:00:00.000Z', desiredPlayers: 2 },
      { clientId: 'client-a', joinedAt: '2026-03-05T12:00:00.000Z', desiredPlayers: 2 },
      { clientId: 'client-c', joinedAt: '2026-03-05T12:00:01.000Z', desiredPlayers: 4 },
      { clientId: 'client-d', joinedAt: '2026-03-05T12:00:02.000Z', desiredPlayers: 4 },
      { clientId: 'client-e', joinedAt: '2026-03-05T12:00:03.000Z', desiredPlayers: 4 },
      { clientId: 'client-f', joinedAt: '2026-03-05T12:00:04.000Z', desiredPlayers: 4 },
    ], 2);

    expect(group).toEqual({
      hostClientId: 'client-a',
      selectedClientIds: ['client-a', 'client-b'],
      queueSize: 2,
      seatAssignments: {
        'client-a': 'p1',
        'client-b': 'p2',
      },
    });

    expect(shouldLeadQuickMatch('client-a', [
      { clientId: 'client-b', joinedAt: '2026-03-05T12:00:00.000Z', desiredPlayers: 2 },
      { clientId: 'client-a', joinedAt: '2026-03-05T12:00:00.000Z', desiredPlayers: 2 },
    ], 2)).toBe(true);
  });

  it('forms four-player groups deterministically and assigns seats in queue order', () => {
    const group = pickQuickMatchGroup([
      { clientId: 'alpha', joinedAt: '2026-03-05T12:00:00.000Z', desiredPlayers: 4 },
      { clientId: 'bravo', joinedAt: '2026-03-05T12:00:01.000Z', desiredPlayers: 4 },
      { clientId: 'charlie', joinedAt: '2026-03-05T12:00:02.000Z', desiredPlayers: 4 },
      { clientId: 'delta', joinedAt: '2026-03-05T12:00:03.000Z', desiredPlayers: 4 },
      { clientId: 'echo', joinedAt: '2026-03-05T12:00:04.000Z', desiredPlayers: 4 },
    ], 4);

    expect(group?.selectedClientIds).toEqual(['alpha', 'bravo', 'charlie', 'delta']);
    expect(group?.seatAssignments).toEqual({
      alpha: 'p1',
      bravo: 'p2',
      charlie: 'p3',
      delta: 'p4',
    });
  });

  it('creates stable room codes and four-seat match offers', () => {
    expect(createRoomCode({ clientId: 'alpha', nowMs: 1234 })).toHaveLength(6);
    expect(createRoomCode({ clientId: 'alpha', nowMs: 1234 })).toBe(
      createRoomCode({ clientId: 'alpha', nowMs: 1234 })
    );

    expect(createMatchOffer({
      hostClientId: 'host',
      roomCode: 'ab12zx',
      queueSize: 4,
      selectedClientIds: ['host', 'guest-a', 'guest-b', 'guest-c'],
      seatAssignments: {
        host: 'p1',
        'guest-a': 'p2',
        'guest-b': 'p3',
        'guest-c': 'p4',
      },
      createdAt: '2026-03-05T12:00:00.000Z',
    })).toEqual({
      type: 'match_offer',
      offerId: 'host:AB12ZX:2026-03-05T12:00:00.000Z',
      roomCode: 'AB12ZX',
      queueSize: 4,
      hostClientId: 'host',
      selectedClientIds: ['host', 'guest-a', 'guest-b', 'guest-c'],
      seatAssignments: {
        host: 'p1',
        'guest-a': 'p2',
        'guest-b': 'p3',
        'guest-c': 'p4',
      },
      createdAt: '2026-03-05T12:00:00.000Z',
    });
  });
});
