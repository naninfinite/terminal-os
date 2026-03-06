import {
  isOppositeDirection,
  moveTronCell,
  queueTurn,
  stepTronGame,
  tronCellToId,
  turnLeft,
  turnRight,
} from './tronEngine';
import type {
  TronCell,
  TronCpuDifficulty,
  TronCpuProfile,
  TronDirection,
  TronGameState,
  TronPlayerId,
} from './types';

export const TRON_CPU_PROFILES: Record<TronCpuDifficulty, TronCpuProfile> = {
  easy: {
    difficulty: 'easy',
    reactionDelayTicks: 3,
    lookaheadDepth: 1,
    searchBudget: 96,
    mistakeRate: 0.35,
    aggressionWeight: 0.35,
    riskWeight: 1.2,
  },
  medium: {
    difficulty: 'medium',
    reactionDelayTicks: 2,
    lookaheadDepth: 2,
    searchBudget: 160,
    mistakeRate: 0.18,
    aggressionWeight: 0.55,
    riskWeight: 1.05,
  },
  hard: {
    difficulty: 'hard',
    reactionDelayTicks: 1,
    lookaheadDepth: 3,
    searchBudget: 240,
    mistakeRate: 0.08,
    aggressionWeight: 0.8,
    riskWeight: 0.92,
  },
  expert: {
    difficulty: 'expert',
    reactionDelayTicks: 0,
    lookaheadDepth: 4,
    searchBudget: 320,
    mistakeRate: 0.02,
    aggressionWeight: 1.1,
    riskWeight: 0.8,
  },
};

type CandidateScore = {
  direction: TronDirection;
  safe: boolean;
  reachableSpace: number;
  riskScore: number;
  pressureScore: number;
  futureScore: number;
  centerBias: number;
  randomBias: number;
  totalScore: number;
};

const ALL_DIRECTIONS: TronDirection[] = ['up', 'right', 'down', 'left'];

const candidateDirections = (direction: TronDirection): TronDirection[] => [
  direction,
  turnLeft(direction),
  turnRight(direction),
];

const getAlivePlayerIds = (state: TronGameState): TronPlayerId[] => (
  state.activePlayerIds.filter((playerId) => state.players[playerId].alive)
);

const getOccupiedCells = (state: TronGameState): Set<number> => {
  const occupied = new Set<number>();
  state.activePlayerIds.forEach((playerId) => {
    state.players[playerId].trailCellIds.forEach((cellId) => occupied.add(cellId));
  });
  return occupied;
};

const isWithinBounds = (state: TronGameState, cell: TronCell): boolean => (
  cell.x >= 0
  && cell.x < state.columns
  && cell.y >= 0
  && cell.y < state.rows
);

const isSafeDirection = (state: TronGameState, playerId: TronPlayerId, direction: TronDirection): boolean => {
  const player = state.players[playerId];
  if (!player.alive) return false;
  if (isOppositeDirection(player.direction, direction)) return false;

  const nextCell = moveTronCell(player.head, direction);
  if (!isWithinBounds(state, nextCell)) return false;
  return !getOccupiedCells(state).has(tronCellToId(state.columns, nextCell));
};

const measureReachableSpace = (args: {
  state: TronGameState;
  origin: TronCell;
  blockedCells: Set<number>;
  budget: number;
}): number => {
  const { state, origin, blockedCells, budget } = args;
  if (!isWithinBounds(state, origin)) return 0;

  const startId = tronCellToId(state.columns, origin);
  if (blockedCells.has(startId)) return 0;

  const visited = new Set<number>([startId]);
  const queue: TronCell[] = [{ ...origin }];
  let cursor = 0;

  while (cursor < queue.length && visited.size < budget) {
    const current = queue[cursor]!;
    cursor += 1;

    for (const direction of ALL_DIRECTIONS) {
      const next = moveTronCell(current, direction);
      if (!isWithinBounds(state, next)) continue;
      const nextId = tronCellToId(state.columns, next);
      if (blockedCells.has(nextId) || visited.has(nextId)) continue;
      visited.add(nextId);
      queue.push(next);
      if (visited.size >= budget) break;
    }
  }

  return visited.size;
};

const countOpenBranches = (state: TronGameState, cell: TronCell, blockedCells: Set<number>): number => {
  let branches = 0;
  for (const direction of ALL_DIRECTIONS) {
    const next = moveTronCell(cell, direction);
    if (!isWithinBounds(state, next)) continue;
    if (blockedCells.has(tronCellToId(state.columns, next))) continue;
    branches += 1;
  }
  return branches;
};

const getCenterBias = (state: TronGameState, cell: TronCell): number => {
  const centerX = (state.columns - 1) / 2;
  const centerY = (state.rows - 1) / 2;
  return -(
    Math.abs(centerX - cell.x)
    + Math.abs(centerY - cell.y)
  );
};

