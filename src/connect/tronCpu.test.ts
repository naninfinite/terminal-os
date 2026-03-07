import { describe, expect, it } from 'vitest';
import { createTronGameState, queueTurn, stepTronGame, tronCellToId } from './tronEngine';
import { inspectCpuTurn, pickCpuTurn, TRON_CPU_PROFILES } from './tronCpu';
import type { TronCpuDifficulty, TronGameState, TronPlayerId } from './types';

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

const cell = (columns: number, x: number, y: number): number => tronCellToId(columns, { x, y });

const cells = (columns: number, entries: Array<[number, number]>): number[] => (
  entries.map(([x, y]) => cell(columns, x, y))
);

const runCpuRound = (args: {
  seed: number;
  columns?: number;
  rows?: number;
  difficulties: Record<TronPlayerId, TronCpuDifficulty>;
}): TronPlayerId | null => {
  const { seed, columns = 16, rows = 12, difficulties } = args;
  let state = createRunningState(createTronGameState({
    columns,
    rows,
    countdownTicks: 0,
    firstToScore: 1,
    seed,
    activePlayerIds: ['p1', 'p2'],
  }));
  const lastDecisionTick: Record<TronPlayerId, number> = {
    p1: Number.NEGATIVE_INFINITY,
    p2: Number.NEGATIVE_INFINITY,
    p3: Number.NEGATIVE_INFINITY,
    p4: Number.NEGATIVE_INFINITY,
  };

  for (let step = 0; step < 300; step += 1) {
    if (state.phase === 'round_over' || state.phase === 'match_over') {
      return state.roundResult?.winner ?? null;
    }

    (['p1', 'p2'] as TronPlayerId[]).forEach((playerId) => {
      if (!state.players[playerId].alive) return;
      const profile = TRON_CPU_PROFILES[difficulties[playerId]];
      if ((state.tick - lastDecisionTick[playerId]) < (profile.reactionDelayTicks + 1)) return;

      const direction = pickCpuTurn({
        state,
        playerId,
        difficulty: difficulties[playerId],
      });
      if (!direction) return;

      const queued = queueTurn(state, playerId, direction, state.tick + 1);
      if (queued === state) return;

      state = queued;
      lastDecisionTick[playerId] = state.tick;
    });

    state = stepTronGame(state).state;
  }

  return state.roundResult?.winner ?? null;
};

