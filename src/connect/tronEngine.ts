import type {
  TronCell,
  TronDirection,
  TronGameConfig,
  TronGameState,
  TronPlayerId,
  TronPlayerState,
  TronQueuedTurn,
  TronRoundPhase,
  TronRoundResult,
  TronRoundResultReason,
  TronSnapshot,
} from './types';

export const TRON_PLAYER_IDS: TronPlayerId[] = ['p1', 'p2', 'p3', 'p4'];
export const TRON_DIRECTIONS: TronDirection[] = ['up', 'right', 'down', 'left'];
export const DEFAULT_TRON_COLUMNS = 60;
export const DEFAULT_TRON_ROWS = 40;
export const DEFAULT_TRON_TICK_MS = 50;
export const DEFAULT_TRON_COUNTDOWN_TICKS = 20;
export const DEFAULT_TRON_FIRST_TO_SCORE = 5;
export const DEFAULT_TRON_SEED = 1337;

const OPPOSITE_DIRECTION: Record<TronDirection, TronDirection> = {
  up: 'down',
  right: 'left',
  down: 'up',
  left: 'right',
};

const ROUND_REASON_PRIORITY: TronRoundResultReason[] = [
  'same_cell',
  'swap',
  'wall',
  'trail',
  'disconnect',
  'abandon',
];

const cloneCell = (cell: TronCell): TronCell => ({ x: cell.x, y: cell.y });

export const createTronScoreRecord = (
  score: Partial<Record<TronPlayerId, number>> = {},
): Record<TronPlayerId, number> => ({
  p1: score.p1 ?? 0,
  p2: score.p2 ?? 0,
  p3: score.p3 ?? 0,
  p4: score.p4 ?? 0,
});

const createInactivePlayer = (playerId: TronPlayerId): TronPlayerState => ({
  id: playerId,
  head: { x: 0, y: 0 },
  direction: 'up',
  alive: false,
  trailCellIds: [],
});

const clonePlayer = (player: TronPlayerState): TronPlayerState => ({
  id: player.id,
  head: cloneCell(player.head),
  direction: player.direction,
  alive: player.alive,
  trailCellIds: [...player.trailCellIds],
});

const clonePlayers = (players: Record<TronPlayerId, TronPlayerState>): Record<TronPlayerId, TronPlayerState> => ({
  p1: clonePlayer(players.p1),
  p2: clonePlayer(players.p2),
  p3: clonePlayer(players.p3),
  p4: clonePlayer(players.p4),
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

const normalizeActivePlayerIds = (playerIds: TronPlayerId[]): TronPlayerId[] => {
  const unique = [...new Set(playerIds.filter((playerId): playerId is TronPlayerId => TRON_PLAYER_IDS.includes(playerId)))];
  return unique.sort((left, right) => left.localeCompare(right));
};

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

const getSpawnAnchors = (columns: number, rows: number, activeCount: number): Array<{ head: TronCell; direction: TronDirection }> => {
  const centerX = Math.floor(columns / 2);
  const centerY = Math.floor(rows / 2);
  const leftX = Math.max(1, Math.floor(columns / 4));
  const rightX = Math.min(columns - 2, columns - 1 - Math.floor(columns / 4));
  const topY = Math.max(1, Math.floor(rows / 4));
  const bottomY = Math.min(rows - 2, rows - 1 - Math.floor(rows / 4));

  if (activeCount === 2) {
    return [
      { head: { x: leftX, y: centerY }, direction: 'right' },
      { head: { x: rightX, y: centerY }, direction: 'left' },
    ];
  }
  if (activeCount === 3) {
    return [
      { head: { x: leftX, y: centerY }, direction: 'right' },
      { head: { x: rightX, y: centerY }, direction: 'left' },
      { head: { x: centerX, y: topY }, direction: 'down' },
    ];
  }
  return [
    { head: { x: leftX, y: centerY }, direction: 'right' },
    { head: { x: rightX, y: centerY }, direction: 'left' },
    { head: { x: centerX, y: topY }, direction: 'down' },
    { head: { x: centerX, y: bottomY }, direction: 'up' },
  ];
};

const createRoundPlayers = (
  activePlayerIds: TronPlayerId[],
  columns: number,
  rows: number,
): Record<TronPlayerId, TronPlayerState> => {
  const players: Record<TronPlayerId, TronPlayerState> = {
    p1: createInactivePlayer('p1'),
    p2: createInactivePlayer('p2'),
    p3: createInactivePlayer('p3'),
    p4: createInactivePlayer('p4'),
  };

  const orderedActive = normalizeActivePlayerIds(activePlayerIds);
  const anchors = getSpawnAnchors(columns, rows, orderedActive.length);
  orderedActive.forEach((playerId, index) => {
    const anchor = anchors[index];
    if (!anchor) return;
    players[playerId] = {
      id: playerId,
      head: cloneCell(anchor.head),
      direction: anchor.direction,
      alive: true,
      trailCellIds: [tronCellToId(columns, anchor.head)],
    };
  });

  return players;
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
  activePlayerIds: [...state.activePlayerIds],
  score: createTronScoreRecord(state.score),
  players: clonePlayers(state.players),
  pendingInputs: sortQueuedTurns(state.pendingInputs.map((turn) => ({ ...turn }))),
  roundResult: cloneRoundResult(state.roundResult),
});

export const createTronGameState = (config: Partial<TronGameConfig> = {}): TronGameState => {
  const columns = clampDimension(config.columns ?? DEFAULT_TRON_COLUMNS, DEFAULT_TRON_COLUMNS);
  const rows = clampDimension(config.rows ?? DEFAULT_TRON_ROWS, DEFAULT_TRON_ROWS);
  const tickMs = normalizeTickMs(config.tickMs ?? DEFAULT_TRON_TICK_MS);
  const countdownTicks = Math.max(0, Math.floor(config.countdownTicks ?? DEFAULT_TRON_COUNTDOWN_TICKS));
  const firstToScore = Math.max(1, Math.floor(config.firstToScore ?? DEFAULT_TRON_FIRST_TO_SCORE));
  const activePlayerIds = normalizeActivePlayerIds(config.activePlayerIds ?? ['p1', 'p2']);

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
    activePlayerIds,
    score: createTronScoreRecord(config.score),
    players: createRoundPlayers(activePlayerIds, columns, rows),
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
  activePlayerIds: state.activePlayerIds,
});

