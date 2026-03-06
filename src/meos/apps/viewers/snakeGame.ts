export type SnakeDirection = 'up' | 'right' | 'down' | 'left';
export type SnakeGameStatus = 'ready' | 'running' | 'paused' | 'game_over';
export type SnakeGameOutcome = 'collision' | 'cleared' | null;

export type SnakeCell = {
  x: number;
  y: number;
};

export type SnakeGameConfig = {
  columns: number;
  rows: number;
  tickMs: number;
  minTickMs: number;
  speedStepMs: number;
  applesPerSpeedLevel: number;
  seed: number;
  wrapEdges: boolean;
  initialDirection: SnakeDirection;
  initialSnake?: SnakeCell[];
};

export type SnakeGameState = {
  columns: number;
  rows: number;
  tickMs: number;
  initialTickMs: number;
  minTickMs: number;
  speedStepMs: number;
  applesPerSpeedLevel: number;
  initialSeed: number;
  seed: number;
  wrapEdges: boolean;
  initialDirection: SnakeDirection;
  initialSnake: SnakeCell[];
  snake: SnakeCell[];
  direction: SnakeDirection;
  queuedDirections: SnakeDirection[];
  food: SnakeCell;
  score: number;
  status: SnakeGameStatus;
  outcome: SnakeGameOutcome;
  steps: number;
};

export const DEFAULT_SNAKE_TICK_MS = 140;
export const DEFAULT_SNAKE_MIN_TICK_MS = 70;
export const DEFAULT_SNAKE_SPEED_STEP_MS = 8;
export const DEFAULT_SNAKE_APPLES_PER_SPEED_LEVEL = 4;

export const DEFAULT_SNAKE_GAME_CONFIG: SnakeGameConfig = {
  columns: 18,
  rows: 12,
  tickMs: DEFAULT_SNAKE_TICK_MS,
  minTickMs: DEFAULT_SNAKE_MIN_TICK_MS,
  speedStepMs: DEFAULT_SNAKE_SPEED_STEP_MS,
  applesPerSpeedLevel: DEFAULT_SNAKE_APPLES_PER_SPEED_LEVEL,
  seed: 1337,
  wrapEdges: true,
  initialDirection: 'right',
};

const RANDOM_MODULUS = 0x1_0000_0000;
const MAX_DIRECTION_QUEUE = 2;

const OPPOSITE_DIRECTION: Record<SnakeDirection, SnakeDirection> = {
  up: 'down',
  right: 'left',
  down: 'up',
  left: 'right',
};

const clampDimension = (value: number, fallback: number): number => {
  const next = Math.floor(value);
  return Number.isFinite(next) ? Math.max(6, next) : fallback;
};

const clampTick = (value: number, fallback: number): number => {
  const next = Math.floor(value);
  return Number.isFinite(next) ? Math.max(40, next) : fallback;
};

const clampPositive = (value: number, fallback: number): number => {
  const next = Math.floor(value);
  return Number.isFinite(next) ? Math.max(1, next) : fallback;
};

const cloneCell = (cell: SnakeCell): SnakeCell => ({ x: cell.x, y: cell.y });
const cloneSnake = (snake: SnakeCell[]): SnakeCell[] => snake.map(cloneCell);

const cellsEqual = (left: SnakeCell, right: SnakeCell): boolean => left.x === right.x && left.y === right.y;
const cellKey = (cell: SnakeCell): string => `${cell.x}:${cell.y}`;

const createInitialSnake = (columns: number, rows: number): SnakeCell[] => {
  const centerY = Math.floor(rows / 2);
  const headX = Math.max(2, Math.floor(columns / 2));
  return [
    { x: headX, y: centerY },
    { x: headX - 1, y: centerY },
    { x: headX - 2, y: centerY },
  ];
};

const nextSeed = (seed: number): number => (
  ((seed >>> 0) * 1664525 + 1013904223) >>> 0
);

const directionVector = (direction: SnakeDirection): SnakeCell => {
  if (direction === 'up') return { x: 0, y: -1 };
  if (direction === 'right') return { x: 1, y: 0 };
  if (direction === 'down') return { x: 0, y: 1 };
  return { x: -1, y: 0 };
};