describe('tronCpu', () => {
  it('applies deterministic seeded decisions and layered profile deltas', () => {
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

    const expert = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });
    const expertAgain = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    expect(expertAgain).toBe(expert);
    expect(TRON_CPU_PROFILES.expert.lookaheadDepth).toBeGreaterThan(TRON_CPU_PROFILES.easy.lookaheadDepth);
    expect(TRON_CPU_PROFILES.expert.rolloutCandidates).toBeGreaterThan(TRON_CPU_PROFILES.easy.rolloutCandidates);
    expect(TRON_CPU_PROFILES.expert.randomness).toBeLessThan(TRON_CPU_PROFILES.easy.randomness);
    expect(TRON_CPU_PROFILES.expert.weights.reachableArea).toBeGreaterThan(TRON_CPU_PROFILES.easy.weights.reachableArea);
    expect(Math.abs(TRON_CPU_PROFILES.expert.weights.forcedDeathRisk)).toBeGreaterThan(
      Math.abs(TRON_CPU_PROFILES.easy.weights.forcedDeathRisk),
    );
  });

  it('avoids immediate wall or trail death when a safe move exists', () => {
    const state = createRunningState(createTronGameState({
      columns: 10,
      rows: 10,
      countdownTicks: 0,
      seed: 7,
      activePlayerIds: ['p1', 'p2'],
    }));
    const shaped = withPlayers(state, {
      p1: {
        head: { x: 9, y: 4 },
        direction: 'left',
        trailCellIds: [cell(10, 9, 4)],
      },
      p2: {
        head: { x: 9, y: 5 },
        direction: 'right',
        trailCellIds: [cell(10, 9, 5)],
      },
    });

    const direction = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'medium' });

    expect(direction).toBe('down');
  });

  it('exposes deterministic debug metrics for the chosen candidate', () => {
    const state = createRunningState(createTronGameState({
      columns: 10,
      rows: 10,
      countdownTicks: 0,
      seed: 7,
      activePlayerIds: ['p1', 'p2'],
    }));
    const shaped = withPlayers(state, {
      p1: {
        head: { x: 9, y: 4 },
        direction: 'left',
        trailCellIds: [cell(10, 9, 4)],
      },
      p2: {
        head: { x: 9, y: 5 },
        direction: 'right',
        trailCellIds: [cell(10, 9, 5)],
      },
    });

    const debug = inspectCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    expect(debug).toBeTruthy();
    expect(debug?.mode).toBe('escape');
    expect(debug?.chosenDirection).toBe('down');
    expect(debug?.candidates[0]?.direction).toBe(debug?.chosenDirection);
    expect(debug?.candidates[0]?.reachableArea).toBeGreaterThan(0);
    expect(debug?.candidates[0]?.crashDistance).toBeGreaterThanOrEqual(0);
    expect(debug?.candidates[0]?.totalScore).toBeGreaterThan(Number.NEGATIVE_INFINITY);
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
          cell(10, 6, 5),
          cell(10, 6, 4),
          cell(10, 6, 6),
        ],
      },
      p2: { head: { x: 4, y: 5 }, direction: 'right', trailCellIds: [cell(10, 4, 5)] },
    });

    const expert = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    expect(expert).not.toBe('right');
    expect(expert === 'up' || expert === 'down').toBe(true);
  });

  it('avoids entering a 1-cell dead corridor on expert', () => {
    const state = createRunningState(createTronGameState({
      columns: 12,
      rows: 10,
      countdownTicks: 0,
      seed: 91,
      activePlayerIds: ['p1', 'p2', 'p3'],
    }));
    const corridorTrail = [
      cell(12, 7, 4),
      cell(12, 8, 4),
      cell(12, 9, 4),
      cell(12, 10, 4),
      cell(12, 7, 6),
      cell(12, 8, 6),
      cell(12, 9, 6),
      cell(12, 10, 6),
      cell(12, 10, 5),
    ];
    const shaped = withPlayers(state, {
      p1: {
        head: { x: 1, y: 1 },
        direction: 'down',
        trailCellIds: [
          cell(12, 1, 1),
          ...corridorTrail,
        ],
      },
      p2: {
        head: { x: 6, y: 5 },
        direction: 'right',
        trailCellIds: [cell(12, 6, 5)],
      },
      p3: {
        head: { x: 10, y: 8 },
        direction: 'left',
        trailCellIds: [cell(12, 10, 8)],
      },
    });

    const expert = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    expect(expert).not.toBe('right');
  });

  it('chooses the larger reachable region over a smaller chamber', () => {
    const state = createRunningState(createTronGameState({
      columns: 12,
      rows: 10,
      countdownTicks: 0,
      seed: 33,
      activePlayerIds: ['p1', 'p2'],
    }));
    const shaped = withPlayers(state, {
      p1: {
        head: { x: 10, y: 8 },
        direction: 'left',
        trailCellIds: cells(12, [
          [10, 8],
          [6, 6],
          [5, 4],
          [7, 4],
          [5, 3],
          [7, 3],
          [6, 2],
        ]),
      },
      p2: {
        head: { x: 6, y: 5 },
        direction: 'right',
        trailCellIds: [cell(12, 6, 5)],
      },
    });

    const expert = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    expect(expert).toBe('right');
  });

  it('chooses a safe cutoff move that reduces opponent space', () => {
    const state = createRunningState(createTronGameState({
      columns: 12,
      rows: 10,
      countdownTicks: 0,
      seed: 58,
      activePlayerIds: ['p1', 'p2'],
    }));
    const shaped = withPlayers(state, {
      p1: {
        head: { x: 8, y: 4 },
        direction: 'left',
        trailCellIds: cells(12, [
          [8, 4],
          [5, 5],
          [6, 1],
          [6, 2],
          [6, 3],
          [7, 2],
          [8, 2],
          [9, 2],
          [10, 3],
          [10, 4],
          [10, 5],
          [9, 6],
          [8, 6],
          [7, 6],
        ]),
      },
      p2: {
        head: { x: 6, y: 5 },
        direction: 'up',
        trailCellIds: cells(12, [
          [6, 5],
          [6, 6],
          [6, 7],
        ]),
      },
    });

    const expert = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    expect(expert).toBe('up');
  });

  it('avoids left-right jitter in open space', () => {
    const state = createRunningState(createTronGameState({
      columns: 12,
      rows: 12,
      countdownTicks: 0,
      seed: 81,
      activePlayerIds: ['p1', 'p2'],
    }));
    const shaped = withPlayers(state, {
      p1: {
        head: { x: 10, y: 10 },
        direction: 'left',
        trailCellIds: [cell(12, 10, 10)],
      },
      p2: {
        head: { x: 7, y: 5 },
        direction: 'up',
        trailCellIds: cells(12, [
          [8, 6],
          [7, 6],
          [7, 5],
        ]),
      },
    });

    const expert = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    expect(expert).toBe('up');
  });

  it('keeps choosing legal moves after another rider has been eliminated', () => {
    const state = createRunningState(createTronGameState({
      columns: 10,
      rows: 10,
      countdownTicks: 0,
      seed: 19,
      activePlayerIds: ['p1', 'p2', 'p3'],
    }));
    const shaped = withPlayers(state, {
      p1: {
        alive: false,
        head: { x: 4, y: 4 },
        direction: 'up',
        trailCellIds: cells(10, [
          [4, 4],
          [4, 5],
          [4, 6],
        ]),
      },
      p2: {
        head: { x: 5, y: 5 },
        direction: 'right',
        trailCellIds: [cell(10, 5, 5)],
      },
      p3: {
        head: { x: 8, y: 8 },
        direction: 'left',
        trailCellIds: [cell(10, 8, 8)],
      },
    });

    const direction = pickCpuTurn({ state: shaped, playerId: 'p2', difficulty: 'expert' });

    expect(direction).not.toBeNull();
    expect(direction).not.toBe('left');
  });

  it('expert beats easy in a deterministic mirrored seed suite', () => {
    const seeds = [1, 2, 3, 4, 5, 6];
    let expertWins = 0;
    let easyWins = 0;

    seeds.forEach((seed) => {
      const firstWinner = runCpuRound({
        seed,
        difficulties: {
          p1: 'expert',
          p2: 'easy',
          p3: 'easy',
          p4: 'easy',
        },
      });
      if (firstWinner === 'p1') expertWins += 1;
      if (firstWinner === 'p2') easyWins += 1;

      const secondWinner = runCpuRound({
        seed,
        difficulties: {
          p1: 'easy',
          p2: 'expert',
          p3: 'easy',
          p4: 'easy',
        },
      });
      if (secondWinner === 'p2') expertWins += 1;
      if (secondWinner === 'p1') easyWins += 1;
    });

    expect(expertWins).toBeGreaterThan(6);
    expect(expertWins).toBeGreaterThan(easyWins);
  });
});
