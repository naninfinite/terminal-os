import {
  TRON_PLAYER_IDS,
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
    randomness: 0.35,
  },
  medium: {
    difficulty: 'medium',
    reactionDelayTicks: 2,
    lookaheadDepth: 2,
    randomness: 0.18,
  },
  hard: {
    difficulty: 'hard',
    reactionDelayTicks: 1,
    lookaheadDepth: 4,
    randomness: 0.08,
  },
  expert: {
    difficulty: 'expert',
    reactionDelayTicks: 0,
    lookaheadDepth: 6,
    randomness: 0.02,
  },
};

type CandidateScore = {
  direction: TronDirection;
  safe: boolean;
  reachableSpace: number;
  trapDelta: number;
  threatPressure: number;
  centerBias: number;
  futureScore: number;
  randomBias: number;
};

const compareCandidateScores = (left: CandidateScore, right: CandidateScore): number => {
  if (left.safe !== right.safe) return left.safe ? -1 : 1;
  if (left.futureScore !== right.futureScore) return right.futureScore - left.futureScore;
  if (left.reachableSpace !== right.reachableSpace) return right.reachableSpace - left.reachableSpace;
  if (left.threatPressure !== right.threatPressure) return right.threatPressure - left.threatPressure;
  if (left.trapDelta !== right.trapDelta) return right.trapDelta - left.trapDelta;
  if (left.centerBias !== right.centerBias) return right.centerBias - left.centerBias;
  return right.randomBias - left.randomBias;
};

const summarizeCandidateScore = (score: CandidateScore): number => (
  (score.safe ? 1_000_000 : -1_000_000)
  + (score.futureScore * 1_000)
  + (score.reachableSpace * 100)
  + (score.threatPressure * 10)
  + (score.trapDelta * 5)
  + score.centerBias
  + score.randomBias
);

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

const isSafeDirection = (state: TronGameState, playerId: TronPlayerId, direction: TronDirection): boolean => {
  const player = state.players[playerId];
  if (!player.alive) return false;
  if (isOppositeDirection(player.direction, direction)) return false;

  const nextCell = moveTronCell(player.head, direction);
  if (nextCell.x < 0 || nextCell.x >= state.columns || nextCell.y < 0 || nextCell.y >= state.rows) {
    return false;
  }
  return !getOccupiedCells(state).has(tronCellToId(state.columns, nextCell));
};

const measureReachableSpace = (args: {
  state: TronGameState;
  origin: TronCell;
  blockedCells: Set<number>;
}): number => {
  const { state, origin, blockedCells } = args;
  if (origin.x < 0 || origin.x >= state.columns || origin.y < 0 || origin.y >= state.rows) {
    return 0;
  }
  const startId = tronCellToId(state.columns, origin);
  if (blockedCells.has(startId)) return 0;

  const visited = new Set<number>([startId]);
  const queue: TronCell[] = [{ ...origin }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    for (const direction of ['up', 'right', 'down', 'left'] as TronDirection[]) {
      const next = moveTronCell(current, direction);
      if (next.x < 0 || next.x >= state.columns || next.y < 0 || next.y >= state.rows) continue;
      const nextId = tronCellToId(state.columns, next);
      if (blockedCells.has(nextId) || visited.has(nextId)) continue;
      visited.add(nextId);
      queue.push(next);
    }
  }

  return visited.size;
};

const centerBiasForCell = (state: TronGameState, cell: TronCell): number => {
  const centerX = (state.columns - 1) / 2;
  const centerY = (state.rows - 1) / 2;
  return -(
    Math.abs(centerX - cell.x)
    + Math.abs(centerY - cell.y)
  );
};

const seededUnit = (seed: number, tick: number, playerId: TronPlayerId, direction: TronDirection): number => {
  const raw = `${seed}:${tick}:${playerId}:${direction}`;
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x1_0000_0000;
};

const predictDirectionalIntent = (state: TronGameState, playerId: TronPlayerId): TronDirection => {
  const player = state.players[playerId];
  const options = candidateDirections(player.direction);
  const blocked = getOccupiedCells(state);
  const safe = options
    .filter((direction) => !isOppositeDirection(player.direction, direction))
    .map((direction) => {
      const nextHead = moveTronCell(player.head, direction);
      const reachableSpace = measureReachableSpace({
        state,
        origin: nextHead,
        blockedCells: blocked,
      });
      return {
        direction,
        safe: isSafeDirection(state, playerId, direction),
        reachableSpace,
        centerBias: centerBiasForCell(state, nextHead),
      };
    })
    .sort((left, right) => {
      if (left.safe !== right.safe) return left.safe ? -1 : 1;
      if (left.reachableSpace !== right.reachableSpace) return right.reachableSpace - left.reachableSpace;
      return right.centerBias - left.centerBias;
    });
  return safe[0]?.direction ?? player.direction;
};

const buildProjectedState = (
  state: TronGameState,
  plannedTurns: Array<{ playerId: TronPlayerId; direction: TronDirection }>,
): TronGameState => {
  let queued = state;
  plannedTurns.forEach((turn) => {
    queued = queueTurn(queued, turn.playerId, turn.direction, state.tick + 1);
  });
  return stepTronGame(queued);
};

