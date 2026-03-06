import {
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
    rolloutCandidates: 1,
    randomness: 0.25,
    weights: {
      reachableArea: 1.0,
      liberties: 0.8,
      corridorRisk: -1.1,
      opponentPressure: 0.2,
      cutoffPotential: 0.2,
      centerBias: 0.2,
      antiJitter: 0.2,
      forcedDeathRisk: -10,
    },
  },
  medium: {
    difficulty: 'medium',
    reactionDelayTicks: 2,
    lookaheadDepth: 2,
    rolloutCandidates: 2,
    randomness: 0.12,
    weights: {
      reachableArea: 1.3,
      liberties: 1.0,
      corridorRisk: -1.4,
      opponentPressure: 0.6,
      cutoffPotential: 0.7,
      centerBias: 0.3,
      antiJitter: 0.25,
      forcedDeathRisk: -14,
    },
  },
  hard: {
    difficulty: 'hard',
    reactionDelayTicks: 1,
    lookaheadDepth: 4,
    rolloutCandidates: 2,
    randomness: 0.04,
    weights: {
      reachableArea: 1.7,
      liberties: 1.2,
      corridorRisk: -1.8,
      opponentPressure: 1.0,
      cutoffPotential: 1.3,
      centerBias: 0.25,
      antiJitter: 0.3,
      forcedDeathRisk: -18,
    },
  },
  expert: {
    difficulty: 'expert',
    reactionDelayTicks: 0,
    lookaheadDepth: 6,
    rolloutCandidates: 3,
    randomness: 0,
    weights: {
      reachableArea: 2.0,
      liberties: 1.5,
      corridorRisk: -2.0,
      opponentPressure: 1.4,
      cutoffPotential: 1.8,
      centerBias: 0.2,
      antiJitter: 0.35,
      forcedDeathRisk: -24,
    },
  },
};

type TurnSign = 'left' | 'right' | 'straight' | null;

type StateAnalysis = {
  alivePlayerIds: TronPlayerId[];
  occupiedCells: Set<number>;
  traversableBlockedCells: Set<number>;
  componentSizeByCell: Map<number, number>;
  largestComponentSize: number;
  reachableAreaByPlayer: Map<TronPlayerId, number>;
};

type DecisionContext = {
  state: TronGameState;
  playerId: TronPlayerId;
  profile: TronCpuProfile;
  baselineAnalysis: StateAnalysis;
  previousTurnSign: TurnSign;
};

type CandidateMove = {
  direction: TronDirection;
  nextHead: TronCell;
  nextHeadId: number;
  immediateDeath: boolean;
  survivesProjection: boolean;
  forcedDeathRisk: number;
  projectedState: TronGameState;
  projectedAnalysis: StateAnalysis | null;
  reachableArea: number;
  liberties: number;
  corridorRisk: number;
  opponentPressure: number;
  cutoffPotential: number;
  centerBias: number;
  antiJitter: number;
  rolloutScore: number;
  randomBias: number;
  totalScore: number;
};

type SimulationMove = {
  direction: TronDirection;
  safe: boolean;
  reachableArea: number;
  liberties: number;
  centerBias: number;
  straightBias: number;
  randomBias: number;
};

const ALL_DIRECTIONS: TronDirection[] = ['up', 'right', 'down', 'left'];
const RANDOMNESS_WINDOW = 24;
const TERMINAL_WIN_SCORE = 10_000;
const TERMINAL_DRAW_SCORE = -50_000;
const TERMINAL_LOSS_SCORE = -100_000;

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

const createTraversableBlockedCells = (state: TronGameState, occupied = getOccupiedCells(state)): Set<number> => {
  const blocked = new Set<number>(occupied);
  getAlivePlayerIds(state).forEach((playerId) => {
    blocked.delete(tronCellToId(state.columns, state.players[playerId].head));
  });
  return blocked;
};