const seededUnit = (seed: number, tick: number, playerId: TronPlayerId, tag: string): number => {
  const raw = `${seed}:${tick}:${playerId}:${tag}`;
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x1_0000_0000;
};

const predictOpponentDirection = (
  state: TronGameState,
  playerId: TronPlayerId,
  searchBudget: number,
): TronDirection => {
  const player = state.players[playerId];
  const occupied = getOccupiedCells(state);
  const ranked = candidateDirections(player.direction)
    .filter((direction, index, list) => list.indexOf(direction) === index)
    .map((direction) => {
      if (isOppositeDirection(player.direction, direction)) {
        return { direction, safe: false, score: Number.NEGATIVE_INFINITY };
      }
      const nextHead = moveTronCell(player.head, direction);
      if (!isWithinBounds(state, nextHead)) {
        return { direction, safe: false, score: Number.NEGATIVE_INFINITY };
      }
      const nextId = tronCellToId(state.columns, nextHead);
      if (occupied.has(nextId)) {
        return { direction, safe: false, score: Number.NEGATIVE_INFINITY };
      }
      const blocked = new Set<number>(occupied);
      const area = measureReachableSpace({
        state,
        origin: nextHead,
        blockedCells: blocked,
        budget: Math.max(24, Math.floor(searchBudget / 2)),
      });
      const branches = countOpenBranches(state, nextHead, blocked);
      return {
        direction,
        safe: true,
        score: (area * 8) + (branches * 12) + getCenterBias(state, nextHead),
      };
    })
    .sort((left, right) => right.score - left.score);

  return ranked.find((entry) => entry.safe)?.direction ?? player.direction;
};

const estimatePressureScore = (args: {
  state: TronGameState;
  playerId: TronPlayerId;
  nextHead: TronCell;
  searchBudget: number;
}): number => {
  const { state, playerId, nextHead, searchBudget } = args;
  const occupied = getOccupiedCells(state);
  const nextHeadId = tronCellToId(state.columns, nextHead);
  let total = 0;

  getAlivePlayerIds(state).forEach((otherId) => {
    if (otherId === playerId) return;

    const predictedDirection = predictOpponentDirection(state, otherId, searchBudget);
    const predictedHead = moveTronCell(state.players[otherId].head, predictedDirection);
    if (!isWithinBounds(state, predictedHead)) {
      total += 10;
      return;
    }

    const baselineSpace = measureReachableSpace({
      state,
      origin: predictedHead,
      blockedCells: occupied,
      budget: searchBudget,
    });

    const pressuredCells = new Set<number>(occupied);
    pressuredCells.add(nextHeadId);
    const pressuredSpace = measureReachableSpace({
      state,
      origin: predictedHead,
      blockedCells: pressuredCells,
      budget: searchBudget,
    });

    const distance = Math.abs(nextHead.x - state.players[otherId].head.x) + Math.abs(nextHead.y - state.players[otherId].head.y);
    total += (baselineSpace - pressuredSpace) + Math.max(0, 6 - distance);
  });

  return total;
};

const buildProjectedState = (
  state: TronGameState,
  plannedTurns: Array<{ playerId: TronPlayerId; direction: TronDirection }>,
): TronGameState => {
  let queued = state;
  plannedTurns.forEach((turn) => {
    queued = queueTurn(queued, turn.playerId, turn.direction, state.tick + 1);
  });
  return stepTronGame(queued).state;
};

const compareCandidateScores = (left: CandidateScore, right: CandidateScore): number => {
  if (left.safe !== right.safe) return left.safe ? -1 : 1;
  if (left.totalScore !== right.totalScore) return right.totalScore - left.totalScore;
  if (left.reachableSpace !== right.reachableSpace) return right.reachableSpace - left.reachableSpace;
  if (left.pressureScore !== right.pressureScore) return right.pressureScore - left.pressureScore;
  if (left.riskScore !== right.riskScore) return left.riskScore - right.riskScore;
  return right.randomBias - left.randomBias;
};