const translateHead = (
  head: SnakeCell,
  direction: SnakeDirection,
  columns: number,
  rows: number,
  wrapEdges: boolean,
): SnakeCell => {
  const vector = directionVector(direction);
  if (wrapEdges) {
    return {
      x: (head.x + vector.x + columns) % columns,
      y: (head.y + vector.y + rows) % rows,
    };
  }
  return {
    x: head.x + vector.x,
    y: head.y + vector.y,
  };
};

const isOutOfBounds = (cell: SnakeCell, columns: number, rows: number): boolean => (
  cell.x < 0
  || cell.x >= columns
  || cell.y < 0
  || cell.y >= rows
);

const findFoodCell = (
  columns: number,
  rows: number,
  snake: SnakeCell[],
  seed: number,
): { food: SnakeCell; seed: number } => {
  const occupied = new Set(snake.map(cellKey));
  const freeCells: SnakeCell[] = [];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const cell = { x, y };
      if (!occupied.has(cellKey(cell))) {
        freeCells.push(cell);
      }
    }
  }

  if (freeCells.length === 0) {
    return {
      food: cloneCell(snake[0] ?? { x: 0, y: 0 }),
      seed,
    };
  }

  const randomSeed = nextSeed(seed);
  const index = Math.floor((randomSeed / RANDOM_MODULUS) * freeCells.length);
  return {
    food: cloneCell(freeCells[index] ?? freeCells[0]!),
    seed: randomSeed,
  };
};

const resolveSnakeTickMs = (args: {
  score: number;
  initialTickMs: number;
  minTickMs: number;
  speedStepMs: number;
  applesPerSpeedLevel: number;
}): number => {
  const divisor = Math.max(1, args.applesPerSpeedLevel);
  const speedLevel = Math.floor(args.score / divisor);
  return Math.max(args.minTickMs, args.initialTickMs - (speedLevel * args.speedStepMs));
};

export const cloneSnakeGameState = (state: SnakeGameState): SnakeGameState => ({
  ...state,
  initialSnake: cloneSnake(state.initialSnake),
  snake: cloneSnake(state.snake),
  queuedDirections: [...state.queuedDirections],
  food: cloneCell(state.food),
});

export const createSnakeGameState = (config: Partial<SnakeGameConfig> = {}): SnakeGameState => {
  const columns = clampDimension(config.columns ?? DEFAULT_SNAKE_GAME_CONFIG.columns, DEFAULT_SNAKE_GAME_CONFIG.columns);
  const rows = clampDimension(config.rows ?? DEFAULT_SNAKE_GAME_CONFIG.rows, DEFAULT_SNAKE_GAME_CONFIG.rows);
  const initialSnake = cloneSnake(config.initialSnake?.length ? config.initialSnake : createInitialSnake(columns, rows));
  const initialDirection = config.initialDirection ?? DEFAULT_SNAKE_GAME_CONFIG.initialDirection;
  const initialTickMs = clampTick(config.tickMs ?? DEFAULT_SNAKE_GAME_CONFIG.tickMs, DEFAULT_SNAKE_GAME_CONFIG.tickMs);
  const minTickMs = clampTick(config.minTickMs ?? DEFAULT_SNAKE_GAME_CONFIG.minTickMs, DEFAULT_SNAKE_GAME_CONFIG.minTickMs);
  const speedStepMs = clampPositive(
    config.speedStepMs ?? DEFAULT_SNAKE_GAME_CONFIG.speedStepMs,
    DEFAULT_SNAKE_GAME_CONFIG.speedStepMs,
  );
  const applesPerSpeedLevel = Math.max(
    1,
    Math.floor(config.applesPerSpeedLevel ?? DEFAULT_SNAKE_GAME_CONFIG.applesPerSpeedLevel),
  );
  const initialSeed = (config.seed ?? DEFAULT_SNAKE_GAME_CONFIG.seed) >>> 0;
  const wrapEdges = config.wrapEdges ?? DEFAULT_SNAKE_GAME_CONFIG.wrapEdges;
  const foodSpawn = findFoodCell(columns, rows, initialSnake, initialSeed);

  return {
    columns,
    rows,
    tickMs: resolveSnakeTickMs({
      score: 0,
      initialTickMs,
      minTickMs,
      speedStepMs,
      applesPerSpeedLevel,
    }),
    initialTickMs,
    minTickMs,
    speedStepMs,
    applesPerSpeedLevel,
    initialSeed,
    seed: foodSpawn.seed,
    wrapEdges,
    initialDirection,
    initialSnake,
    snake: cloneSnake(initialSnake),
    direction: initialDirection,
    queuedDirections: [],
    food: foodSpawn.food,
    score: 0,
    status: 'ready',
    outcome: null,
    steps: 0,
  };
};

