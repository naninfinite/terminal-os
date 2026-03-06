import { describe, expect, it } from 'vitest';
import { createTronGameState } from './tronEngine';
import { pickCpuTurn } from './tronCpu';
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

describe('tronCpu', () => {
  it('never picks an illegal reverse when a safe turn exists', () => {
    const state = createRunningState(createTronGameState({
      columns: 10,
      rows: 10,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2', 'p3'],
    }));
    const shaped = withPlayers(state, {
      p1: { head: { x: 5, y: 5 }, direction: 'right', trailCellIds: [55] },
      p2: { head: { x: 8, y: 5 }, direction: 'left', trailCellIds: [58, 56] },
      p3: { head: { x: 8, y: 8 }, direction: 'up', trailCellIds: [88] },
    });

    const direction = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'medium' });

    expect(direction).not.toBe('right');
  });

  it('harder profiles prefer the larger safe region under multi-opponent pressure', () => {
    const state = createRunningState(createTronGameState({
      columns: 12,
      rows: 8,
      countdownTicks: 0,
      seed: 2,
      activePlayerIds: ['p1', 'p2', 'p3', 'p4'],
    }));
    const shaped = withPlayers(state, {
      p1: { head: { x: 8, y: 1 }, direction: 'left', trailCellIds: [20, 37, 38, 48, 61] },
      p2: { head: { x: 2, y: 4 }, direction: 'up', trailCellIds: [50, 62, 74] },
      p3: { head: { x: 10, y: 6 }, direction: 'left', trailCellIds: [82] },
      p4: { head: { x: 1, y: 1 }, direction: 'down', trailCellIds: [13] },
    });

    const easy = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'easy' });
    const expert = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    expect(expert).toBe('right');
    expect([easy, expert]).toContain('right');
    expect(expert).not.toBe('left');
  });
});
