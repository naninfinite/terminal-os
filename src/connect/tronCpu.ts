import {
  isTronCellWithinBounds,
  moveTronCell,
  queueTurn,
  stepTronGame,
  tronCellToId,
  turnLeft,
  turnRight,
} from './tronEngine';
import type {
  TronCell,
  TronCpuCandidateDebug,
  TronCpuDecisionDebug,
  TronCpuDifficulty,
  TronCpuMode,
  TronCpuProfile,
  TronDirection,
  TronGameState,
  TronPlayerId,
} from './types';

export const TRON_CPU_PROFILES: Record<TronCpuDifficulty, TronCpuProfile> = {
  easy: {
    difficulty: 'easy',
    reactionDelayTicks: 3,
    lookaheadDepth: 2,
    rolloutCandidates: 1,
    safetyHorizon: 2,
    randomness: 0.28,
    modeThresholds: {
      escapeLiberties: 1,
      escapeCrashDistance: 1,
      forcedDeathDepth: 2,
    },
    weights: {
      reachableArea: 1.2,
      liberties: 1.0,
      corridorRisk: -1.3,
      chamberRisk: -1.4,
      opponentPressure: 0.15,
      cutoffPotential: 0.2,
      centerBias: 0.15,
      antiJitter: 0.25,
      crashDistance: 0.8,
      forcedDeathRisk: -12,
    },
  },
  medium: {
    difficulty: 'medium',
    reactionDelayTicks: 2,
    lookaheadDepth: 3,
    rolloutCandidates: 2,
    safetyHorizon: 3,
    randomness: 0.12,
    modeThresholds: {
      escapeLiberties: 2,
      escapeCrashDistance: 2,
      forcedDeathDepth: 3,
    },
    weights: {
      reachableArea: 1.45,
      liberties: 1.15,
      corridorRisk: -1.8,
      chamberRisk: -2.0,
      opponentPressure: 0.55,
      cutoffPotential: 0.65,
      centerBias: 0.2,
      antiJitter: 0.3,
      crashDistance: 1.1,
      forcedDeathRisk: -16,
    },
  },
  hard: {
    difficulty: 'hard',
    reactionDelayTicks: 1,
    lookaheadDepth: 5,
    rolloutCandidates: 3,
    safetyHorizon: 5,
    randomness: 0.04,
    modeThresholds: {
      escapeLiberties: 2,
      escapeCrashDistance: 3,
      forcedDeathDepth: 4,
    },
    weights: {
      reachableArea: 1.9,
      liberties: 1.35,
      corridorRisk: -2.2,
      chamberRisk: -2.5,
      opponentPressure: 0.95,
      cutoffPotential: 1.25,
      centerBias: 0.2,
      antiJitter: 0.35,
      crashDistance: 1.5,
      forcedDeathRisk: -21,
    },
  },
  expert: {
    difficulty: 'expert',
    reactionDelayTicks: 0,
    lookaheadDepth: 7,
    rolloutCandidates: 3,
    safetyHorizon: 6,
    randomness: 0,
    modeThresholds: {
      escapeLiberties: 3,
      escapeCrashDistance: 3,
      forcedDeathDepth: 5,
    },
    weights: {
      reachableArea: 2.2,
      liberties: 1.6,
      corridorRisk: -2.6,
      chamberRisk: -2.9,
      opponentPressure: 1.2,
      cutoffPotential: 1.8,
      centerBias: 0.18,
      antiJitter: 0.4,
      crashDistance: 1.8,
      forcedDeathRisk: -28,
    },
  },
};

type TurnSign = 'left' | 'right' | 'straight' | null;

type StateAnalysis = {
  alivePlayerIds: TronPlayerId[];
  occupiedCells: Set<number>;
  traversableBlockedCells: Set<number>;
  componentSizeByCell: Map<number, number>;
  componentTokenByCell: Map<number, number>;
  largestComponentSize: number;
  reachableAreaByPlayer: Map<TronPlayerId, number>;
};

type DecisionContext = {
  state: TronGameState;
  playerId: TronPlayerId;
  profile: TronCpuProfile;
  baselineAnalysis: StateAnalysis;
  previousTurnSign: TurnSign;
  mode: TronCpuMode;
};