export const restartTronMatch = (state: TronGameState): TronGameState => createTronGameState({
  columns: state.columns,
  rows: state.rows,
  tickMs: state.tickMs,
  countdownTicks: state.countdownTicks,
  firstToScore: state.firstToScore,
  seed: state.seed,
  activePlayerIds: state.activePlayerIds,
});

export const setTronRoundResult = (
  state: TronGameState,
  result: TronRoundResult,
  nextPhase: TronRoundPhase = 'round_over',
): TronGameState => {
  const nextScore = createTronScoreRecord(state.score);
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
  if (!state.activePlayerIds.includes(playerId) || !state.players[playerId].alive) return state;

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
    p3: state.players.p3.direction,
    p4: state.players.p4.direction,
  };
  const remainingInputs: TronQueuedTurn[] = [];

  for (const turn of state.pendingInputs) {
    if (turn.tick > tick) {
      remainingInputs.push({ ...turn });
      continue;
    }
    if (!state.activePlayerIds.includes(turn.playerId)) continue;
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
  state.activePlayerIds.forEach((playerId) => {
    state.players[playerId].trailCellIds.forEach((cellId) => occupied.add(cellId));
  });
  return occupied;
};

const pickRoundReason = (reasons: TronRoundResultReason[]): TronRoundResultReason => (
  ROUND_REASON_PRIORITY.find((reason) => reasons.includes(reason)) ?? 'trail'
);

