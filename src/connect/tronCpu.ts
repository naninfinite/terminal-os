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
    aggressionWeight: 0.2,
    riskWeight: 1.0,
  },
  medium: {
    difficulty: 'medium',
    reactionDelayTicks: 2,
    lookaheadDepth: 2,
    searchBudget: 160,
    mistakeRate: 0.18,
    aggressionWeight: 0.45,
    riskWeight: 1.15,
  },
  hard: {
    difficulty: 'hard',
    reactionDelayTicks: 1,
    lookaheadDepth: 4,
    searchBudget: 260,
    mistakeRate: 0.07,
    aggressionWeight: 0.72,
    riskWeight: 1.3,
  },
  expert: {
    difficulty: 'expert',
    reactionDelayTicks: 0,
    lookaheadDepth: 5,
    searchBudget: 360,
    mistakeRate: 0,
    aggressionWeight: 1,
    riskWeight: 1.5,
  },
};

type CandidateScore = {
  direction: TronDirection;
  safe: boolean;
  survivesProjection: boolean;
  reachableSpace: number;
  territoryAdvantage: number;
  strongestOpponentSpace: number;
  contestedSpace: number;
  riskScore: number;
  pressureScore: number;
  futureScore: number;
  tacticalScore: number;
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

const createSearchBlockedCells = (state: TronGameState): Set<number> => {
  const blocked = getOccupiedCells(state);
  getAlivePlayerIds(state).forEach((playerId) => {
    blocked.delete(tronCellToId(state.columns, state.players[playerId].head));
  });
  return blocked;
};

const measureTerritoryControl = (args: {
  state: TronGameState;
  playerId: TronPlayerId;
  budget: number;
}): {
  ownedSpace: number;
  strongestOpponentSpace: number;
  contestedSpace: number;
} => {
  const { state, playerId, budget } = args;
  const alivePlayerIds = getAlivePlayerIds(state);
  if (!alivePlayerIds.includes(playerId)) {
    return {
      ownedSpace: 0,
      strongestOpponentSpace: 0,
      contestedSpace: 0,
    };
  }

  const blockedCells = createSearchBlockedCells(state);
  const ownerByCell = new Map<number, TronPlayerId | null>();
  const distanceByCell = new Map<number, number>();
  const queue: Array<{ cell: TronCell; owner: TronPlayerId; distance: number }> = [];

  alivePlayerIds.forEach((alivePlayerId) => {
    const head = state.players[alivePlayerId].head;
    const cellId = tronCellToId(state.columns, head);
    ownerByCell.set(cellId, alivePlayerId);
    distanceByCell.set(cellId, 0);
    queue.push({
      cell: head,
      owner: alivePlayerId,
      distance: 0,
    });
  });

  let cursor = 0;
  while (cursor < queue.length && distanceByCell.size < budget) {
    const current = queue[cursor]!;
    cursor += 1;

    for (const direction of ALL_DIRECTIONS) {
      const next = moveTronCell(current.cell, direction);
      if (!isWithinBounds(state, next)) continue;

      const nextId = tronCellToId(state.columns, next);
      if (blockedCells.has(nextId)) continue;

      const nextDistance = current.distance + 1;
      const knownDistance = distanceByCell.get(nextId);
      if (knownDistance == null) {
        distanceByCell.set(nextId, nextDistance);
        ownerByCell.set(nextId, current.owner);
        queue.push({
          cell: next,
          owner: current.owner,
          distance: nextDistance,
        });
        continue;
      }

      if (knownDistance === nextDistance && ownerByCell.get(nextId) !== current.owner) {
        ownerByCell.set(nextId, null);
      }
    }
  }

  let ownedSpace = 0;
  let contestedSpace = 0;
  const opponentSpaces = new Map<TronPlayerId, number>();

  ownerByCell.forEach((owner) => {
    if (owner === playerId) {
      ownedSpace += 1;
      return;
    }
    if (owner == null) {
      contestedSpace += 1;
      return;
    }
    opponentSpaces.set(owner, (opponentSpaces.get(owner) ?? 0) + 1);
  });

  return {
    ownedSpace,
    strongestOpponentSpace: Math.max(0, ...opponentSpaces.values()),
    contestedSpace,
  };
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
  if (left.survivesProjection !== right.survivesProjection) return left.survivesProjection ? -1 : 1;
  if (left.totalScore !== right.totalScore) return right.totalScore - left.totalScore;
  if (left.territoryAdvantage !== right.territoryAdvantage) {
    return right.territoryAdvantage - left.territoryAdvantage;
  }
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
      survivesProjection: false,
      reachableSpace: -1,
      territoryAdvantage: -10_000,
      strongestOpponentSpace: 10_000,
      contestedSpace: 10_000,
      riskScore: 10_000,
      pressureScore: -10_000,
      futureScore: -10_000,
      tacticalScore: -100_000,
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
      survivesProjection: false,
      reachableSpace: -1,
      territoryAdvantage: -10_000,
      strongestOpponentSpace: 10_000,
      contestedSpace: 10_000,
      riskScore: 10_000,
      pressureScore: -10_000,
      futureScore: -10_000,
      tacticalScore: -100_000,
      centerBias: -10_000,
      randomBias,
      totalScore: Number.NEGATIVE_INFINITY,
    };
  }

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

  const survivesProjection = projected.players[playerId].alive;
  if (!survivesProjection) {
    return {
      direction,
      safe: false,
      survivesProjection: false,
      reachableSpace: -1,
      territoryAdvantage: -10_000,
      strongestOpponentSpace: 10_000,
      contestedSpace: 10_000,
      riskScore: 10_000,
      pressureScore: -10_000,
      futureScore: -10_000,
      tacticalScore: -100_000,
      centerBias: -10_000,
      randomBias,
      totalScore: -100_000 + randomBias,
    };
  }

  const projectedBlockedForPlayer = createSearchBlockedCells(projected);
  const projectedHead = projected.players[playerId].head;
  const reachableSpace = measureReachableSpace({
    state: projected,
    origin: projectedHead,
    blockedCells: projectedBlockedForPlayer,
    budget: searchBudget,
  });
  const branches = countOpenBranches(projected, projectedHead, projectedBlockedForPlayer);
  const wallDistance = Math.min(
    projectedHead.x,
    projectedHead.y,
    (projected.columns - 1) - projectedHead.x,
    (projected.rows - 1) - projectedHead.y,
  );
  const territory = measureTerritoryControl({
    state: projected,
    playerId,
    budget: Math.max(64, searchBudget * Math.max(1, getAlivePlayerIds(projected).length)),
  });
  const territoryAdvantage = territory.ownedSpace - territory.strongestOpponentSpace - Math.floor(territory.contestedSpace / 2);
  const riskScore = (
    (branches <= 1 ? 24 : 0)
    + (branches === 2 ? 8 : 0)
    + Math.max(0, 4 - wallDistance) * 6
    + (territoryAdvantage < 0 ? Math.abs(territoryAdvantage) * 2 : 0)
  );
  const pressureScore = estimatePressureScore({
    state: projected,
    playerId,
    nextHead: projectedHead,
    searchBudget: Math.max(32, Math.floor(searchBudget / 2)),
  });
  const centerBias = getCenterBias(projected, projectedHead);
  let tacticalScore = 0;

  if (projected.phase === 'round_over' || projected.phase === 'match_over') {
    if (projected.roundResult?.winner === playerId) {
      tacticalScore += 8_000;
    } else if (projected.roundResult?.winner == null) {
      tacticalScore -= 1_500;
    } else {
      tacticalScore -= 8_000;
    }
  }

  if (reachableSpace <= Math.max(3, getAlivePlayerIds(projected).length + 1)) {
    tacticalScore -= 1_500;
  }
  if (territoryAdvantage > 0) {
    tacticalScore += Math.min(2_000, territoryAdvantage * 12);
  }

  let futureScore = 0;
  if (depth > 1 && projected.phase === 'running' && projected.players[playerId].alive) {
    const reducedBudget = Math.max(24, Math.floor(searchBudget / 2));
    if (reducedBudget > 24) {
      const nextOptions = candidateDirections(projected.players[playerId].direction)
        .filter((option, index, list) => list.indexOf(option) === index)
        .map((option) => evaluateMove({
          state: projected,
          playerId,
          direction: option,
          profile,
          depth: depth - 1,
          searchBudget: reducedBudget,
        }))
        .sort(compareCandidateScores);
      futureScore = nextOptions[0]?.totalScore ?? 0;
    }
  }

  const gatedPressureScore = territoryAdvantage > 0
    ? Math.min(pressureScore, territoryAdvantage)
    : Math.min(0, pressureScore);
  const totalScore = (
    tacticalScore
    + (reachableSpace * 24)
    + (territoryAdvantage * 18)
    - (riskScore * profile.riskWeight)
    + (gatedPressureScore * 4 * profile.aggressionWeight)
    + (futureScore * 0.2)
    + (centerBias * 0.3)
  );

  return {
    direction,
    safe: true,
    survivesProjection: true,
    reachableSpace,
    territoryAdvantage,
    strongestOpponentSpace: territory.strongestOpponentSpace,
    contestedSpace: territory.contestedSpace,
    riskScore,
    pressureScore: gatedPressureScore,
    futureScore,
    tacticalScore,
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