type CandidateMove = {
  direction: TronDirection;
  nextHead: TronCell;
  nextHeadId: number | null;
  immediateDeath: boolean;
  survivesProjection: boolean;
  forcedDeathRisk: number;
  projectedState: TronGameState;
  projectedAnalysis: StateAnalysis | null;
  reachableArea: number;
  liberties: number;
  corridorRisk: number;
  chamberRisk: number;
  opponentPressure: number;
  cutoffPotential: number;
  centerBias: number;
  antiJitter: number;
  crashDistance: number;
  rolloutScore: number;
  randomBias: number;
  totalScore: number;
};

type SimulationMove = {
  direction: TronDirection;
  safe: boolean;
  reachableArea: number;
  liberties: number;
  corridorRisk: number;
  chamberRisk: number;
  crashDistance: number;
  centerBias: number;
  straightBias: number;
  randomBias: number;
};

const ALL_DIRECTIONS: TronDirection[] = ['up', 'right', 'down', 'left'];
const RANDOMNESS_WINDOW = 24;
const MAX_CRASH_DISTANCE_HORIZON = 12;
const TERMINAL_WIN_SCORE = 10_000;
const TERMINAL_DRAW_SCORE = -50_000;
const TERMINAL_LOSS_SCORE = -100_000;

const MODE_WEIGHT_MULTIPLIERS: Record<TronCpuMode, Record<keyof TronCpuProfile['weights'], number>> = {
  escape: {
    reachableArea: 1.35,
    liberties: 1.4,
    corridorRisk: 1.25,
    chamberRisk: 1.35,
    opponentPressure: 0.35,
    cutoffPotential: 0.35,
    centerBias: 0.2,
    antiJitter: 0.5,
    crashDistance: 1.25,
    forcedDeathRisk: 1.4,
  },
  attack: {
    reachableArea: 1.0,
    liberties: 1.0,
    corridorRisk: 1.0,
    chamberRisk: 1.0,
    opponentPressure: 1.3,
    cutoffPotential: 1.45,
    centerBias: 0.15,
    antiJitter: 0.45,
    crashDistance: 1.0,
    forcedDeathRisk: 1.1,
  },
  fill: {
    reachableArea: 1.2,
    liberties: 1.15,
    corridorRisk: 1.1,
    chamberRisk: 1.2,
    opponentPressure: 0.3,
    cutoffPotential: 0.35,
    centerBias: 0.3,
    antiJitter: 1.0,
    crashDistance: 1.05,
    forcedDeathRisk: 1.25,
  },
};

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

const createTraversableBlockedCells = (
  state: TronGameState,
  occupied = getOccupiedCells(state),
): Set<number> => {
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
  if (!isTronCellWithinBounds(state, origin)) return 0;

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
      if (!isTronCellWithinBounds(state, next)) continue;
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
  componentTokenByCell: Map<number, number>;
  largestComponentSize: number;
} => {
  const componentSizeByCell = new Map<number, number>();
  const componentTokenByCell = new Map<number, number>();
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
          if (!isTronCellWithinBounds(state, next)) continue;
          const nextId = tronCellToId(state.columns, next);
          if (blockedCells.has(nextId) || componentSizeByCell.has(nextId)) continue;
          componentSizeByCell.set(nextId, 0);
          component.push(nextId);
          queue.push(next);
        }
      }

      const token = component[0]!;
      largestComponentSize = Math.max(largestComponentSize, component.length);
      component.forEach((componentCellId) => {
        componentSizeByCell.set(componentCellId, component.length);
        componentTokenByCell.set(componentCellId, token);
      });
    }
  }

  return {
    componentSizeByCell,
    componentTokenByCell,
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
    componentTokenByCell: components.componentTokenByCell,
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
    if (!isTronCellWithinBounds(state, next)) continue;
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
    if (!isTronCellWithinBounds(state, next)) return false;
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
    sum + probeTunnelLength(state, exit, blockedCells, 4)
  ), 0) / exits.length;

  return tunnelLength > 0 ? (2 + (tunnelLength * 2)) : 1;
};

