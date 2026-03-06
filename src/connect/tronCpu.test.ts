import { describe, expect, it } from 'vitest';
import { createTronGameState, tronCellToId } from './tronEngine';
import { pickCpuTurn, TRON_CPU_PROFILES } from './tronCpu';
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

  it('applies deterministic seeded decisions and profile weighting deltas', () => {
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
    const expertAgain = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    expect(expertAgain).toBe(expert);
    expect(expert).not.toBe('down');
    expect(easy).not.toBe('down');
    expect(TRON_CPU_PROFILES.expert.lookaheadDepth).toBeGreaterThan(TRON_CPU_PROFILES.easy.lookaheadDepth);
    expect(TRON_CPU_PROFILES.expert.searchBudget).toBeGreaterThan(TRON_CPU_PROFILES.easy.searchBudget);
    expect(TRON_CPU_PROFILES.expert.mistakeRate).toBeLessThan(TRON_CPU_PROFILES.easy.mistakeRate);
  });

  it('avoids immediate suicidal contested moves on expert when survival options exist', () => {
    const state = createRunningState(createTronGameState({
      columns: 10,
      rows: 10,
      countdownTicks: 0,
      seed: 44,
      activePlayerIds: ['p1', 'p2'],
    }));
    const shaped = withPlayers(state, {
      p1: {
        head: { x: 6, y: 5 },
        direction: 'left',
        trailCellIds: [
          tronCellToId(10, { x: 6, y: 5 }),
          tronCellToId(10, { x: 6, y: 4 }),
          tronCellToId(10, { x: 6, y: 6 }),
        ],
      },
      p2: { head: { x: 4, y: 5 }, direction: 'right', trailCellIds: [54] },
    });

    const expert = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    // Going straight contests the center cell and dies this tick.
    expect(expert).not.toBe('right');
    expect(expert === 'up' || expert === 'down').toBe(true);
  });

  it('prefers open territory over entering a dead corridor on expert', () => {
    const state = createRunningState(createTronGameState({
      columns: 12,
      rows: 10,
      countdownTicks: 0,
      seed: 91,
      activePlayerIds: ['p1', 'p2', 'p3'],
    }));
    const corridorTrail = [
      tronCellToId(12, { x: 7, y: 4 }),
      tronCellToId(12, { x: 8, y: 4 }),
      tronCellToId(12, { x: 9, y: 4 }),
      tronCellToId(12, { x: 10, y: 4 }),
      tronCellToId(12, { x: 7, y: 6 }),
      tronCellToId(12, { x: 8, y: 6 }),
      tronCellToId(12, { x: 9, y: 6 }),
      tronCellToId(12, { x: 10, y: 6 }),
      tronCellToId(12, { x: 10, y: 5 }),
    ];
    const shaped = withPlayers(state, {
      p1: {
        head: { x: 1, y: 1 },
        direction: 'down',
        trailCellIds: [
          tronCellToId(12, { x: 1, y: 1 }),
          ...corridorTrail,
        ],
      },
      p2: {
        head: { x: 6, y: 5 },
        direction: 'right',
        trailCellIds: [tronCellToId(12, { x: 6, y: 5 })],
      },
      p3: {
        head: { x: 10, y: 8 },
        direction: 'left',
        trailCellIds: [tronCellToId(12, { x: 10, y: 8 })],
      },
    });

    const expert = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    expect(expert).not.toBe('right');
  });
});
