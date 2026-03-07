import type {
  TronCell,
  TronControlSource,
  TronDirection,
  TronGameConfig,
  TronGameState,
  TronGridPoint,
  TronMode,
  TronOccupancyGrid,
  TronPlayerId,
  TronPlayerState,
  TronQueuedTurn,
  TronRoundPhase,
  TronRoundResult,
  TronRoundResultReason,
  TronStepEvent,
  TronStepResult,
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
export const DEFAULT_TRON_MODE: TronMode = 'localMultiplayer';
export const TRON_BOUNDARY_RULE = 'solid_walls';
export const TRON_TURN_GATE_RULE = 'cell_step';
export const TRON_TRAIL_PERSISTENCE_RULE = 'persist_after_elimination';
export const TRON_SAME_CELL_RULE = 'same_empty_cell_eliminates_all';
export const TRON_SWAP_RULE = 'head_swap_eliminates_all';

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
  impactPoint: null,
});

const clonePlayer = (player: TronPlayerState): TronPlayerState => ({
  id: player.id,
  head: cloneCell(player.head),
  direction: player.direction,
  alive: player.alive,
  trailCellIds: [...player.trailCellIds],
  impactPoint: player.impactPoint ? { ...player.impactPoint } : null,
});

const clonePlayers = (players: Record<TronPlayerId, TronPlayerState>): Record<TronPlayerId, TronPlayerState> => ({
  p1: clonePlayer(players.p1),
  p2: clonePlayer(players.p2),
  p3: clonePlayer(players.p3),
  p4: clonePlayer(players.p4),
});

const createControlSources = (
  controlSources: Partial<Record<TronPlayerId, TronControlSource>> = {},
): Record<TronPlayerId, TronControlSource> => ({
  p1: controlSources.p1 ?? 'human',
  p2: controlSources.p2 ?? 'human',
  p3: controlSources.p3 ?? 'human',
  p4: controlSources.p4 ?? 'human',
});

const cloneControlSources = (
  controlSources: Record<TronPlayerId, TronControlSource>,
): Record<TronPlayerId, TronControlSource> => createControlSources(controlSources);

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

const normalizeTronMode = (value: TronMode | undefined): TronMode => (
  value === 'playerVsCpu' || value === 'localMultiplayer' || value === 'spectate'
    ? value
    : DEFAULT_TRON_MODE
);

const inferControlSourcesFromMode = (
  activePlayerIds: TronPlayerId[],
  mode: TronMode,
): Record<TronPlayerId, TronControlSource> => {
  const controlSources = createControlSources();

  activePlayerIds.forEach((playerId, index) => {
    if (mode === 'spectate') {
      controlSources[playerId] = 'cpu';
      return;
    }
    if (mode === 'playerVsCpu') {
      controlSources[playerId] = index === 0 ? 'human' : 'cpu';
      return;
    }
    controlSources[playerId] = 'human';
  });

  return controlSources;
};

const inferModeFromControlSources = (
  activePlayerIds: TronPlayerId[],
  controlSources: Partial<Record<TronPlayerId, TronControlSource>>,
): TronMode => {
  if (activePlayerIds.length === 0) return DEFAULT_TRON_MODE;
  const specifiedActiveCount = activePlayerIds.filter((playerId) => (
    controlSources[playerId] === 'human' || controlSources[playerId] === 'cpu'
  )).length;
  if (specifiedActiveCount === 0) return DEFAULT_TRON_MODE;
  if (activePlayerIds.every((playerId) => controlSources[playerId] === 'cpu')) {
    return 'spectate';
  }
  if (activePlayerIds.every((playerId) => controlSources[playerId] === 'human')) {
    return 'localMultiplayer';
  }
  return 'playerVsCpu';
};

export const tronCellToId = (columns: number, cell: TronCell): number => ((cell.y * columns) + cell.x);

export const tronIdToCell = (columns: number, cellId: number): TronCell => ({
  x: cellId % columns,
  y: Math.floor(cellId / columns),
});