const floodFillArea = (
  state: TronGameState,
  origin: TronCell,
  blockedCells: Set<number>,
): number => {
  if (!isWithinBounds(state, origin)) return 0;

  const startId = tronCellToId(state.columns, origin);
  if (blockedCells.has(startId)) return 0;

  const visited = new Set<number>([startId]);
  const queue: TronCell[] = [{ ...origin }];
  let cursor = 0;

  while (cursor < queue.length) {
    const current = queue[cursor]!;
    cursor += 1;

    for (const direction of ALL_DIRECTIONS) {
      const next = moveTronCell(current, direction);
      if (!isWithinBounds(state, next)) continue;
      const nextId = tronCellToId(state.columns, next);
      if (blockedCells.has(nextId) || visited.has(nextId)) continue;
      visited.add(nextId);
      queue.push(next);
    }
  }

  return visited.size;
};

const analyzeOpenComponents = (
  state: TronGameState,
  blockedCells: Set<number>,
): {
  componentSizeByCell: Map<number, number>;
  largestComponentSize: number;
} => {
  const componentSizeByCell = new Map<number, number>();
  let largestComponentSize = 0;

  for (let y = 0; y < state.rows; y += 1) {
    for (let x = 0; x < state.columns; x += 1) {
      const cellId = tronCellToId(state.columns, { x, y });
      if (blockedCells.has(cellId) || componentSizeByCell.has(cellId)) continue;

      const queue: TronCell[] = [{ x, y }];
      const component: number[] = [cellId];
      componentSizeByCell.set(cellId, 0);
      let cursor = 0;

      while (cursor < queue.length) {
        const current = queue[cursor]!;
        cursor += 1;

        for (const direction of ALL_DIRECTIONS) {
          const next = moveTronCell(current, direction);
          if (!isWithinBounds(state, next)) continue;
          const nextId = tronCellToId(state.columns, next);
          if (blockedCells.has(nextId) || componentSizeByCell.has(nextId)) continue;
          componentSizeByCell.set(nextId, 0);
          component.push(nextId);
          queue.push(next);
        }
      }

      largestComponentSize = Math.max(largestComponentSize, component.length);
      component.forEach((componentCellId) => {
        componentSizeByCell.set(componentCellId, component.length);
      });
    }
  }

  return {
    componentSizeByCell,
    largestComponentSize,
  };
};

const analyzeState = (state: TronGameState): StateAnalysis => {
  const alivePlayerIds = getAlivePlayerIds(state);
  const occupiedCells = getOccupiedCells(state);
  const traversableBlockedCells = createTraversableBlockedCells(state, occupiedCells);
  const components = analyzeOpenComponents(state, traversableBlockedCells);
  const reachableAreaByPlayer = new Map<TronPlayerId, number>();

  alivePlayerIds.forEach((playerId) => {
    const headId = tronCellToId(state.columns, state.players[playerId].head);
    reachableAreaByPlayer.set(playerId, components.componentSizeByCell.get(headId) ?? 0);
  });

  return {
    alivePlayerIds,
    occupiedCells,
    traversableBlockedCells,
    componentSizeByCell: components.componentSizeByCell,
    largestComponentSize: components.largestComponentSize,
    reachableAreaByPlayer,
  };
};

const countLiberties = (
  state: TronGameState,
  cell: TronCell,
  blockedCells: Set<number>,
): number => {
  let liberties = 0;

  for (const direction of ALL_DIRECTIONS) {
    const next = moveTronCell(cell, direction);
    if (!isWithinBounds(state, next)) continue;
    if (blockedCells.has(tronCellToId(state.columns, next))) continue;
    liberties += 1;
  }

  return liberties;
};

const getOpenNeighbors = (
  state: TronGameState,
  cell: TronCell,
  blockedCells: Set<number>,
  previous: TronCell | null = null,
): TronCell[] => ALL_DIRECTIONS
  .map((direction) => moveTronCell(cell, direction))
  .filter((next) => {
    if (!isWithinBounds(state, next)) return false;
    if (previous && next.x === previous.x && next.y === previous.y) return false;
    return !blockedCells.has(tronCellToId(state.columns, next));
  });

