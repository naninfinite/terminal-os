import { describe, expect, it } from 'vitest';
import { createTronGameState } from './tronEngine';
import { pickCpuTurn } from './tronCpu';
import type { TronGameState } from './types';

const createRunningState = (state: TronGameState): TronGameState => ({
  ...state,
  phase: 'running',
  countdownTicksRemaining: 0,
});

describe('tronCpu', () => {
  it('never picks an illegal reverse when a safe turn exists', () => {
    const state = createRunningState(createTronGameState({
      columns: 10,
      rows: 10,
      countdownTicks: 0,
    }));
    const shaped: TronGameState = {
      ...state,
      players: {
        p1: {
          ...state.players.p1,
          head: { x: 5, y: 5 },
          direction: 'right',
          trailCellIds: [55],
        },
        p2: {
          ...state.players.p2,
          head: { x: 8, y: 5 },
          direction: 'left',
          trailCellIds: [58, 56],
        },
      },
    };

    const direction = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'medium' });

    expect(direction).not.toBe('right');
  });

  it('harder profiles prefer the larger safe region on the same board', () => {
    const state = createRunningState(createTronGameState({
      columns: 12,
      rows: 8,
      countdownTicks: 0,
      seed: 2,
    }));
    const shaped: TronGameState = {
      ...state,
      players: {
        p1: {
          ...state.players.p1,
          head: { x: 8, y: 3 },
          direction: 'left',
          trailCellIds: [44, 45, 46, 47, 48],
        },
        p2: {
          ...state.players.p2,
          head: { x: 3, y: 3 },
          direction: 'up',
          trailCellIds: [39, 51, 63],
        },
      },
    };

    const easy = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'easy' });
    const expert = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    expect(expert).toBe('right');
    expect([easy, expert]).toContain('right');
  });
});
