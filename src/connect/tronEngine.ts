import type {
  TronCell,
  TronDirection,
  TronGameConfig,
  TronGameState,
  TronPlayerId,
  TronRoundPhase,
  TronRoundResult,
  TronRoundResultReason,
  TronQueuedTurn,
  TronSnapshot,
} from './types';

export const TRON_DIRECTIONS: TronDirection[] = ['up', 'right', 'down', 'left'];
export const DEFAULT_TRON_COLUMNS = 60;
export const DEFAULT_TRON_ROWS = 40;
export const DEFAULT_TRON_TICK_MS = 50;
export const DEFAULT_TRON_COUNTDOWN_TICKS = 20;
export const DEFAULT_TRON_FIRST_TO_SCORE = 5;
export const DEFAULT_TRON_SEED = 1337;
export const TRON_PLAYERS: TronPlayerId[] = ['p1', 'p2'];

const OPPOSITE_DIRECTION: Record<TronDirection, TronDirection> = {
  up: 'down',
  right: 'left',
  down: 'up',
  left: 'right',
};

const cloneCell = (cell: TronCell): TronCell => ({ x: cell.x, y: cell.y });

const cloneScore = (score: Record<TronPlayerId, number>): Record<TronPlayerId, number> => ({
  p1: score.p1,
  p2: score.p2,
});

const clonePlayer = (player: TronGameState['players'][TronPlayerId]): TronGameState['players'][TronPlayerId] => ({
  id: player.id,
  head: cloneCell(player.head),
  direction: player.direction,
  alive: player.alive,
  trailCellIds: [...player.trailCellIds],
});

const clampDimension = (value: number, fallback: number): number => {
  const next = Math.floor(value);
  return Number.isFinite(next) ? Math.max(8, next) : fallback;
};

const normalizeTickMs = (value: number): number => {
  const next = Math.floor(value);
  return Number.isFinite(next) ? Math.max(20, next) : DEFAULT_TRON_TICK_MS;
};

const normalizeSeed = (value: number): number => (Number.isFinite(value) ? (value >>> 0) : DEFAULT_TRON_SEED);

export const tronCellToId = (columns: number, cell: TronCell): number => ((cell.y * columns) + cell.x);

export const tronIdToCell = (columns: number, cellId: number): TronCell => ({
  x: cellId % columns,
  y: Math.floor(cellId / columns),
});

export const moveTronCell = (cell: TronCell, direction: TronDirection): TronCell => {
  if (direction === 'up') return { x: cell.x, y: cell.y - 1 };
  if (direction === 'right') return { x: cell.x + 1, y: cell.y };
  if (direction === 'down') return { x: cell.x, y: cell.y + 1 };
  return { x: cell.x - 1, y: cell.y };
};

export const turnLeft = (direction: TronDirection): TronDirection => (
  direction === 'up' ? 'left'
    : direction === 'left' ? 'down'
      : direction === 'down' ? 'right'
        : 'up'
);

export const turnRight = (direction: TronDirection): TronDirection => (
  direction === 'up' ? 'right'
    : direction === 'right' ? 'down'
      : direction === 'down' ? 'left'
        : 'up'
);

export const isOppositeDirection = (left: TronDirection, right: TronDirection): boolean => (
  OPPOSITE_DIRECTION[left] === right
);

const getSpawnCells = (columns: number, rows: number): Record<TronPlayerId, TronCell> => {
  const centerY = Math.floor(rows / 2);
  return {
    p1: {
      x: Math.max(1, Math.floor(columns / 4)),
      y: centerY,
    },
    p2: {
      x: Math.min(columns - 2, columns - 1 - Math.floor(columns / 4)),
      y: centerY,
    },
  };
};