const probeTunnelLength = (
  state: TronGameState,
  origin: TronCell,
  blockedCells: Set<number>,
  maxDepth: number,
): number => {
  let previous: TronCell | null = null;
  let current = origin;
  let length = 0;

  while (length < maxDepth) {
    const exits = getOpenNeighbors(state, current, blockedCells, previous);
    if (exits.length !== 1) break;
    length += 1;
    previous = current;
    current = exits[0]!;
  }

  return length;
};

const estimateCorridorRisk = (
  state: TronGameState,
  cell: TronCell,
  blockedCells: Set<number>,
): number => {
  const liberties = countLiberties(state, cell, blockedCells);
  if (liberties === 0) return 12;
  if (liberties === 1) return 8;
  if (liberties >= 3) return 0;

  const exits = getOpenNeighbors(state, cell, blockedCells);
  if (exits.length !== 2) return 1;

  const tunnelLength = exits.reduce((sum, exit) => (
    sum + probeTunnelLength(state, exit, blockedCells, 3)
  ), 0) / exits.length;

  return tunnelLength > 0 ? (2 + (tunnelLength * 2)) : 1;
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

const directionFromCells = (from: TronCell, to: TronCell): TronDirection | null => {
  if (to.x === from.x && to.y === from.y - 1) return 'up';
  if (to.x === from.x + 1 && to.y === from.y) return 'right';
  if (to.x === from.x && to.y === from.y + 1) return 'down';
  if (to.x === from.x - 1 && to.y === from.y) return 'left';
  return null;
};

const inferPreviousTurnSign = (state: TronGameState, playerId: TronPlayerId): TurnSign => {
  const trail = state.players[playerId].trailCellIds;
  if (trail.length < 3) return null;

  const first = trail[trail.length - 3];
  const second = trail[trail.length - 2];
  const third = trail[trail.length - 1];
  if (first == null || second == null || third == null) return null;

  const before = directionFromCells(
    {
      x: first % state.columns,
      y: Math.floor(first / state.columns),
    },
    {
      x: second % state.columns,
      y: Math.floor(second / state.columns),
    },
  );
  const after = directionFromCells(
    {
      x: second % state.columns,
      y: Math.floor(second / state.columns),
    },
    {
      x: third % state.columns,
      y: Math.floor(third / state.columns),
    },
  );

  if (!before || !after) return null;
  if (before === after) return 'straight';
  if (turnLeft(before) === after) return 'left';
  if (turnRight(before) === after) return 'right';
  return null;
};

const getResolvedQueuedDirectionForTick = (
  state: TronGameState,
  playerId: TronPlayerId,
  targetTick: number,
): { direction: TronDirection; queued: boolean } => {
  let direction = state.players[playerId].direction;
  let queued = false;

  for (const turn of state.pendingInputs) {
    if (turn.playerId !== playerId || turn.tick > targetTick) continue;
    if (turn.direction === direction) {
      queued = true;
      continue;
    }
    if (
      (direction === 'up' && turn.direction === 'down')
      || (direction === 'down' && turn.direction === 'up')
      || (direction === 'left' && turn.direction === 'right')
      || (direction === 'right' && turn.direction === 'left')
    ) {
      continue;
    }
    direction = turn.direction;
    queued = true;
  }

  return { direction, queued };
};

const applyTurnsForNextTick = (
  state: TronGameState,
  turns: Array<{ playerId: TronPlayerId; direction: TronDirection }>,
): TronGameState => {
  let queued = state;
  turns.forEach((turn) => {
    queued = queueTurn(queued, turn.playerId, turn.direction, state.tick + 1);
  });
  return stepTronGame(queued).state;
};

const getHypotheticalTraversableBlockedCells = (
  state: TronGameState,
  playerId: TronPlayerId,
  occupiedCells = getOccupiedCells(state),
): Set<number> => {
  const blocked = createTraversableBlockedCells(state, occupiedCells);
  blocked.add(tronCellToId(state.columns, state.players[playerId].head));
  return blocked;
};

const compareSimulationMoves = (left: SimulationMove, right: SimulationMove): number => {
  if (left.safe !== right.safe) return left.safe ? -1 : 1;
  if (left.reachableArea !== right.reachableArea) return right.reachableArea - left.reachableArea;
  if (left.liberties !== right.liberties) return right.liberties - left.liberties;
  if (left.centerBias !== right.centerBias) return right.centerBias - left.centerBias;
  if (left.straightBias !== right.straightBias) return right.straightBias - left.straightBias;
  return right.randomBias - left.randomBias;
};

const chooseSimulationDirection = (
  state: TronGameState,
  playerId: TronPlayerId,
  tag: string,
): TronDirection => {
  const player = state.players[playerId];
  const occupiedCells = getOccupiedCells(state);
  const hypotheticalBlocked = getHypotheticalTraversableBlockedCells(state, playerId, occupiedCells);

  const ranked = candidateDirections(player.direction).map((direction) => {
    const nextHead = moveTronCell(player.head, direction);
    const nextHeadId = tronCellToId(state.columns, nextHead);
    const safe = isWithinBounds(state, nextHead) && !occupiedCells.has(nextHeadId);
    if (!safe) {
      return {
        direction,
        safe: false,
        reachableArea: -1,
        liberties: -1,
        centerBias: -1_000,
        straightBias: 0,
        randomBias: seededUnit(state.seed, state.tick, playerId, `${tag}:${direction}`),
      };
    }

    return {
      direction,
      safe: true,
      reachableArea: floodFillArea(state, nextHead, hypotheticalBlocked),
      liberties: countLiberties(state, nextHead, occupiedCells),
      centerBias: getCenterBias(state, nextHead),
      straightBias: direction === player.direction ? 1 : 0,
      randomBias: seededUnit(state.seed, state.tick, playerId, `${tag}:${direction}`),
    };
  }).sort(compareSimulationMoves);

  return ranked[0]?.direction ?? player.direction;
};

const buildTurnsForNextTick = (args: {
  state: TronGameState;
  overrides: Map<TronPlayerId, TronDirection>;
  tag: string;
}): Array<{ playerId: TronPlayerId; direction: TronDirection }> => {
  const { state, overrides, tag } = args;
  const nextTick = state.tick + 1;

  return getAlivePlayerIds(state).map((playerId) => {
    const override = overrides.get(playerId);
    if (override) {
      return { playerId, direction: override };
    }

    const queued = getResolvedQueuedDirectionForTick(state, playerId, nextTick);
    if (queued.queued) {
      return { playerId, direction: queued.direction };
    }

    return {
      playerId,
      direction: chooseSimulationDirection(state, playerId, `${tag}:${playerId}`),
    };
  });
};

const getSafetyRank = (candidate: CandidateMove): number => {
  if (candidate.immediateDeath || !candidate.survivesProjection) return 2;
  return candidate.forcedDeathRisk;
};

const hasNonFatalResponse = (
  state: TronGameState,
  playerId: TronPlayerId,
): boolean => {
  if (state.phase !== 'running' || !state.players[playerId].alive) return false;

  const occupiedCells = getOccupiedCells(state);
  return candidateDirections(state.players[playerId].direction).some((direction) => {
    const nextHead = moveTronCell(state.players[playerId].head, direction);
    const nextHeadId = tronCellToId(state.columns, nextHead);
    if (!isWithinBounds(state, nextHead) || occupiedCells.has(nextHeadId)) return false;

    const projectedState = applyTurnsForNextTick(state, buildTurnsForNextTick({
      state,
      overrides: new Map<TronPlayerId, TronDirection>([[playerId, direction]]),
      tag: `reply:${playerId}:${direction}`,
    }));

    return projectedState.players[playerId].alive;
  });
};

const buildDecisionContext = (
  state: TronGameState,
  playerId: TronPlayerId,
  profile: TronCpuProfile,
): DecisionContext => ({
  state,
  playerId,
  profile,
  baselineAnalysis: analyzeState(state),
  previousTurnSign: inferPreviousTurnSign(state, playerId),
});

const buildCandidateMoves = (
  state: TronGameState,
  playerId: TronPlayerId,
  _profile: TronCpuProfile,
): CandidateMove[] => {
  const occupiedCells = getOccupiedCells(state);
  const player = state.players[playerId];

  return candidateDirections(player.direction).map((direction) => {
    const nextHead = moveTronCell(player.head, direction);
    const nextHeadId = tronCellToId(state.columns, nextHead);
    const immediateDeath = !isWithinBounds(state, nextHead) || occupiedCells.has(nextHeadId);
    const projectedState = applyTurnsForNextTick(state, buildTurnsForNextTick({
      state,
      overrides: new Map<TronPlayerId, TronDirection>([[playerId, direction]]),
      tag: `project:${playerId}:${direction}`,
    }));

    return {
      direction,
      nextHead,
      nextHeadId,
      immediateDeath,
      survivesProjection: projectedState.players[playerId].alive,
      forcedDeathRisk: 2,
      projectedState,
      projectedAnalysis: null,
      reachableArea: 0,
      liberties: 0,
      corridorRisk: 0,
      opponentPressure: 0,
      cutoffPotential: 0,
      centerBias: 0,
      antiJitter: 0,
      rolloutScore: 0,
      randomBias: 0,
      totalScore: Number.NEGATIVE_INFINITY,
    };
  });
};

const filterSafeMoves = (
  candidates: CandidateMove[],
  _gameState: TronGameState,
  bot: { id: TronPlayerId },
  _profile: TronCpuProfile,
): CandidateMove[] => {
  const withRisk = candidates.map((candidate) => {
    if (candidate.immediateDeath || !candidate.survivesProjection) {
      return {
        ...candidate,
        forcedDeathRisk: 2,
      };
    }

    return {
      ...candidate,
      forcedDeathRisk: hasNonFatalResponse(candidate.projectedState, bot.id) ? 0 : 1,
    };
  });

  const safestRank = Math.min(...withRisk.map(getSafetyRank));
  return withRisk.filter((candidate) => getSafetyRank(candidate) === safestRank);
};

const estimateOpponentPressure = (
  candidate: CandidateMove,
  context: DecisionContext,
): number => {
  const { baselineAnalysis, playerId } = context;
  const projectedAnalysis = candidate.projectedAnalysis!;
  let pressure = 0;

  baselineAnalysis.alivePlayerIds.forEach((otherId) => {
    if (otherId === playerId) return;

    const baselineArea = baselineAnalysis.reachableAreaByPlayer.get(otherId) ?? 0;
    const projectedArea = candidate.projectedState.players[otherId].alive
      ? (projectedAnalysis.reachableAreaByPlayer.get(otherId) ?? 0)
      : 0;

    pressure += Math.max(0, baselineArea - projectedArea);
    if (!candidate.projectedState.players[otherId].alive) {
      pressure += 12;
    }
  });

  return pressure;
};

const estimateCutoffPotential = (
  candidate: CandidateMove,
  context: DecisionContext,
): number => {
  const { baselineAnalysis, playerId } = context;
  const projectedAnalysis = candidate.projectedAnalysis!;
  const myBaseline = baselineAnalysis.reachableAreaByPlayer.get(playerId) ?? 0;
  const myProjected = projectedAnalysis.reachableAreaByPlayer.get(playerId) ?? 0;
  const selfLoss = Math.max(0, myBaseline - myProjected);
  let opponentShrink = 0;
  let largestRegionBonus = 0;

  baselineAnalysis.alivePlayerIds.forEach((otherId) => {
    if (otherId === playerId) return;

    const baselineSize = baselineAnalysis.reachableAreaByPlayer.get(otherId) ?? 0;
    const projectedSize = candidate.projectedState.players[otherId].alive
      ? (projectedAnalysis.reachableAreaByPlayer.get(otherId) ?? 0)
      : 0;

    opponentShrink += Math.max(0, baselineSize - projectedSize);
    const ownedLargestBefore = baselineSize === baselineAnalysis.largestComponentSize;
    const losesLargestAfter = projectedSize < projectedAnalysis.largestComponentSize;
    if (ownedLargestBefore && losesLargestAfter) {
      largestRegionBonus += Math.max(0, baselineAnalysis.largestComponentSize - projectedSize);
    }
  });

  if (myProjected === projectedAnalysis.largestComponentSize) {
    largestRegionBonus += 1;
  }

  return Math.max(0, opponentShrink - selfLoss) + largestRegionBonus;
};

const getAntiJitterScore = (
  context: DecisionContext,
  direction: TronDirection,
): number => {
  const currentDirection = context.state.players[context.playerId].direction;
  if (direction === currentDirection) return 1;

  if (
    context.previousTurnSign === 'left'
    && direction === turnRight(currentDirection)
  ) {
    return -1;
  }

  if (
    context.previousTurnSign === 'right'
    && direction === turnLeft(currentDirection)
  ) {
    return -1;
  }

  return 0;
};

const evaluateTerminalCandidate = (
  candidate: CandidateMove,
  context: DecisionContext,
): CandidateMove => {
  const winner = candidate.projectedState.roundResult?.winner ?? null;
  let totalScore = TERMINAL_LOSS_SCORE;
  if (winner === context.playerId) {
    totalScore = TERMINAL_WIN_SCORE;
  } else if (winner == null && candidate.projectedState.phase !== 'running') {
    totalScore = TERMINAL_DRAW_SCORE;
  }

  return {
    ...candidate,
    antiJitter: getAntiJitterScore(context, candidate.direction),
    totalScore,
  };
};

const evaluateCandidate = (
  candidate: CandidateMove,
  bot: { id: TronPlayerId },
  _gameState: TronGameState,
  profile: TronCpuProfile,
  context: DecisionContext,
): CandidateMove => {
  if (!candidate.survivesProjection) {
    return evaluateTerminalCandidate(candidate, context);
  }

  const projectedAnalysis = analyzeState(candidate.projectedState);
  const projectedHead = candidate.projectedState.players[bot.id].head;
  const reachableArea = projectedAnalysis.reachableAreaByPlayer.get(bot.id) ?? 0;
  const liberties = countLiberties(candidate.projectedState, projectedHead, projectedAnalysis.occupiedCells);
  const corridorRisk = estimateCorridorRisk(candidate.projectedState, projectedHead, projectedAnalysis.occupiedCells);
  const opponentPressure = estimateOpponentPressure({
    ...candidate,
    projectedAnalysis,
  }, context);
  const cutoffPotential = estimateCutoffPotential({
    ...candidate,
    projectedAnalysis,
  }, context);
  const centerBias = getCenterBias(candidate.projectedState, projectedHead);
  const antiJitter = getAntiJitterScore(context, candidate.direction);
  const w = profile.weights;
  let totalScore = (
    (reachableArea * w.reachableArea)
    + (liberties * w.liberties)
    + (centerBias * w.centerBias)
    + (opponentPressure * w.opponentPressure)
    + (cutoffPotential * w.cutoffPotential)
    + (antiJitter * w.antiJitter)
    - (corridorRisk * Math.abs(w.corridorRisk))
    - (candidate.forcedDeathRisk * Math.abs(w.forcedDeathRisk))
  );

  if (candidate.projectedState.phase === 'round_over' || candidate.projectedState.phase === 'match_over') {
    if (candidate.projectedState.roundResult?.winner === bot.id) {
      totalScore += TERMINAL_WIN_SCORE;
    } else if (candidate.projectedState.roundResult?.winner == null) {
      totalScore += 1_000;
    } else {
      totalScore += TERMINAL_LOSS_SCORE;
    }
  }

  return {
    ...candidate,
    projectedAnalysis,
    reachableArea,
    liberties,
    corridorRisk,
    opponentPressure,
    cutoffPotential,
    centerBias,
    antiJitter,
    totalScore,
  };
};

const runRollout = (
  candidate: CandidateMove,
  bot: { id: TronPlayerId },
  _gameState: TronGameState,
  profile: TronCpuProfile,
): number => {
  if (!candidate.survivesProjection) return TERMINAL_LOSS_SCORE;

  let state = candidate.projectedState;
  let eliminatedOpponents = 0;
  let previousOpponentCount = getAlivePlayerIds(state).filter((playerId) => playerId !== bot.id).length;

  for (let depth = 0; depth < profile.lookaheadDepth; depth += 1) {
    if (!state.players[bot.id].alive) return TERMINAL_LOSS_SCORE;
    if (state.phase === 'round_over' || state.phase === 'match_over') break;

    const nextState = applyTurnsForNextTick(state, buildTurnsForNextTick({
      state,
      overrides: new Map<TronPlayerId, TronDirection>(),
      tag: `rollout:${bot.id}:${candidate.direction}:${depth}`,
    }));

    state = nextState;
    const opponentCount = getAlivePlayerIds(state).filter((playerId) => playerId !== bot.id).length;
    if (opponentCount < previousOpponentCount) {
      eliminatedOpponents += previousOpponentCount - opponentCount;
    }
    previousOpponentCount = opponentCount;
  }

  if (!state.players[bot.id].alive) return TERMINAL_LOSS_SCORE;
  if (state.roundResult?.winner === bot.id) {
    return 8_000 + (eliminatedOpponents * 1_500);
  }

  const finalAnalysis = analyzeState(state);
  const finalReachableArea = finalAnalysis.reachableAreaByPlayer.get(bot.id) ?? 0;
  const strongestOpponentReachableArea = Math.max(
    0,
    ...finalAnalysis.alivePlayerIds
      .filter((playerId) => playerId !== bot.id)
      .map((playerId) => finalAnalysis.reachableAreaByPlayer.get(playerId) ?? 0),
  );

  return (eliminatedOpponents * 1_500) + (finalReachableArea - strongestOpponentReachableArea);
};

const compareCandidateMoves = (left: CandidateMove, right: CandidateMove): number => {
  const leftSafety = getSafetyRank(left);
  const rightSafety = getSafetyRank(right);
  if (leftSafety !== rightSafety) return leftSafety - rightSafety;
  if (left.totalScore !== right.totalScore) return right.totalScore - left.totalScore;
  if (left.rolloutScore !== right.rolloutScore) return right.rolloutScore - left.rolloutScore;
  if (left.reachableArea !== right.reachableArea) return right.reachableArea - left.reachableArea;
  if (left.opponentPressure !== right.opponentPressure) return right.opponentPressure - left.opponentPressure;
  if (left.cutoffPotential !== right.cutoffPotential) return right.cutoffPotential - left.cutoffPotential;
  if (left.antiJitter !== right.antiJitter) return right.antiJitter - left.antiJitter;
  return right.randomBias - left.randomBias;
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
  const context = buildDecisionContext(state, playerId, profile);
  const filteredCandidates = filterSafeMoves(
    buildCandidateMoves(state, playerId, profile),
    state,
    { id: playerId },
    profile,
  );

  let evaluated = filteredCandidates.map((candidate) => (
    evaluateCandidate(candidate, { id: playerId }, state, profile, context)
  ));

  const rolloutDirections = new Set(
    [...evaluated]
      .sort(compareCandidateMoves)
      .slice(0, profile.rolloutCandidates)
      .map((candidate) => candidate.direction),
  );

  evaluated = evaluated.map((candidate) => {
    if (!rolloutDirections.has(candidate.direction) || getSafetyRank(candidate) === 2) {
      return candidate;
    }

    const rolloutScore = runRollout(candidate, { id: playerId }, state, profile);
    return {
      ...candidate,
      rolloutScore,
      totalScore: candidate.totalScore + rolloutScore,
    };
  });

  evaluated = evaluated.map((candidate) => {
    if (getSafetyRank(candidate) !== 0) {
      return candidate;
    }

    const randomBias = (seededUnit(
      state.seed,
      state.tick,
      playerId,
      `random:${candidate.direction}`,
    ) - 0.5) * RANDOMNESS_WINDOW * profile.randomness;

    return {
      ...candidate,
      randomBias,
      totalScore: candidate.totalScore + randomBias,
    };
  });

  const ranked = evaluated.sort(compareCandidateMoves);
  return ranked[0]?.direction ?? player.direction;
};