export const restartSnakeGame = (state: SnakeGameState): SnakeGameState => createSnakeGameState({
  columns: state.columns,
  rows: state.rows,
  tickMs: state.initialTickMs,
  minTickMs: state.minTickMs,
  speedStepMs: state.speedStepMs,
  applesPerSpeedLevel: state.applesPerSpeedLevel,
  seed: state.initialSeed,
  wrapEdges: state.wrapEdges,
  initialDirection: state.initialDirection,
  initialSnake: state.initialSnake,
});

export const queueSnakeDirection = (state: SnakeGameState, direction: SnakeDirection): SnakeGameState => {
  if (state.status === 'game_over') return state;

  const lastDirection = state.queuedDirections[state.queuedDirections.length - 1] ?? state.direction;
  if (direction === lastDirection || OPPOSITE_DIRECTION[lastDirection] === direction) {
    return state;
  }

  if (state.queuedDirections.length >= MAX_DIRECTION_QUEUE) {
    return state.status === 'paused'
      ? { ...state, status: 'running', outcome: null }
      : state;
  }

  return {
    ...state,
    status: state.status === 'ready' || state.status === 'paused' ? 'running' : state.status,
    queuedDirections: [...state.queuedDirections, direction],
    outcome: null,
  };
};

export const toggleSnakePause = (state: SnakeGameState): SnakeGameState => {
  if (state.status === 'game_over') return state;
  if (state.status === 'running') {
    return { ...state, status: 'paused' };
  }
  return {
    ...state,
    status: 'running',
    outcome: null,
  };
};

export const advanceSnakeGame = (state: SnakeGameState): SnakeGameState => {
  if (state.status !== 'running') return state;

  const direction = state.queuedDirections[0] ?? state.direction;
  const nextHead = translateHead(
    state.snake[0] ?? { x: 0, y: 0 },
    direction,
    state.columns,
    state.rows,
    state.wrapEdges,
  );
  const eatsFood = cellsEqual(nextHead, state.food);
  const nextSnake = [nextHead, ...cloneSnake(state.snake)];
  if (!eatsFood) {
    nextSnake.pop();
  }
  const bodyToCheck = eatsFood ? state.snake : state.snake.slice(0, -1);
  const collidedWithBody = bodyToCheck.some((segment) => cellsEqual(segment, nextHead));
  const collidedWithWall = !state.wrapEdges && isOutOfBounds(nextHead, state.columns, state.rows);

  if (collidedWithBody || collidedWithWall) {
    return {
      ...state,
      snake: collidedWithWall ? cloneSnake(state.snake) : nextSnake,
      direction,
      queuedDirections: [],
      status: 'game_over',
      outcome: 'collision',
      steps: state.steps + 1,
    };
  }

  if (!eatsFood) {
    return {
      ...state,
      snake: nextSnake,
      direction,
      queuedDirections: state.queuedDirections.slice(1),
      steps: state.steps + 1,
    };
  }

  const nextScore = state.score + 1;
  const nextTickMs = resolveSnakeTickMs({
    score: nextScore,
    initialTickMs: state.initialTickMs,
    minTickMs: state.minTickMs,
    speedStepMs: state.speedStepMs,
    applesPerSpeedLevel: state.applesPerSpeedLevel,
  });
  const boardFilled = nextSnake.length >= state.columns * state.rows;
  if (boardFilled) {
    return {
      ...state,
      snake: nextSnake,
      direction,
      queuedDirections: state.queuedDirections.slice(1),
      score: nextScore,
      tickMs: nextTickMs,
      status: 'game_over',
      outcome: 'cleared',
      steps: state.steps + 1,
    };
  }

  const nextFoodSpawn = findFoodCell(state.columns, state.rows, nextSnake, state.seed);
  return {
    ...state,
    snake: nextSnake,
    direction,
    queuedDirections: state.queuedDirections.slice(1),
    food: nextFoodSpawn.food,
    seed: nextFoodSpawn.seed,
    score: nextScore,
    tickMs: nextTickMs,
    steps: state.steps + 1,
  };
};
