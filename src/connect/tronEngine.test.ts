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
import type { TronGameState, TronPlayerId } from './types';

const createRunningState = (state: TronGameState): TronGameState => ({
  ...state,
  phase: 'running',
  countdownTicksRemaining: 0,
});

const withPlayers = (
  state: TronGameState,
  overrides: Partial<Record<TronPlayerId, Partial<TronGameState['players'][TronPlayerId]>>>,
): TronGameState => ({
  ...state,
  players: {
    p1: { ...state.players.p1, ...overrides.p1 },
    p2: { ...state.players.p2, ...overrides.p2 },
    p3: { ...state.players.p3, ...overrides.p3 },
    p4: { ...state.players.p4, ...overrides.p4 },
  },
});

describe('tronEngine', () => {
  it('produces deterministic results for the same seed and four-seat input sequence', () => {
    const run = () => {
      let state = createRunningState(createTronGameState({
        seed: 99,
        activePlayerIds: ['p1', 'p2', 'p3', 'p4'],
        countdownTicks: 0,
      }));
      const schedule = [
        { tick: state.tick + 1, playerId: 'p1' as const, direction: 'up' as const },
        { tick: state.tick + 1, playerId: 'p2' as const, direction: 'down' as const },
        { tick: state.tick + 2, playerId: 'p3' as const, direction: 'left' as const },
        { tick: state.tick + 2, playerId: 'p4' as const, direction: 'right' as const },
        { tick: state.tick + 4, playerId: 'p1' as const, direction: 'left' as const },
        { tick: state.tick + 5, playerId: 'p3' as const, direction: 'down' as const },
      ];

      schedule.forEach((entry) => {
        state = queueTurn(state, entry.playerId, entry.direction, entry.tick);
      });

      for (let index = 0; index < 18; index += 1) {
        state = stepTronGame(state);
        if (state.phase === 'round_over' || state.phase === 'match_over') break;
      }
      return state;
    };

    expect(run()).toEqual(run());
  });

  it('assigns deterministic spawn anchors for 2, 3, and 4 active riders', () => {
    const two = createTronGameState({ activePlayerIds: ['p1', 'p4'] });
    const three = createTronGameState({ activePlayerIds: ['p1', 'p2', 'p4'] });
    const four = createTronGameState({ activePlayerIds: ['p1', 'p2', 'p3', 'p4'] });

    expect(two.players.p1.head.y).toBe(two.players.p4.head.y);
    expect(two.players.p1.direction).toBe('right');
    expect(two.players.p4.direction).toBe('left');

    expect(three.players.p4.direction).toBe('down');
    expect(three.players.p4.head.y).toBeLessThan(three.players.p1.head.y);

    expect(four.players.p3.direction).toBe('down');
    expect(four.players.p4.direction).toBe('up');
  });

  it('kills all riders that enter the same next cell without awarding score', () => {
    let state = createRunningState(createTronGameState({
      columns: 8,
      rows: 8,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2', 'p3'],
    }));
    state = withPlayers(state, {
      p1: { head: { x: 2, y: 3 }, direction: 'right', trailCellIds: [26] },
      p2: { head: { x: 4, y: 3 }, direction: 'left', trailCellIds: [28] },
      p3: { head: { x: 3, y: 2 }, direction: 'down', trailCellIds: [19] },
    });

    const next = stepTronGame(state);

    expect(next.phase).toBe('round_over');
    expect(next.roundResult).toEqual({
      winner: null,
      eliminated: ['p1', 'p2', 'p3'],
      reason: 'same_cell',
    });
    expect(next.score).toEqual({ p1: 0, p2: 0, p3: 0, p4: 0 });
  });

  it('awards score to the lone survivor on a swap collision with another rider still alive', () => {
    let state = createRunningState(createTronGameState({
      columns: 8,
      rows: 8,
      countdownTicks: 0,
      firstToScore: 1,
      activePlayerIds: ['p1', 'p2', 'p3'],
    }));
    state = withPlayers(state, {
      p1: { head: { x: 3, y: 4 }, direction: 'right', trailCellIds: [35] },
      p2: { head: { x: 4, y: 4 }, direction: 'left', trailCellIds: [36] },
      p3: { head: { x: 1, y: 1 }, direction: 'right', trailCellIds: [9] },
    });

    const next = stepTronGame(state);

    expect(next.phase).toBe('match_over');
    expect(next.roundResult).toEqual({
      winner: 'p3',
      eliminated: ['p1', 'p2'],
      reason: 'swap',
    });
    expect(next.score).toEqual({ p1: 0, p2: 0, p3: 1, p4: 0 });
  });

  it('continues the round when one rider crashes but multiple survivors remain', () => {
    let state = createRunningState(createTronGameState({
      columns: 10,
      rows: 10,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2', 'p3'],
    }));
    state = withPlayers(state, {
      p1: { head: { x: 9, y: 5 }, direction: 'right', trailCellIds: [59] },
      p2: { head: { x: 3, y: 5 }, direction: 'right', trailCellIds: [53] },
      p3: { head: { x: 5, y: 2 }, direction: 'down', trailCellIds: [25] },
    });

    const next = stepTronGame(state);

    expect(next.phase).toBe('running');
    expect(next.players.p1.alive).toBe(false);
    expect(next.players.p2.alive).toBe(true);
    expect(next.players.p3.alive).toBe(true);
    expect(next.roundResult).toBeNull();
    expect(next.players.p2.head).toEqual({ x: 4, y: 5 });
    expect(next.players.p3.head).toEqual({ x: 5, y: 3 });
  });

  it('round-trips snapshots and stable checksums across four-seat state', () => {
    const base = createRunningState(createTronGameState({
      seed: 7,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2', 'p3', 'p4'],
    }));
    const queued = queueTurn(queueTurn(base, 'p1', 'up', base.tick + 1), 'p4', 'left', base.tick + 1);
    const next = stepTronGame(queued);
    const snapshot = serializeTronSnapshot(next);
    const hydrated = hydrateTronSnapshot(snapshot);

    expect(hydrated).toEqual(next);
    expect(checksumTronSnapshot(serializeTronSnapshot(hydrated))).toBe(checksumTronSnapshot(snapshot));
  });

  it('preserves score when preparing the next round', () => {
    const state = {
      ...createTronGameState({
        activePlayerIds: ['p1', 'p2', 'p3'],
        score: { p1: 2, p2: 3, p3: 1, p4: 0 },
      }),
      phase: 'round_over' as const,
    };

    const next = prepareNextTronRound(state);

    expect(next.round).toBe(2);
    expect(next.score).toEqual({ p1: 2, p2: 3, p3: 1, p4: 0 });
    expect(next.phase).toBe('countdown');
  });
});