const evaluateMove = (args: {
  state: TronGameState;
  playerId: TronPlayerId;
  direction: TronDirection;
  profile: TronCpuProfile;
  depth: number;
  searchBudget: number;
}): CandidateScore => {
  const { state, playerId, direction, profile, depth, searchBudget } = args;
  const player = state.players[playerId];
  const randomBias = seededUnit(state.seed, state.tick, playerId, direction);

  if (isOppositeDirection(player.direction, direction)) {
    return {
      direction,
      safe: false,
      reachableSpace: -1,
      riskScore: 10_000,
      pressureScore: -10_000,
      futureScore: -10_000,
      centerBias: -10_000,
      randomBias,
      totalScore: Number.NEGATIVE_INFINITY,
    };
  }

  const nextHead = moveTronCell(player.head, direction);
  const occupied = getOccupiedCells(state);
  const nextHeadId = tronCellToId(state.columns, nextHead);
  const safe = isWithinBounds(state, nextHead) && !occupied.has(nextHeadId);

  if (!safe) {
    return {
      direction,
      safe: false,
      reachableSpace: -1,
      riskScore: 10_000,
      pressureScore: -10_000,
      futureScore: -10_000,
      centerBias: -10_000,
      randomBias,
      totalScore: Number.NEGATIVE_INFINITY,
    };
  }

  const blockedForPlayer = new Set<number>(occupied);
  const reachableSpace = measureReachableSpace({
    state,
    origin: nextHead,
    blockedCells: blockedForPlayer,
    budget: searchBudget,
  });
  const branches = countOpenBranches(state, nextHead, blockedForPlayer);
  const wallDistance = Math.min(
    nextHead.x,
    nextHead.y,
    (state.columns - 1) - nextHead.x,
    (state.rows - 1) - nextHead.y,
  );
  const riskScore = (
    (branches <= 1 ? 24 : 0)
    + (branches === 2 ? 8 : 0)
    + Math.max(0, 4 - wallDistance) * 6
  );
  const pressureScore = estimatePressureScore({
    state,
    playerId,
    nextHead,
    searchBudget: Math.max(32, Math.floor(searchBudget / 2)),
  });
  const centerBias = getCenterBias(state, nextHead);

  let futureScore = 0;
  if (depth > 1) {
    const opponentTurns = getAlivePlayerIds(state)
      .filter((otherId) => otherId !== playerId)
      .map((otherId) => ({
        playerId: otherId,
        direction: predictOpponentDirection(state, otherId, Math.max(24, Math.floor(searchBudget / 2))),
      }));

    const projected = buildProjectedState(state, [
      { playerId, direction },
      ...opponentTurns,
    ]);

    if (projected.phase === 'round_over' || projected.phase === 'match_over') {
      if (projected.roundResult?.winner === playerId) {
        futureScore = 5_000;
      } else if (projected.players[playerId].alive) {
        futureScore = 250;
      } else {
        futureScore = -5_000;
      }
    } else if (projected.players[playerId].alive) {
      const nextOptions = candidateDirections(projected.players[playerId].direction)
        .filter((option, index, list) => list.indexOf(option) === index)
        .map((option) => evaluateMove({
          state: projected,
          playerId,
          direction: option,
          profile,
          depth: depth - 1,
          searchBudget: Math.max(24, Math.floor(searchBudget / 2)),
        }))
        .sort(compareCandidateScores);
      futureScore = nextOptions[0]?.totalScore ?? 0;
    } else {
      futureScore = -5_000;
    }
  }

  const totalScore = (
    (reachableSpace * 18)
    - (riskScore * profile.riskWeight)
    + (pressureScore * 9 * profile.aggressionWeight)
    + (futureScore * 0.12)
    + (centerBias * 0.5)
  );

  return {
    direction,
    safe,
    reachableSpace,
    riskScore,
    pressureScore,
    futureScore,
    centerBias,
    randomBias,
    totalScore,
  };
};

export const pickCpuTurn = (args: {
  state: TronGameState;
  playerId: TronPlayerId;
  difficulty: TronCpuDifficulty;
}): TronDirection | null => {
  const { state, playerId, difficulty } = args;
  const player = state.players[playerId];
  if (!player.alive || state.phase !== 'running') return null;
  if (!state.activePlayerIds.includes(playerId)) return null;

  const profile = TRON_CPU_PROFILES[difficulty];
  const ranked = candidateDirections(player.direction)
    .filter((direction, index, list) => list.indexOf(direction) === index)
    .map((direction) => evaluateMove({
      state,
      playerId,
      direction,
      profile,
      depth: profile.lookaheadDepth,
      searchBudget: profile.searchBudget,
    }))
    .sort(compareCandidateScores);

  if (ranked.length === 0) return null;

  const safePool = ranked.filter((entry) => entry.safe);
  const pool = safePool.length > 0 ? safePool : ranked;
  const mistakeRoll = seededUnit(state.seed, state.tick, playerId, `mistake:${player.direction}`);

  if (pool.length > 1 && mistakeRoll < profile.mistakeRate) {
    const fallbackIndex = mistakeRoll < (profile.mistakeRate / 2) ? 1 : Math.min(2, pool.length - 1);
    return pool[fallbackIndex]?.direction ?? pool[0]!.direction;
  }

  return pool[0]!.direction;
};
