import { describe, expect, it } from 'vitest';
import {
  checksumTronSnapshot,
  createTronGameState,
  hydrateTronSnapshot,
  prepareNextTronRound,
  queueTurn,
  serializeTronSnapshot,
  stepTronGame,
} from './tronEngine';
import type { TronGameState } from './types';

const advanceToRunning = (state: TronGameState): TronGameState => {
  let next = state;
  while (next.phase === 'countdown') {
    next = stepTronGame(next);
  }
  return next;
};

describe('tronEngine', () => {
  it('produces deterministic results for the same seed and input sequence', () => {
    const run = () => {
      let state = advanceToRunning(createTronGameState({ seed: 99 }));
      const schedule = [
        { tick: state.tick + 1, playerId: 'p1' as const, direction: 'up' as const },
        { tick: state.tick + 2, playerId: 'p2' as const, direction: 'down' as const },
        { tick: state.tick + 5, playerId: 'p1' as const, direction: 'right' as const },
        { tick: state.tick + 6, playerId: 'p2' as const, direction: 'left' as const },
      ];

      for (const entry of schedule) {
        state = queueTurn(state, entry.playerId, entry.direction, entry.tick);
      }
      for (let index = 0; index < 12; index += 1) {
        state = stepTronGame(state);
        if (state.phase === 'round_over' || state.phase === 'match_over') break;
      }
      return state;
    };

    expect(run()).toEqual(run());
  });

  it('kills both players on a same-cell collision without awarding score', () => {
    let state = advanceToRunning(createTronGameState({
      columns: 8,
      rows: 8,
      countdownTicks: 0,
    }));
    state = {
      ...state,
      players: {
        p1: {
          ...state.players.p1,
          head: { x: 2, y: 4 },
          direction: 'right',
          trailCellIds: [34],
        },
        p2: {
          ...state.players.p2,
          head: { x: 4, y: 4 },
          direction: 'left',
          trailCellIds: [36],
        },
      },
    };

    const next = stepTronGame(state);

    expect(next.phase).toBe('round_over');
    expect(next.roundResult).toEqual({
      winner: null,
      eliminated: ['p1', 'p2'],
      reason: 'same_cell',
    });
    expect(next.score).toEqual({ p1: 0, p2: 0 });
  });

  it('kills both players on a head swap', () => {
    let state = advanceToRunning(createTronGameState({
      columns: 8,
      rows: 8,
      countdownTicks: 0,
    }));
    state = {
      ...state,
      players: {
        p1: {
          ...state.players.p1,
          head: { x: 3, y: 4 },
          direction: 'right',
          trailCellIds: [35],
        },
        p2: {
          ...state.players.p2,
          head: { x: 4, y: 4 },
          direction: 'left',
          trailCellIds: [36],
        },
      },
    };

    const next = stepTronGame(state);

    expect(next.roundResult?.reason).toBe('swap');
    expect(next.roundResult?.winner).toBeNull();
  });

  it('awards score to the survivor on wall collision and ends the match at target score', () => {
    let state = advanceToRunning(createTronGameState({
      columns: 8,
      rows: 8,
      countdownTicks: 0,
      firstToScore: 1,
    }));
    state = {
      ...state,
      players: {
        p1: {
          ...state.players.p1,
          head: { x: 7, y: 4 },
          direction: 'right',
          trailCellIds: [39],
        },
        p2: {
          ...state.players.p2,
          head: { x: 1, y: 4 },
          direction: 'left',
          trailCellIds: [33],
        },
      },
    };

    const next = stepTronGame(state);

    expect(next.phase).toBe('match_over');
    expect(next.roundResult).toEqual({
      winner: 'p2',
      eliminated: ['p1'],
      reason: 'wall',
    });
    expect(next.score).toEqual({ p1: 0, p2: 1 });
  });

  it('round-trips snapshots and stable checksums', () => {
    const base = advanceToRunning(createTronGameState({ seed: 7, countdownTicks: 0 }));
    const next = stepTronGame(queueTurn(base, 'p1', 'up', base.tick + 1));
    const snapshot = serializeTronSnapshot(next);
    const hydrated = hydrateTronSnapshot(snapshot);

    expect(hydrated).toEqual(next);
    expect(checksumTronSnapshot(serializeTronSnapshot(hydrated))).toBe(checksumTronSnapshot(snapshot));
  });

  it('preserves score when preparing the next round', () => {
    const state = {
      ...createTronGameState({ score: { p1: 2, p2: 3 } }),
      phase: 'round_over' as const,
    };

    const next = prepareNextTronRound(state);

    expect(next.round).toBe(2);
    expect(next.score).toEqual({ p1: 2, p2: 3 });
    expect(next.phase).toBe('countdown');
  });
});
