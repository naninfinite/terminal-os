import { describe, expect, it } from 'vitest';
import {
  createMatchOffer,
  createRoomCode,
  normalizeRoomCode,
  pickQuickMatchPair,
  shouldLeadQuickMatch,
} from './matchmaking';

describe('matchmaking', () => {
  it('normalizes room codes to uppercase alphanumeric six-character tokens', () => {
    expect(normalizeRoomCode(' ab-12_zx ')).toBe('AB12ZX');
  });

  it('picks the oldest waiting client as host and uses client id for ties', () => {
    const pair = pickQuickMatchPair([
      { clientId: 'client-b', joinedAt: '2026-03-05T12:00:00.000Z' },
      { clientId: 'client-a', joinedAt: '2026-03-05T12:00:00.000Z' },
      { clientId: 'client-c', joinedAt: '2026-03-05T12:00:01.000Z' },
    ]);

    expect(pair).toEqual({
      hostClientId: 'client-a',
      guestClientId: 'client-b',
    });
    expect(shouldLeadQuickMatch('client-a', [
      { clientId: 'client-b', joinedAt: '2026-03-05T12:00:00.000Z' },
      { clientId: 'client-a', joinedAt: '2026-03-05T12:00:00.000Z' },
    ])).toBe(true);
  });

  it('creates stable room codes and match offers', () => {
    expect(createRoomCode({ clientId: 'alpha', nowMs: 1234 })).toHaveLength(6);
    expect(createRoomCode({ clientId: 'alpha', nowMs: 1234 })).toBe(
      createRoomCode({ clientId: 'alpha', nowMs: 1234 })
    );

    expect(createMatchOffer({
      hostClientId: 'host',
      guestClientId: 'guest',
      roomCode: 'ab12zx',
      createdAt: '2026-03-05T12:00:00.000Z',
    })).toEqual({
      type: 'match_offer',
      offerId: 'host:guest:AB12ZX:2026-03-05T12:00:00.000Z',
      roomCode: 'AB12ZX',
      hostClientId: 'host',
      guestClientId: 'guest',
      createdAt: '2026-03-05T12:00:00.000Z',
    });
  });
});