const estimateThreatPressure = (
  state: TronGameState,
  nextHead: TronCell,
  playerId: TronPlayerId,
): number => {
  let total = 0;
  getAlivePlayerIds(state).forEach((otherId) => {
    if (otherId === playerId) return;
    const otherHead = state.players[otherId].head;
    const distance = Math.abs(nextHead.x - otherHead.x) + Math.abs(nextHead.y - otherHead.y);
    total -= Math.max(0, 12 - distance);
  });
  return total;
};

const scoreDirection = (
  state: TronGameState,
  playerId: TronPlayerId,
  direction: TronDirection,
  depth: number,
): CandidateScore => {
  const safe = isSafeDirection(state, playerId, direction);
  const randomBias = seededUnit(state.seed, state.tick, playerId, direction);

  if (!safe) {
    return {
      direction,
      safe: false,
      reachableSpace: -1,
      trapDelta: -10_000,
      threatPressure: -10_000,
      centerBias: -10_000,
      futureScore: -10_000,
      randomBias,
    };
  }

  const nextHead = moveTronCell(state.players[playerId].head, direction);
  const nextHeadId = tronCellToId(state.columns, nextHead);
  const occupied = getOccupiedCells(state);

  const aliveOpponents = getAlivePlayerIds(state).filter((otherId) => otherId !== playerId);
  const opponentTurns = aliveOpponents.map((otherId) => ({
    playerId: otherId,
    direction: predictDirectionalIntent(state, otherId),
  }));
  const opponentHeadByPlayerId = new Map<TronPlayerId, number>();
  opponentTurns.forEach((turn) => {
    const nextOpponentHead = moveTronCell(state.players[turn.playerId].head, turn.direction);
    if (
      nextOpponentHead.x < 0
      || nextOpponentHead.x >= state.columns
      || nextOpponentHead.y < 0
      || nextOpponentHead.y >= state.rows
    ) {
      return;
    }
    opponentHeadByPlayerId.set(turn.playerId, tronCellToId(state.columns, nextOpponentHead));
  });

  const opponentSpaces: number[] = [];
  opponentTurns.forEach((turn) => {
    const nextOpponentHead = moveTronCell(state.players[turn.playerId].head, turn.direction);
    if (
      nextOpponentHead.x < 0
      || nextOpponentHead.x >= state.columns
      || nextOpponentHead.y < 0
      || nextOpponentHead.y >= state.rows
    ) {
      opponentSpaces.push(0);
      return;
    }
    const blockedForOpponent = new Set<number>(occupied);
    blockedForOpponent.add(nextHeadId);
    opponentHeadByPlayerId.forEach((cellId, otherPlayerId) => {
      if (otherPlayerId !== turn.playerId) {
        blockedForOpponent.add(cellId);
      }
    });
    opponentSpaces.push(measureReachableSpace({
      state,
      origin: nextOpponentHead,
      blockedCells: blockedForOpponent,
    }));
  });

  const blockedForPlayer = new Set<number>(occupied);
  opponentHeadByPlayerId.forEach((cellId) => blockedForPlayer.add(cellId));
  const reachableSpace = measureReachableSpace({
    state,
    origin: nextHead,
    blockedCells: blockedForPlayer,
  });
  const maxOpponentReachable = opponentSpaces.length > 0 ? Math.max(...opponentSpaces) : 0;
  const centerBias = centerBiasForCell(state, nextHead);
  const threatPressure = estimateThreatPressure(state, nextHead, playerId);
  let futureScore = 0;

  if (depth > 1) {
    const projected = buildProjectedState(state, [
      { playerId, direction },
      ...opponentTurns,
    ]);
    if (projected.phase === 'round_over' || projected.phase === 'match_over') {
      if (projected.roundResult?.winner === playerId) {
        futureScore = 10_000;
      } else if (projected.roundResult?.winner == null && projected.roundResult?.eliminated.includes(playerId)) {
        futureScore = -5_000;
      } else if (projected.roundResult?.winner && projected.roundResult.winner !== playerId) {
        futureScore = -10_000;
      }
    } else {
      const nextOptions = candidateDirections(projected.players[playerId].direction)
        .filter((option, index, list) => list.indexOf(option) === index)
        .map((option) => scoreDirection(projected, playerId, option, depth - 1))
        .sort(compareCandidateScores);
      futureScore = nextOptions[0] ? summarizeCandidateScore(nextOptions[0]) : 0;
    }
  }

  return {
    direction,
    safe,
    reachableSpace,
    trapDelta: reachableSpace - maxOpponentReachable,
    threatPressure,
    centerBias,
    futureScore,
    randomBias,
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
  const scores = candidateDirections(player.direction)
    .filter((direction, index, list) => list.indexOf(direction) === index)
    .map((direction) => scoreDirection(state, playerId, direction, profile.lookaheadDepth));

  const safeScores = scores.filter((entry) => entry.safe);
  const pool = safeScores.length > 0 ? safeScores : scores;
  const ranked = [...pool].sort(compareCandidateScores);

  if (ranked.length === 0) return null;

  const roll = seededUnit(state.seed, state.tick, playerId, player.direction);
  if (ranked.length > 1 && roll < profile.randomness) {
    return ranked[1]?.direction ?? ranked[0]!.direction;
  }
  return ranked[0]!.direction;
};