const estimateChamberRisk = (args: {
  baselineArea: number;
  reachableArea: number;
  largestComponentSize: number;
  liberties: number;
  corridorRisk: number;
}): number => {
  const areaLoss = Math.max(0, args.baselineArea - args.reachableArea);
  let risk = areaLoss / 6;

  if (args.reachableArea <= 6) risk += 10;
  else if (args.reachableArea <= 12) risk += 6;
  else if (args.reachableArea <= 24) risk += 3;

  if (args.reachableArea > 0 && args.reachableArea < (args.largestComponentSize * 0.35)) {
    risk += 2;
  }
  if (args.liberties <= 1) risk += 3;
  if (args.corridorRisk >= 6) risk += 2;

  return risk;
};

const computeCrashDistance = (
  state: TronGameState,
  origin: TronCell,
  direction: TronDirection,
  occupiedCells: Set<number>,
  horizon: number,
): number => {
  let current = origin;
  let distance = 0;

  while (distance < horizon) {
    const next = moveTronCell(current, direction);
    if (!isTronCellWithinBounds(state, next)) break;
    if (occupiedCells.has(tronCellToId(state.columns, next))) break;
    distance += 1;
    current = next;
  }

  return distance;
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
  if (left.crashDistance !== right.crashDistance) return right.crashDistance - left.crashDistance;
  if (left.chamberRisk !== right.chamberRisk) return left.chamberRisk - right.chamberRisk;
  if (left.corridorRisk !== right.corridorRisk) return left.corridorRisk - right.corridorRisk;
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
  const baselineArea = floodFillArea(state, player.head, hypotheticalBlocked);

  const ranked = candidateDirections(player.direction).map((direction) => {
    const nextHead = moveTronCell(player.head, direction);
    const safe = isTronCellWithinBounds(state, nextHead)
      && !occupiedCells.has(tronCellToId(state.columns, nextHead));
    if (!safe) {
      return {
        direction,
        safe: false,
        reachableArea: -1,
        liberties: -1,
        corridorRisk: 99,
        chamberRisk: 99,
        crashDistance: -1,
        centerBias: -1_000,
        straightBias: 0,
        randomBias: seededUnit(state.seed, state.tick, playerId, `${tag}:${direction}`),
      };
    }

    const reachableArea = floodFillArea(state, nextHead, hypotheticalBlocked);
    const liberties = countLiberties(state, nextHead, hypotheticalBlocked);
    const corridorRisk = estimateCorridorRisk(state, nextHead, hypotheticalBlocked);
    const chamberRisk = estimateChamberRisk({
      baselineArea,
      reachableArea,
      largestComponentSize: Math.max(reachableArea, baselineArea),
      liberties,
      corridorRisk,
    });

    return {
      direction,
      safe: true,
      reachableArea,
      liberties,
      corridorRisk,
      chamberRisk,
      crashDistance: computeCrashDistance(
        state,
        nextHead,
        direction,
        occupiedCells,
        MAX_CRASH_DISTANCE_HORIZON,
      ),
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

const getPlayerComponentToken = (
  analysis: StateAnalysis,
  state: TronGameState,
  playerId: TronPlayerId,
): number | null => {
  if (!state.players[playerId].alive) return null;
  const headId = tronCellToId(state.columns, state.players[playerId].head);
  return analysis.componentTokenByCell.get(headId) ?? null;
};

const arePlayersInSameComponent = (
  analysis: StateAnalysis,
  state: TronGameState,
  left: TronPlayerId,
  right: TronPlayerId,
): boolean => {
  const leftToken = getPlayerComponentToken(analysis, state, left);
  const rightToken = getPlayerComponentToken(analysis, state, right);
  return leftToken != null && rightToken != null && leftToken === rightToken;
};

const buildDecisionContext = (
  state: TronGameState,
  playerId: TronPlayerId,
  profile: TronCpuProfile,
): DecisionContext => {
  const baselineAnalysis = analyzeState(state);
  const previousTurnSign = inferPreviousTurnSign(state, playerId);
  const head = state.players[playerId].head;
  const blocked = getHypotheticalTraversableBlockedCells(state, playerId, baselineAnalysis.occupiedCells);
  const liberties = countLiberties(state, head, blocked);
  const corridorRisk = estimateCorridorRisk(state, head, blocked);
  const crashDistance = computeCrashDistance(
    state,
    head,
    state.players[playerId].direction,
    baselineAnalysis.occupiedCells,
    profile.safetyHorizon + 2,
  );
  const myReachableArea = baselineAnalysis.reachableAreaByPlayer.get(playerId) ?? 0;
  const contested = baselineAnalysis.alivePlayerIds.some((otherId) => (
    otherId !== playerId && arePlayersInSameComponent(baselineAnalysis, state, playerId, otherId)
  ));

  let mode: TronCpuMode = 'attack';
  if (
    liberties <= profile.modeThresholds.escapeLiberties
    || crashDistance <= profile.modeThresholds.escapeCrashDistance
    || corridorRisk >= 6
    || myReachableArea <= Math.max(8, Math.floor(baselineAnalysis.largestComponentSize * 0.2))
  ) {
    mode = 'escape';
  } else if (!contested) {
    mode = 'fill';
  }

  return {
    state,
    playerId,
    profile,
    baselineAnalysis,
    previousTurnSign,
    mode,
  };
};

const buildCandidateMoves = (
  state: TronGameState,
  playerId: TronPlayerId,
): CandidateMove[] => {
  const occupiedCells = getOccupiedCells(state);
  const player = state.players[playerId];

  return candidateDirections(player.direction).map((direction) => {
    const nextHead = moveTronCell(player.head, direction);
    const nextHeadId = isTronCellWithinBounds(state, nextHead)
      ? tronCellToId(state.columns, nextHead)
      : null;
    const immediateDeath = nextHeadId == null || occupiedCells.has(nextHeadId);
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
      forcedDeathRisk: 99,
      projectedState,
      projectedAnalysis: null,
      reachableArea: 0,
      liberties: 0,
      corridorRisk: 0,
      chamberRisk: 0,
      opponentPressure: 0,
      cutoffPotential: 0,
      centerBias: 0,
      antiJitter: 0,
      crashDistance: 0,
      rolloutScore: 0,
      randomBias: 0,
      totalScore: Number.NEGATIVE_INFINITY,
    };
  });
};

const estimateForcedDeathRisk = (
  candidate: CandidateMove,
  playerId: TronPlayerId,
  profile: TronCpuProfile,
): number => {
  if (candidate.immediateDeath || !candidate.survivesProjection) {
    return profile.modeThresholds.forcedDeathDepth + 3;
  }

  let state = candidate.projectedState;
  let survivedSteps = 0;

  for (let depth = 0; depth < profile.modeThresholds.forcedDeathDepth; depth += 1) {
    if (!state.players[playerId].alive || state.phase !== 'running') break;

    const direction = chooseSimulationDirection(state, playerId, `forced:${playerId}:${candidate.direction}:${depth}`);
    state = applyTurnsForNextTick(state, buildTurnsForNextTick({
      state,
      overrides: new Map<TronPlayerId, TronDirection>([[playerId, direction]]),
      tag: `forced:${playerId}:${candidate.direction}:${depth}`,
    }));

    if (!state.players[playerId].alive) break;
    survivedSteps += 1;
  }

  let risk = Math.max(0, profile.modeThresholds.forcedDeathDepth - survivedSteps);
  if (!state.players[playerId].alive) {
    risk += 2;
    return risk;
  }

  const finalAnalysis = analyzeState(state);
  const finalBlocked = getHypotheticalTraversableBlockedCells(state, playerId, finalAnalysis.occupiedCells);
  const finalHead = state.players[playerId].head;
  const finalLiberties = countLiberties(state, finalHead, finalBlocked);
  const finalArea = finalAnalysis.reachableAreaByPlayer.get(playerId) ?? 0;

  if (finalLiberties <= 1) risk += 1;
  if (finalArea <= 8) risk += 1;

  return risk;
};

const enrichCandidate = (
  candidate: CandidateMove,
  context: DecisionContext,
): CandidateMove => {
  const antiJitter = getAntiJitterScore(context, candidate.direction);

  if (!candidate.survivesProjection) {
    return {
      ...candidate,
      antiJitter,
      forcedDeathRisk: context.profile.modeThresholds.forcedDeathDepth + 3,
      crashDistance: 0,
      totalScore: TERMINAL_LOSS_SCORE,
    };
  }

  const projectedAnalysis = analyzeState(candidate.projectedState);
  const projectedHead = candidate.projectedState.players[context.playerId].head;
  const projectedBlocked = getHypotheticalTraversableBlockedCells(
    candidate.projectedState,
    context.playerId,
    projectedAnalysis.occupiedCells,
  );
  const reachableArea = projectedAnalysis.reachableAreaByPlayer.get(context.playerId) ?? 0;
  const liberties = countLiberties(candidate.projectedState, projectedHead, projectedBlocked);
  const corridorRisk = estimateCorridorRisk(candidate.projectedState, projectedHead, projectedBlocked);
  const chamberRisk = estimateChamberRisk({
    baselineArea: context.baselineAnalysis.reachableAreaByPlayer.get(context.playerId) ?? 0,
    reachableArea,
    largestComponentSize: projectedAnalysis.largestComponentSize,
    liberties,
    corridorRisk,
  });
  const crashDistance = computeCrashDistance(
    candidate.projectedState,
    projectedHead,
    candidate.direction,
    projectedAnalysis.occupiedCells,
    Math.min(MAX_CRASH_DISTANCE_HORIZON, context.profile.safetyHorizon + 6),
  );

  return {
    ...candidate,
    projectedAnalysis,
    reachableArea,
    liberties,
    corridorRisk,
    chamberRisk,
    antiJitter,
    crashDistance,
    forcedDeathRisk: estimateForcedDeathRisk({
      ...candidate,
      projectedAnalysis,
      reachableArea,
      liberties,
      corridorRisk,
      chamberRisk,
      antiJitter,
      crashDistance,
    }, context.playerId, context.profile),
  };
};

const filterSafeMoves = (
  candidates: CandidateMove[],
): CandidateMove[] => {
  const nonImmediateFatal = candidates.filter((candidate) => !candidate.immediateDeath);
  if (nonImmediateFatal.length === 0) return candidates;

  const projectedAlive = nonImmediateFatal.filter((candidate) => candidate.survivesProjection);
  const survivalPool = projectedAlive.length > 0 ? projectedAlive : nonImmediateFatal;
  const minimumForcedDeathRisk = Math.min(...survivalPool.map((candidate) => candidate.forcedDeathRisk));
  const safestByHorizon = survivalPool.filter((candidate) => candidate.forcedDeathRisk === minimumForcedDeathRisk);

  if (safestByHorizon.length <= 1) {
    return safestByHorizon;
  }

  const minimumTrapRisk = Math.min(...safestByHorizon.map((candidate) => (
    candidate.corridorRisk + candidate.chamberRisk
  )));
  const safestTopology = safestByHorizon.filter((candidate) => (
    (candidate.corridorRisk + candidate.chamberRisk) <= (minimumTrapRisk + 1.5)
  ));

  return safestTopology.length > 0 ? safestTopology : safestByHorizon;
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
    const sharedBefore = arePlayersInSameComponent(baselineAnalysis, context.state, playerId, otherId);
    const sharedAfter = candidate.projectedState.players[otherId].alive
      ? arePlayersInSameComponent(projectedAnalysis, candidate.projectedState, playerId, otherId)
      : false;

    pressure += Math.max(0, baselineArea - projectedArea);
    if (sharedBefore && !sharedAfter) {
      pressure += 6;
    }
    if (!candidate.projectedState.players[otherId].alive) {
      pressure += 14;
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
  const baselineArea = baselineAnalysis.reachableAreaByPlayer.get(playerId) ?? 0;
  const projectedArea = projectedAnalysis.reachableAreaByPlayer.get(playerId) ?? 0;
  let score = 0;

  baselineAnalysis.alivePlayerIds.forEach((otherId) => {
    if (otherId === playerId) return;
    if (!candidate.projectedState.players[otherId].alive) {
      score += 18;
      return;
    }

    const baselineOpponentArea = baselineAnalysis.reachableAreaByPlayer.get(otherId) ?? 0;
    const projectedOpponentArea = projectedAnalysis.reachableAreaByPlayer.get(otherId) ?? 0;
    const sharedBefore = arePlayersInSameComponent(baselineAnalysis, context.state, playerId, otherId);
    const sharedAfter = arePlayersInSameComponent(projectedAnalysis, candidate.projectedState, playerId, otherId);

    if (sharedBefore && !sharedAfter) {
      score += Math.max(4, baselineOpponentArea - projectedOpponentArea);
    }
  });

  if (projectedArea === projectedAnalysis.largestComponentSize) {
    score += 2;
  }

  return Math.max(0, score - Math.max(0, baselineArea - projectedArea));
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
    totalScore,
  };
};

const evaluateCandidate = (
  candidate: CandidateMove,
  context: DecisionContext,
): CandidateMove => {
  if (!candidate.survivesProjection) {
    return evaluateTerminalCandidate(candidate, context);
  }

  const projectedAnalysis = candidate.projectedAnalysis!;
  const opponentPressure = estimateOpponentPressure(candidate, context);
  const cutoffPotential = estimateCutoffPotential(candidate, context);
  const centerBias = getCenterBias(candidate.projectedState, candidate.projectedState.players[context.playerId].head);
  const w = context.profile.weights;
  const modeWeights = MODE_WEIGHT_MULTIPLIERS[context.mode];
  let totalScore = (
    (candidate.reachableArea * w.reachableArea * modeWeights.reachableArea)
    + (candidate.liberties * w.liberties * modeWeights.liberties)
    + (centerBias * w.centerBias * modeWeights.centerBias)
    + (opponentPressure * w.opponentPressure * modeWeights.opponentPressure)
    + (cutoffPotential * w.cutoffPotential * modeWeights.cutoffPotential)
    + (candidate.antiJitter * w.antiJitter * modeWeights.antiJitter)
    + (candidate.crashDistance * w.crashDistance * modeWeights.crashDistance)
    - (candidate.corridorRisk * Math.abs(w.corridorRisk) * modeWeights.corridorRisk)
    - (candidate.chamberRisk * Math.abs(w.chamberRisk) * modeWeights.chamberRisk)
    - (candidate.forcedDeathRisk * Math.abs(w.forcedDeathRisk) * modeWeights.forcedDeathRisk)
  );

  if (candidate.projectedState.phase === 'round_over' || candidate.projectedState.phase === 'match_over') {
    if (candidate.projectedState.roundResult?.winner === context.playerId) {
      totalScore += TERMINAL_WIN_SCORE;
    } else if (candidate.projectedState.roundResult?.winner == null) {
      totalScore += 1_000;
    } else {
      totalScore += TERMINAL_LOSS_SCORE;
    }
  } else if (
    projectedAnalysis.reachableAreaByPlayer.get(context.playerId) === projectedAnalysis.largestComponentSize
    && context.mode !== 'escape'
  ) {
    totalScore += 1;
  }

  return {
    ...candidate,
    opponentPressure,
    cutoffPotential,
    centerBias,
    totalScore,
  };
};

const runRollout = (
  candidate: CandidateMove,
  context: DecisionContext,
): number => {
  if (!candidate.survivesProjection) return TERMINAL_LOSS_SCORE;

  let state = candidate.projectedState;
  let eliminatedOpponents = 0;
  let previousOpponentCount = getAlivePlayerIds(state).filter((playerId) => playerId !== context.playerId).length;

  for (let depth = 0; depth < context.profile.lookaheadDepth; depth += 1) {
    if (!state.players[context.playerId].alive) return TERMINAL_LOSS_SCORE;
    if (state.phase === 'round_over' || state.phase === 'match_over') break;

    const direction = chooseSimulationDirection(
      state,
      context.playerId,
      `rollout:${context.playerId}:${candidate.direction}:${depth}`,
    );
    state = applyTurnsForNextTick(state, buildTurnsForNextTick({
      state,
      overrides: new Map<TronPlayerId, TronDirection>([[context.playerId, direction]]),
      tag: `rollout:${context.playerId}:${candidate.direction}:${depth}`,
    }));

    const opponentCount = getAlivePlayerIds(state).filter((playerId) => playerId !== context.playerId).length;
    if (opponentCount < previousOpponentCount) {
      eliminatedOpponents += previousOpponentCount - opponentCount;
    }
    previousOpponentCount = opponentCount;
  }

  if (!state.players[context.playerId].alive) return TERMINAL_LOSS_SCORE;
  if (state.roundResult?.winner === context.playerId) {
    return 8_000 + (eliminatedOpponents * 1_500);
  }

  const finalAnalysis = analyzeState(state);
  const finalReachableArea = finalAnalysis.reachableAreaByPlayer.get(context.playerId) ?? 0;
  const strongestOpponentReachableArea = Math.max(
    0,
    ...finalAnalysis.alivePlayerIds
      .filter((playerId) => playerId !== context.playerId)
      .map((playerId) => finalAnalysis.reachableAreaByPlayer.get(playerId) ?? 0),
  );

  return (eliminatedOpponents * 1_500) + (finalReachableArea - strongestOpponentReachableArea);
};

const compareCandidateMoves = (left: CandidateMove, right: CandidateMove): number => {
  if (left.immediateDeath !== right.immediateDeath) return left.immediateDeath ? 1 : -1;
  if (left.survivesProjection !== right.survivesProjection) return left.survivesProjection ? -1 : 1;
  if (left.forcedDeathRisk !== right.forcedDeathRisk) return left.forcedDeathRisk - right.forcedDeathRisk;
  if (left.totalScore !== right.totalScore) return right.totalScore - left.totalScore;
  if (left.rolloutScore !== right.rolloutScore) return right.rolloutScore - left.rolloutScore;
  if (left.reachableArea !== right.reachableArea) return right.reachableArea - left.reachableArea;
  if (left.crashDistance !== right.crashDistance) return right.crashDistance - left.crashDistance;
  if (left.opponentPressure !== right.opponentPressure) return right.opponentPressure - left.opponentPressure;
  if (left.cutoffPotential !== right.cutoffPotential) return right.cutoffPotential - left.cutoffPotential;
  if (left.antiJitter !== right.antiJitter) return right.antiJitter - left.antiJitter;
  return right.randomBias - left.randomBias;
};

const toCpuCandidateDebug = (candidate: CandidateMove): TronCpuCandidateDebug => ({
  direction: candidate.direction,
  immediateDeath: candidate.immediateDeath,
  forcedDeathRisk: candidate.forcedDeathRisk,
  crashDistance: candidate.crashDistance,
  reachableArea: candidate.reachableArea,
  liberties: candidate.liberties,
  corridorRisk: candidate.corridorRisk,
  chamberRisk: candidate.chamberRisk,
  opponentPressure: candidate.opponentPressure,
  cutoffPotential: candidate.cutoffPotential,
  centerBias: candidate.centerBias,
  antiJitter: candidate.antiJitter,
  rolloutScore: candidate.rolloutScore,
  totalScore: candidate.totalScore,
});

export const inspectCpuTurn = (args: {
  state: TronGameState;
  playerId: TronPlayerId;
  difficulty: TronCpuDifficulty;
}): TronCpuDecisionDebug | null => {
  const { state, playerId, difficulty } = args;
  const player = state.players[playerId];
  if (!player.alive || state.phase !== 'running') return null;
  if (!state.activePlayerIds.includes(playerId)) return null;

  const profile = TRON_CPU_PROFILES[difficulty];
  const context = buildDecisionContext(state, playerId, profile);
  const candidates = buildCandidateMoves(state, playerId)
    .map((candidate) => enrichCandidate(candidate, context));
  const filteredCandidates = filterSafeMoves(candidates);

  let evaluated = filteredCandidates.map((candidate) => (
    evaluateCandidate(candidate, context)
  ));

  const rolloutDirections = new Set(
    [...evaluated]
      .sort(compareCandidateMoves)
      .slice(0, profile.rolloutCandidates)
      .map((candidate) => candidate.direction),
  );

  evaluated = evaluated.map((candidate) => {
    if (!rolloutDirections.has(candidate.direction) || !candidate.survivesProjection) {
      return candidate;
    }

    const rolloutScore = runRollout(candidate, context);
    return {
      ...candidate,
      rolloutScore,
      totalScore: candidate.totalScore + rolloutScore,
    };
  });

  evaluated = evaluated.map((candidate) => {
    if (candidate.immediateDeath || !candidate.survivesProjection) {
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

  const ranked = [...evaluated].sort(compareCandidateMoves);
  const chosen = ranked[0];
  if (!chosen) return null;

  return {
    playerId,
    difficulty,
    mode: context.mode,
    tick: state.tick,
    chosenDirection: chosen.direction,
    candidates: ranked.map(toCpuCandidateDebug),
  };
};

export const pickCpuTurn = (args: {
  state: TronGameState;
  playerId: TronPlayerId;
  difficulty: TronCpuDifficulty;
}): TronDirection | null => (
  inspectCpuTurn(args)?.chosenDirection ?? null
);