const createRoundPlayers = (columns: number, rows: number): Record<TronPlayerId, TronGameState['players'][TronPlayerId]> => {
  const spawn = getSpawnCells(columns, rows);
  return {
    p1: {
      id: 'p1',
      head: cloneCell(spawn.p1),
      direction: 'right',
      alive: true,
      trailCellIds: [tronCellToId(columns, spawn.p1)],
    },
    p2: {
      id: 'p2',
      head: cloneCell(spawn.p2),
      direction: 'left',
      alive: true,
      trailCellIds: [tronCellToId(columns, spawn.p2)],
    },
  };
};

const sortQueuedTurns = (turns: TronQueuedTurn[]): TronQueuedTurn[] => (
  [...turns].sort((left, right) => {
    if (left.tick !== right.tick) return left.tick - right.tick;
    if (left.playerId !== right.playerId) return left.playerId.localeCompare(right.playerId);
    return left.direction.localeCompare(right.direction);
  })
);

const cloneRoundResult = (roundResult: TronRoundResult | null): TronRoundResult | null => (
  roundResult ? {
    winner: roundResult.winner,
    eliminated: [...roundResult.eliminated],
    reason: roundResult.reason,
  } : null
);

const cloneState = (state: TronGameState): TronGameState => ({
  columns: state.columns,
  rows: state.rows,
  tickMs: state.tickMs,
  countdownTicks: state.countdownTicks,
  countdownTicksRemaining: state.countdownTicksRemaining,
  firstToScore: state.firstToScore,
  seed: state.seed,
  tick: state.tick,
  round: state.round,
  phase: state.phase,
  score: cloneScore(state.score),
  players: {
    p1: clonePlayer(state.players.p1),
    p2: clonePlayer(state.players.p2),
  },
  pendingInputs: sortQueuedTurns(state.pendingInputs.map((turn) => ({ ...turn }))),
  roundResult: cloneRoundResult(state.roundResult),
});

export const createTronGameState = (config: Partial<TronGameConfig> = {}): TronGameState => {
  const columns = clampDimension(config.columns ?? DEFAULT_TRON_COLUMNS, DEFAULT_TRON_COLUMNS);
  const rows = clampDimension(config.rows ?? DEFAULT_TRON_ROWS, DEFAULT_TRON_ROWS);
  const tickMs = normalizeTickMs(config.tickMs ?? DEFAULT_TRON_TICK_MS);
  const countdownTicks = Math.max(0, Math.floor(config.countdownTicks ?? DEFAULT_TRON_COUNTDOWN_TICKS));
  const firstToScore = Math.max(1, Math.floor(config.firstToScore ?? DEFAULT_TRON_FIRST_TO_SCORE));

  return {
    columns,
    rows,
    tickMs,
    countdownTicks,
    countdownTicksRemaining: countdownTicks,
    firstToScore,
    seed: normalizeSeed(config.seed ?? DEFAULT_TRON_SEED),
    tick: 0,
    round: Math.max(1, Math.floor(config.round ?? 1)),
    phase: 'countdown',
    score: cloneScore(config.score ?? { p1: 0, p2: 0 }),
    players: createRoundPlayers(columns, rows),
    pendingInputs: [],
    roundResult: null,
  };
};

export const prepareNextTronRound = (state: TronGameState): TronGameState => createTronGameState({
  columns: state.columns,
  rows: state.rows,
  tickMs: state.tickMs,
  countdownTicks: state.countdownTicks,
  firstToScore: state.firstToScore,
  seed: state.seed,
  score: state.score,
  round: state.round + 1,
});

export const restartTronMatch = (state: TronGameState): TronGameState => createTronGameState({
  columns: state.columns,
  rows: state.rows,
  tickMs: state.tickMs,
  countdownTicks: state.countdownTicks,
  firstToScore: state.firstToScore,
  seed: state.seed,
});

export const setTronRoundResult = (
  state: TronGameState,
  result: TronRoundResult,
  nextPhase: TronRoundPhase = 'round_over',
): TronGameState => {
  const nextScore = cloneScore(state.score);
  if (result.winner) {
    nextScore[result.winner] += 1;
  }
  const phase = result.winner && nextScore[result.winner] >= state.firstToScore ? 'match_over' : nextPhase;
  return {
    ...cloneState(state),
    phase,
    score: nextScore,
    roundResult: cloneRoundResult(result),
    pendingInputs: [],
  };
};