const reasonsForFlags = (flags: {
  outOfBounds: boolean;
  hitsTrail: boolean;
  sameCell: boolean;
  swap: boolean;
}): TronRoundResultReason[] => {
  const reasons: TronRoundResultReason[] = [];
  if (flags.sameCell) reasons.push('same_cell');
  if (flags.swap) reasons.push('swap');
  if (flags.outOfBounds) reasons.push('wall');
  if (flags.hitsTrail) reasons.push('trail');
  return reasons;
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
  const nextPlayers = clonePlayers(state.players);
  const alivePlayers = state.activePlayerIds.filter((playerId) => state.players[playerId].alive);

  if (alivePlayers.length <= 1) {
    const winner = alivePlayers[0] ?? null;
    return setTronRoundResult({
      ...cloneState(state),
      tick: nextTick,
      pendingInputs: remainingInputs,
    }, {
      winner,
      eliminated: state.activePlayerIds.filter((playerId) => playerId !== winner),
      reason: winner ? 'abandon' : 'trail',
    });
  }

  const nextHeads = new Map<TronPlayerId, TronCell>();
  const nextHeadIds = new Map<TronPlayerId, number>();
  const currentHeadIds = new Map<TronPlayerId, number>();
  const sameCellIds = new Set<number>();
  const nextHeadCounts = new Map<number, number>();
  const swapPlayers = new Set<TronPlayerId>();

  alivePlayers.forEach((playerId) => {
    const nextHead = moveTronCell(state.players[playerId].head, directions[playerId]);
    nextHeads.set(playerId, nextHead);
    nextHeadIds.set(playerId, tronCellToId(state.columns, nextHead));
    currentHeadIds.set(playerId, tronCellToId(state.columns, state.players[playerId].head));
    const nextHeadId = nextHeadIds.get(playerId) ?? 0;
    nextHeadCounts.set(nextHeadId, (nextHeadCounts.get(nextHeadId) ?? 0) + 1);
  });

  nextHeadCounts.forEach((count, cellId) => {
    if (count > 1) sameCellIds.add(cellId);
  });

  for (let leftIndex = 0; leftIndex < alivePlayers.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < alivePlayers.length; rightIndex += 1) {
      const leftPlayer = alivePlayers[leftIndex]!;
      const rightPlayer = alivePlayers[rightIndex]!;
      if (
        nextHeadIds.get(leftPlayer) === currentHeadIds.get(rightPlayer)
        && nextHeadIds.get(rightPlayer) === currentHeadIds.get(leftPlayer)
      ) {
        swapPlayers.add(leftPlayer);
        swapPlayers.add(rightPlayer);
      }
    }
  }

  const perPlayerFlags = new Map<TronPlayerId, {
    outOfBounds: boolean;
    hitsTrail: boolean;
    sameCell: boolean;
    swap: boolean;
  }>();

  alivePlayers.forEach((playerId) => {
    const nextHead = nextHeads.get(playerId)!;
    const nextHeadId = nextHeadIds.get(playerId)!;
    perPlayerFlags.set(playerId, {
      outOfBounds: isCellOutOfBounds(state, nextHead),
      hitsTrail: occupied.has(nextHeadId),
      sameCell: sameCellIds.has(nextHeadId),
      swap: swapPlayers.has(playerId),
    });
  });

  const eliminated = alivePlayers.filter((playerId) => {
    const flags = perPlayerFlags.get(playerId)!;
    return flags.outOfBounds || flags.hitsTrail || flags.sameCell || flags.swap;
  });

  state.activePlayerIds.forEach((playerId) => {
    nextPlayers[playerId].direction = directions[playerId];
  });

  if (eliminated.length > 0) {
    eliminated.forEach((playerId) => {
      nextPlayers[playerId].alive = false;
    });
    const survivors = alivePlayers.filter((playerId) => !eliminated.includes(playerId));
    const winner = survivors.length === 1 ? survivors[0] : null;
    const reasons = eliminated.flatMap((playerId) => reasonsForFlags(perPlayerFlags.get(playerId)!));

    survivors.forEach((playerId) => {
      const nextHead = nextHeads.get(playerId)!;
      const nextHeadId = nextHeadIds.get(playerId)!;
      nextPlayers[playerId].head = cloneCell(nextHead);
      nextPlayers[playerId].trailCellIds = [
        ...nextPlayers[playerId].trailCellIds,
        nextHeadId,
      ];
    });

    if (survivors.length > 1) {
      return {
        ...cloneState(state),
        tick: nextTick,
        players: nextPlayers,
        pendingInputs: remainingInputs,
        roundResult: null,
      };
    }

    return setTronRoundResult({
      ...cloneState(state),
      tick: nextTick,
      players: nextPlayers,
      pendingInputs: remainingInputs,
    }, {
      winner,
      eliminated: eliminated.sort((left, right) => left.localeCompare(right)),
      reason: pickRoundReason(reasons),
    });
  }

  alivePlayers.forEach((playerId) => {
    const nextHead = nextHeads.get(playerId)!;
    const nextHeadId = nextHeadIds.get(playerId)!;
    nextPlayers[playerId].head = cloneCell(nextHead);
    nextPlayers[playerId].trailCellIds = [
      ...nextPlayers[playerId].trailCellIds,
      nextHeadId,
    ];
  });

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
  activePlayerIds: snapshot.activePlayerIds,
  score: snapshot.score,
  players: {
    p1: snapshot.players.p1,
    p2: snapshot.players.p2,
    p3: snapshot.players.p3,
    p4: snapshot.players.p4,
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
