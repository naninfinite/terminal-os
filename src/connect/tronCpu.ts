import {
  TRON_PLAYERS,
  isOppositeDirection,
  moveTronCell,
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
  centerBias: number;
  futureScore: number;
  randomBias: number;
};

const candidateDirections = (direction: TronDirection): TronDirection[] => [
  direction,
  turnLeft(direction),
  turnRight(direction),
];

const getOccupiedCells = (state: TronGameState): Set<number> => {
  const occupied = new Set<number>();
  for (const playerId of TRON_PLAYERS) {
    for (const cellId of state.players[playerId].trailCellIds) {
      occupied.add(cellId);
    }
  }
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

const predictOpponentDirection = (
  state: TronGameState,
  opponentId: TronPlayerId,
): TronDirection => {
  const options = candidateDirections(state.players[opponentId].direction);
  for (const direction of options) {
    if (isSafeDirection(state, opponentId, direction)) return direction;
  }
  return state.players[opponentId].direction;
};

const scoreDirection = (
  state: TronGameState,
  playerId: TronPlayerId,
  direction: TronDirection,
  depth: number,
): CandidateScore => {
  const opponentId = TRON_PLAYERS.find((entry) => entry !== playerId) ?? 'p2';
  const safe = isSafeDirection(state, playerId, direction);
  const randomBias = seededUnit(state.seed, state.tick, playerId, direction);

  if (!safe) {
    return {
      direction,
      safe: false,
      reachableSpace: -1,
      trapDelta: -1_000,
      centerBias: -1_000,
      futureScore: -1_000,
      randomBias,
    };
  }

  const blocked = getOccupiedCells(state);
  const nextHead = moveTronCell(state.players[playerId].head, direction);
  blocked.add(tronCellToId(state.columns, nextHead));

  const opponentDirection = predictOpponentDirection(state, opponentId);
  const opponentNextHead = moveTronCell(state.players[opponentId].head, opponentDirection);
  if (
    opponentNextHead.x >= 0
    && opponentNextHead.x < state.columns
    && opponentNextHead.y >= 0
    && opponentNextHead.y < state.rows
  ) {
    blocked.add(tronCellToId(state.columns, opponentNextHead));
  }

  const reachableSpace = measureReachableSpace({
    state,
    origin: nextHead,
    blockedCells: blocked,
  });
  const opponentReachable = measureReachableSpace({
    state,
    origin: opponentNextHead,
    blockedCells: blocked,
  });
  const centerBias = centerBiasForCell(state, nextHead);
  let futureScore = 0;

  if (depth > 1) {
    const stepped = stepTronGame(
      state.pendingInputs.length === 0
        ? {
          ...state,
          pendingInputs: [
            { playerId, direction, tick: state.tick + 1 },
            { playerId: opponentId, direction: opponentDirection, tick: state.tick + 1 },
          ],
        }
        : {
          ...state,
          pendingInputs: [
            ...state.pendingInputs,
            { playerId, direction, tick: state.tick + 1 },
            { playerId: opponentId, direction: opponentDirection, tick: state.tick + 1 },
          ],
        }
    );

    if (stepped.phase === 'round_over' || stepped.phase === 'match_over') {
      if (stepped.roundResult?.winner === playerId) futureScore += 10_000;
      if (stepped.roundResult?.winner === opponentId) futureScore -= 10_000;
    } else {
      const futureOptions = candidateDirections(stepped.players[playerId].direction)
        .filter((option) => !isOppositeDirection(stepped.players[playerId].direction, option))
        .map((option) => scoreDirection(stepped, playerId, option, depth - 1))
        .sort((left, right) => {
          if (left.safe !== right.safe) return left.safe ? -1 : 1;
          if (left.futureScore !== right.futureScore) return right.futureScore - left.futureScore;
          if (left.trapDelta !== right.trapDelta) return right.trapDelta - left.trapDelta;
          return right.reachableSpace - left.reachableSpace;
        });
      futureScore = futureOptions[0]?.futureScore ?? 0;
    }
  }

  return {
    direction,
    safe,
    reachableSpace,
    trapDelta: reachableSpace - opponentReachable,
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

  const profile = TRON_CPU_PROFILES[difficulty];
  const scores = candidateDirections(player.direction)
    .filter((direction, index, list) => list.indexOf(direction) === index)
    .map((direction) => scoreDirection(state, playerId, direction, profile.lookaheadDepth));

  const safeScores = scores.filter((entry) => entry.safe);
  const pool = safeScores.length > 0 ? safeScores : scores;
  const ranked = [...pool].sort((left, right) => {
    if (left.safe !== right.safe) return left.safe ? -1 : 1;
    if (left.futureScore !== right.futureScore) return right.futureScore - left.futureScore;
    if (left.reachableSpace !== right.reachableSpace) return right.reachableSpace - left.reachableSpace;
    if (left.trapDelta !== right.trapDelta) return right.trapDelta - left.trapDelta;
    if (left.centerBias !== right.centerBias) return right.centerBias - left.centerBias;
    return right.randomBias - left.randomBias;
  });
  const best = ranked[0];
  if (!best) return null;

  if (ranked.length > 1 && profile.randomness > 0) {
    const jitter = seededUnit(state.seed, state.tick + 1, playerId, best.direction);
    if (jitter < profile.randomness) {
      return ranked[1]?.direction ?? best.direction;
    }
  }

  return best.direction;
};