const getPlannedDirection = (
  state: TronGameState,
  playerId: TronPlayerId,
  targetTick: number,
): TronDirection => {
  let planned = state.players[playerId].direction;
  for (const turn of state.pendingInputs) {
    if (turn.playerId !== playerId || turn.tick > targetTick) continue;
    if (turn.direction === planned || isOppositeDirection(planned, turn.direction)) continue;
    planned = turn.direction;
  }
  return planned;
};

export const queueTurn = (
  state: TronGameState,
  playerId: TronPlayerId,
  direction: TronDirection,
  tick: number,
): TronGameState => {
  if (state.phase === 'round_over' || state.phase === 'match_over') return state;
  if (!state.players[playerId].alive) return state;

  const targetTick = Math.max(state.tick + 1, Math.floor(tick));
  const planned = getPlannedDirection(state, playerId, targetTick);
  if (direction === planned || isOppositeDirection(planned, direction)) {
    return state;
  }

  const turns = state.pendingInputs
    .filter((turn) => !(turn.playerId === playerId && turn.tick === targetTick))
    .concat({ playerId, direction, tick: targetTick });

  return {
    ...cloneState(state),
    pendingInputs: sortQueuedTurns(turns),
  };
};

const resolveDirectionsForTick = (state: TronGameState, tick: number): {
  directions: Record<TronPlayerId, TronDirection>;
  remainingInputs: TronQueuedTurn[];
} => {
  const directions: Record<TronPlayerId, TronDirection> = {
    p1: state.players.p1.direction,
    p2: state.players.p2.direction,
  };
  const remainingInputs: TronQueuedTurn[] = [];

  for (const turn of state.pendingInputs) {
    if (turn.tick > tick) {
      remainingInputs.push({ ...turn });
      continue;
    }
    const current = directions[turn.playerId];
    if (turn.direction === current || isOppositeDirection(current, turn.direction)) continue;
    directions[turn.playerId] = turn.direction;
  }

  return { directions, remainingInputs };
};

const isCellOutOfBounds = (state: TronGameState, cell: TronCell): boolean => (
  cell.x < 0
  || cell.x >= state.columns
  || cell.y < 0
  || cell.y >= state.rows
);

const collectOccupiedCells = (state: TronGameState): Set<number> => {
  const occupied = new Set<number>();
  for (const playerId of TRON_PLAYERS) {
    for (const cellId of state.players[playerId].trailCellIds) {
      occupied.add(cellId);
    }
  }
  return occupied;
};

const determineCollisionReason = (args: {
  outOfBounds: boolean;
  hitsTrail: boolean;
  sameCell: boolean;
  swap: boolean;
}): TronRoundResultReason => {
  if (args.sameCell) return 'same_cell';
  if (args.swap) return 'swap';
  if (args.outOfBounds) return 'wall';
  return 'trail';
};