export const toTronGridPoint = (cell: TronCell): TronGridPoint => ({
  x: cell.x + 0.5,
  y: cell.y + 0.5,
});

export const moveTronCell = (cell: TronCell, direction: TronDirection): TronCell => {
  if (direction === 'up') return { x: cell.x, y: cell.y - 1 };
  if (direction === 'right') return { x: cell.x + 1, y: cell.y };
  if (direction === 'down') return { x: cell.x, y: cell.y + 1 };
  return { x: cell.x - 1, y: cell.y };
};

export const isTronCellWithinBounds = (
  state: Pick<TronGameState, 'columns' | 'rows'>,
  cell: TronCell,
): boolean => (
  cell.x >= 0
  && cell.x < state.columns
  && cell.y >= 0
  && cell.y < state.rows
);

export const createTronOccupancyGrid = (columns: number, rows: number): TronOccupancyGrid => (
  new Uint8Array(columns * rows)
);

export const cloneTronOccupancyGrid = (grid: TronOccupancyGrid): TronOccupancyGrid => new Uint8Array(grid);

export const buildTronOccupancyGrid = (
  state: Pick<TronGameState, 'columns' | 'rows' | 'activePlayerIds' | 'players'>,
): TronOccupancyGrid => {
  const occupancy = createTronOccupancyGrid(state.columns, state.rows);
  state.activePlayerIds.forEach((playerId) => {
    state.players[playerId].trailCellIds.forEach((cellId) => {
      if (cellId >= 0 && cellId < occupancy.length) {
        occupancy[cellId] = 1;
      }
    });
  });
  return occupancy;
};

export const buildTronTraversableOccupancyGrid = (
  state: Pick<TronGameState, 'columns' | 'rows' | 'activePlayerIds' | 'players'>,
  occupancy = buildTronOccupancyGrid(state),
): TronOccupancyGrid => {
  const traversable = cloneTronOccupancyGrid(occupancy);
  state.activePlayerIds.forEach((playerId) => {
    const player = state.players[playerId];
    if (!player.alive) return;
    const headId = tronCellToId(state.columns, player.head);
    if (headId >= 0 && headId < traversable.length) {
      traversable[headId] = 0;
    }
  });
  return traversable;
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
      impactPoint: null,
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
  mode: state.mode,
  controlSources: cloneControlSources(state.controlSources),
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
  const mode = normalizeTronMode(config.mode ?? inferModeFromControlSources(activePlayerIds, config.controlSources ?? {}));
  const controlSources = createControlSources(
    config.controlSources ?? inferControlSourcesFromMode(activePlayerIds, mode),
  );

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
    mode,
    controlSources,
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
  mode: state.mode,
  controlSources: state.controlSources,
});

export const restartTronMatch = (state: TronGameState): TronGameState => createTronGameState({
  columns: state.columns,
  rows: state.rows,
  tickMs: state.tickMs,
  countdownTicks: state.countdownTicks,
  firstToScore: state.firstToScore,
  seed: state.seed,
  activePlayerIds: state.activePlayerIds,
  mode: state.mode,
  controlSources: state.controlSources,
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
  // This engine advances one cell per fixed tick, so every tick boundary is a legal 90-degree turn gate.
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
  !isTronCellWithinBounds(state, cell)
);

const isOccupiedCellId = (occupancy: TronOccupancyGrid, cellId: number | null): boolean => (
  cellId != null
  && cellId >= 0
  && cellId < occupancy.length
  && occupancy[cellId] !== 0
);

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

const createCrashEventId = (args: {
  playerId: TronPlayerId;
  tick: number;
  round: number;
  reason: TronRoundResultReason;
  impactPoint: TronGridPoint;
}): string => (
  `${args.round}:${args.tick}:${args.playerId}:${args.reason}:${args.impactPoint.x.toFixed(3)}:${args.impactPoint.y.toFixed(3)}`
);

const getWallImpactPoint = (
  state: TronGameState,
  currentHead: TronCell,
  direction: TronDirection,
): TronGridPoint => {
  if (direction === 'left') {
    return { x: 0, y: currentHead.y + 0.5 };
  }
  if (direction === 'right') {
    return { x: state.columns, y: currentHead.y + 0.5 };
  }
  if (direction === 'up') {
    return { x: currentHead.x + 0.5, y: 0 };
  }
  return { x: currentHead.x + 0.5, y: state.rows };
};

const getSwapImpactPoint = (state: TronGameState, playerId: TronPlayerId, nextHead: TronCell): TronGridPoint => {
  const current = toTronGridPoint(state.players[playerId].head);
  const next = toTronGridPoint(nextHead);
  return {
    x: (current.x + next.x) / 2,
    y: (current.y + next.y) / 2,
  };
};

const getImpactPointForFlags = (args: {
  state: TronGameState;
  playerId: TronPlayerId;
  direction: TronDirection;
  nextHead: TronCell;
  flags: {
    outOfBounds: boolean;
    hitsTrail: boolean;
    sameCell: boolean;
    swap: boolean;
  };
}): TronGridPoint => {
  const { state, playerId, direction, nextHead, flags } = args;
  if (flags.sameCell) return toTronGridPoint(nextHead);
  if (flags.swap) return getSwapImpactPoint(state, playerId, nextHead);
  if (flags.outOfBounds) return getWallImpactPoint(state, state.players[playerId].head, direction);
  return toTronGridPoint(nextHead);
};

const mergeImmediateTurns = (state: TronGameState, immediateTurns: TronQueuedTurn[]): TronGameState => {
  if (immediateTurns.length === 0) return state;
  return immediateTurns.reduce((current, turn) => (
    queueTurn(current, turn.playerId, turn.direction, turn.tick)
  ), state);
};

export const stepTronGame = (
  state: TronGameState,
  immediateTurns: TronQueuedTurn[] = [],
): TronStepResult => {
  const queuedState = mergeImmediateTurns(state, immediateTurns);
  if (queuedState.phase === 'round_over' || queuedState.phase === 'match_over') {
    return {
      state: queuedState,
      events: [],
    };
  }

  const nextTick = queuedState.tick + 1;
  if (queuedState.phase === 'countdown') {
    const nextCountdown = Math.max(0, queuedState.countdownTicksRemaining - 1);
    return {
      state: {
        ...cloneState(queuedState),
        tick: nextTick,
        countdownTicksRemaining: nextCountdown,
        phase: nextCountdown === 0 ? 'running' : 'countdown',
      },
      events: [],
    };
  }

  const { directions, remainingInputs } = resolveDirectionsForTick(queuedState, nextTick);
  const occupied = buildTronOccupancyGrid(queuedState);
  const nextPlayers = clonePlayers(queuedState.players);
  const alivePlayers = queuedState.activePlayerIds.filter((playerId) => queuedState.players[playerId].alive);

  if (alivePlayers.length <= 1) {
    const winner = alivePlayers[0] ?? null;
    return {
      state: setTronRoundResult({
        ...cloneState(queuedState),
        tick: nextTick,
        pendingInputs: remainingInputs,
      }, {
        winner,
        eliminated: queuedState.activePlayerIds.filter((playerId) => playerId !== winner),
        reason: winner ? 'abandon' : 'trail',
      }),
      events: [],
    };
  }

  const nextHeads = new Map<TronPlayerId, TronCell>();
  const nextHeadIds = new Map<TronPlayerId, number | null>();
  const currentHeadIds = new Map<TronPlayerId, number>();
  const sameCellIds = new Set<number>();
  const nextHeadCounts = new Map<number, number>();
  const swapPlayers = new Set<TronPlayerId>();

  alivePlayers.forEach((playerId) => {
    const nextHead = moveTronCell(queuedState.players[playerId].head, directions[playerId]);
    nextHeads.set(playerId, nextHead);
    const nextHeadId = isTronCellWithinBounds(queuedState, nextHead)
      ? tronCellToId(queuedState.columns, nextHead)
      : null;
    nextHeadIds.set(playerId, nextHeadId);
    currentHeadIds.set(playerId, tronCellToId(queuedState.columns, queuedState.players[playerId].head));
    if (nextHeadId != null) {
      nextHeadCounts.set(nextHeadId, (nextHeadCounts.get(nextHeadId) ?? 0) + 1);
    }
  });

  nextHeadCounts.forEach((count, cellId) => {
    if (count > 1 && !isOccupiedCellId(occupied, cellId)) {
      sameCellIds.add(cellId);
    }
  });

  for (let leftIndex = 0; leftIndex < alivePlayers.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < alivePlayers.length; rightIndex += 1) {
      const leftPlayer = alivePlayers[leftIndex]!;
      const rightPlayer = alivePlayers[rightIndex]!;
      if (
        nextHeadIds.get(leftPlayer) === currentHeadIds.get(rightPlayer)
        && nextHeadIds.get(rightPlayer) === currentHeadIds.get(leftPlayer)
        && nextHeadIds.get(leftPlayer) != null
        && nextHeadIds.get(rightPlayer) != null
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
      outOfBounds: isCellOutOfBounds(queuedState, nextHead),
      hitsTrail: isOccupiedCellId(occupied, nextHeadId),
      sameCell: nextHeadId != null && sameCellIds.has(nextHeadId),
      swap: swapPlayers.has(playerId),
    });
  });

  const eliminated = alivePlayers.filter((playerId) => {
    const flags = perPlayerFlags.get(playerId)!;
    return flags.outOfBounds || flags.hitsTrail || flags.sameCell || flags.swap;
  });

  queuedState.activePlayerIds.forEach((playerId) => {
    nextPlayers[playerId].direction = directions[playerId];
  });

  if (eliminated.length > 0) {
    const events: TronStepEvent[] = [];

    eliminated.forEach((playerId) => {
      nextPlayers[playerId].alive = false;
      const flags = perPlayerFlags.get(playerId)!;
      const impactPoint = getImpactPointForFlags({
        state: queuedState,
        playerId,
        direction: directions[playerId],
        nextHead: nextHeads.get(playerId)!,
        flags,
      });
      nextPlayers[playerId].impactPoint = impactPoint;
      events.push({
        type: 'crash',
        eventId: createCrashEventId({
          playerId,
          tick: nextTick,
          round: queuedState.round,
          reason: pickRoundReason(reasonsForFlags(flags)),
          impactPoint,
        }),
        playerId,
        tick: nextTick,
        round: queuedState.round,
        reason: pickRoundReason(reasonsForFlags(flags)),
        impactPoint,
      });
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
        nextHeadId!,
      ];
      nextPlayers[playerId].impactPoint = null;
    });

    if (survivors.length > 1) {
      return {
        state: {
          ...cloneState(queuedState),
          tick: nextTick,
          players: nextPlayers,
          pendingInputs: remainingInputs,
          roundResult: null,
        },
        events,
      };
    }

    return {
      state: setTronRoundResult({
        ...cloneState(queuedState),
        tick: nextTick,
        players: nextPlayers,
        pendingInputs: remainingInputs,
      }, {
        winner,
        eliminated: eliminated.sort((left, right) => left.localeCompare(right)),
        reason: pickRoundReason(reasons),
      }),
      events,
    };
  }

  alivePlayers.forEach((playerId) => {
    const nextHead = nextHeads.get(playerId)!;
    const nextHeadId = nextHeadIds.get(playerId)!;
    nextPlayers[playerId].head = cloneCell(nextHead);
    nextPlayers[playerId].trailCellIds = [
      ...nextPlayers[playerId].trailCellIds,
      nextHeadId!,
    ];
    nextPlayers[playerId].impactPoint = null;
  });

  return {
    state: {
      ...cloneState(queuedState),
      tick: nextTick,
      players: nextPlayers,
      pendingInputs: remainingInputs,
    },
    events: [],
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
  mode: snapshot.mode,
  controlSources: snapshot.controlSources,
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