export const stepTronGame = (state: TronGameState): TronGameState => {
  if (state.phase === 'round_over' || state.phase === 'match_over') return state;

  const nextTick = state.tick + 1;
  if (state.phase === 'countdown') {
    const nextCountdown = Math.max(0, state.countdownTicksRemaining - 1);
    return {
      ...cloneState(state),
      tick: nextTick,
      countdownTicksRemaining: nextCountdown,
      phase: nextCountdown === 0 ? 'running' : 'countdown',
    };
  }

  const { directions, remainingInputs } = resolveDirectionsForTick(state, nextTick);
  const occupied = collectOccupiedCells(state);
  const nextPlayers = {
    p1: clonePlayer(state.players.p1),
    p2: clonePlayer(state.players.p2),
  };
  const alivePlayers = TRON_PLAYERS.filter((playerId) => state.players[playerId].alive);

  if (alivePlayers.length < 2) {
    const fallbackWinner = alivePlayers[0] ?? null;
    const fallbackReason: TronRoundResult = {
      winner: fallbackWinner,
      eliminated: TRON_PLAYERS.filter((playerId) => playerId !== fallbackWinner),
      reason: 'trail',
    };
    return setTronRoundResult({
      ...cloneState(state),
      tick: nextTick,
      pendingInputs: remainingInputs,
    }, fallbackReason);
  }

  const nextHeads: Record<TronPlayerId, TronCell> = {
    p1: moveTronCell(state.players.p1.head, directions.p1),
    p2: moveTronCell(state.players.p2.head, directions.p2),
  };
  const nextHeadIds = {
    p1: tronCellToId(state.columns, nextHeads.p1),
    p2: tronCellToId(state.columns, nextHeads.p2),
  };
  const sameCell = nextHeadIds.p1 === nextHeadIds.p2;
  const swap = (
    nextHeadIds.p1 === tronCellToId(state.columns, state.players.p2.head)
    && nextHeadIds.p2 === tronCellToId(state.columns, state.players.p1.head)
  );
  const perPlayerFlags = {
    p1: {
      outOfBounds: isCellOutOfBounds(state, nextHeads.p1),
      hitsTrail: occupied.has(nextHeadIds.p1),
      sameCell,
      swap,
    },
    p2: {
      outOfBounds: isCellOutOfBounds(state, nextHeads.p2),
      hitsTrail: occupied.has(nextHeadIds.p2),
      sameCell,
      swap,
    },
  };

  const eliminated = TRON_PLAYERS.filter((playerId) => {
    const flags = perPlayerFlags[playerId];
    return flags.outOfBounds || flags.hitsTrail || flags.sameCell || flags.swap;
  });

  for (const playerId of TRON_PLAYERS) {
    nextPlayers[playerId].direction = directions[playerId];
  }

  if (eliminated.length > 0) {
    for (const playerId of eliminated) {
      nextPlayers[playerId].alive = false;
    }
    const winner = eliminated.length === 1
      ? TRON_PLAYERS.find((playerId) => !eliminated.includes(playerId)) ?? null
      : null;
    const reason = determineCollisionReason(perPlayerFlags[eliminated[0] ?? 'p1']);

    return setTronRoundResult({
      ...cloneState(state),
      tick: nextTick,
      players: nextPlayers,
      pendingInputs: remainingInputs,
    }, {
      winner,
      eliminated,
      reason,
    });
  }

  for (const playerId of TRON_PLAYERS) {
    nextPlayers[playerId].head = cloneCell(nextHeads[playerId]);
    nextPlayers[playerId].trailCellIds = [
      ...nextPlayers[playerId].trailCellIds,
      nextHeadIds[playerId],
    ];
  }

  return {
    ...cloneState(state),
    tick: nextTick,
    players: nextPlayers,
    pendingInputs: remainingInputs,
  };
};

export const serializeTronSnapshot = (state: TronGameState): TronSnapshot => ({
  ...cloneState(state),
  version: 1,
});

export const hydrateTronSnapshot = (snapshot: TronSnapshot): TronGameState => ({
  ...cloneState(snapshot),
});

const stableSerialize = (snapshot: TronSnapshot): string => JSON.stringify({
  version: snapshot.version,
  columns: snapshot.columns,
  rows: snapshot.rows,
  tickMs: snapshot.tickMs,
  countdownTicks: snapshot.countdownTicks,
  countdownTicksRemaining: snapshot.countdownTicksRemaining,
  firstToScore: snapshot.firstToScore,
  seed: snapshot.seed,
  tick: snapshot.tick,
  round: snapshot.round,
  phase: snapshot.phase,
  score: snapshot.score,
  players: {
    p1: snapshot.players.p1,
    p2: snapshot.players.p2,
  },
  pendingInputs: snapshot.pendingInputs,
  roundResult: snapshot.roundResult,
});

export const checksumTronSnapshot = (snapshot: TronSnapshot): string => {
  const text = stableSerialize(snapshot);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};
