import { describe, expect, it } from 'vitest';
import {
  advanceSnakeGame,
  createSnakeGameState,
  queueSnakeDirection,
  restartSnakeGame,
  type SnakeCell,
  type SnakeDirection,
  type SnakeGameState,
} from './snakeGame';

const createRunningState = (state: SnakeGameState): SnakeGameState => ({
  ...state,
  status: 'running',
});

const createWrapState = (direction: SnakeDirection, snake: SnakeCell[]): SnakeGameState => createRunningState(
  createSnakeGameState({
    columns: 6,
    rows: 6,
    wrapEdges: true,
    initialDirection: direction,
    initialSnake: snake,
  }),
);

describe('snakeGame', () => {
  it('wraps around all four board edges', () => {
    expect(advanceSnakeGame(createWrapState('right', [
      { x: 5, y: 2 },
      { x: 4, y: 2 },
      { x: 3, y: 2 },
    ])).snake[0]).toEqual({ x: 0, y: 2 });

    expect(advanceSnakeGame(createWrapState('left', [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ])).snake[0]).toEqual({ x: 5, y: 2 });

    expect(advanceSnakeGame(createWrapState('up', [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ])).snake[0]).toEqual({ x: 2, y: 5 });

    expect(advanceSnakeGame(createWrapState('down', [
      { x: 2, y: 5 },
      { x: 2, y: 4 },
      { x: 2, y: 3 },
    ])).snake[0]).toEqual({ x: 2, y: 0 });
  });

  it('ends the run on self-collision', () => {
    const base = createSnakeGameState({
      columns: 6,
      rows: 6,
      wrapEdges: true,
      initialDirection: 'left',
      initialSnake: [
        { x: 2, y: 2 },
        { x: 2, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 3 },
        { x: 2, y: 3 },
      ],
    });

    const next = advanceSnakeGame(createRunningState(base));

    expect(next.status).toBe('game_over');
    expect(next.outcome).toBe('collision');
    expect(next.snake[0]).toEqual({ x: 1, y: 2 });
  });

  it('creates deterministic starting food away from the snake body', () => {
    const left = createSnakeGameState({ columns: 8, rows: 8, seed: 99 });
    const right = createSnakeGameState({ columns: 8, rows: 8, seed: 99 });

    expect(left.food).toEqual(right.food);
    expect(left.snake.some((segment) => segment.x === left.food.x && segment.y === left.food.y)).toBe(false);
  });

  it('queues legal turns and still rejects immediate reversals', () => {
    const initial = createSnakeGameState({ columns: 8, rows: 8, seed: 11 });
    const ignoredReverse = queueSnakeDirection(initial, 'left');

    expect(ignoredReverse.status).toBe('ready');
    expect(ignoredReverse.queuedDirections).toEqual([]);

    const turned = queueSnakeDirection(initial, 'up');
    const moved = advanceSnakeGame(turned);

    expect(turned.status).toBe('running');
    expect(moved.direction).toBe('up');
    expect(moved.snake).toEqual([
      { x: 4, y: 3 },
      { x: 4, y: 4 },
      { x: 3, y: 4 },
    ]);
  });

  it('never spawns apples onto occupied snake cells', () => {
    const reservedFood = { x: 4, y: 0 };
    const reservedFree = { x: 5, y: 5 };
    const snake: SnakeCell[] = [{ x: 3, y: 0 }];

    for (let y = 0; y < 6; y += 1) {
      for (let x = 0; x < 6; x += 1) {
        const isHead = x === snake[0]!.x && y === snake[0]!.y;
        const isFood = x === reservedFood.x && y === reservedFood.y;
        const isFree = x === reservedFree.x && y === reservedFree.y;
        if (!isHead && !isFood && !isFree) {
          snake.push({ x, y });
        }
      }
    }

    const base = createSnakeGameState({
      columns: 6,
      rows: 6,
      seed: 7,
      initialDirection: 'right',
      initialSnake: snake,
    });
    const state = createRunningState({
      ...base,
      snake,
      initialSnake: snake,
      food: reservedFood,
      seed: 7,
    });

    const next = advanceSnakeGame(state);

    expect(next.score).toBe(1);
    expect(next.snake).toHaveLength(35);
    expect(next.food).toEqual(reservedFree);
    expect(next.snake.some((segment) => segment.x === next.food.x && segment.y === next.food.y)).toBe(false);
  });

  it('applies the Nokia speed curve and clamps to the minimum tick', () => {
    const createSpeedState = (score: number): SnakeGameState => {
      const base = createSnakeGameState({
        columns: 8,
        rows: 8,
        wrapEdges: true,
        initialDirection: 'right',
        initialSnake: [
          { x: 3, y: 3 },
          { x: 2, y: 3 },
          { x: 1, y: 3 },
        ],
      });

      return createRunningState({
        ...base,
        score,
        food: { x: 4, y: 3 },
      });
    };

    expect(advanceSnakeGame(createSpeedState(3)).tickMs).toBe(132);
    expect(advanceSnakeGame(createSpeedState(7)).tickMs).toBe(124);
    expect(advanceSnakeGame(createSpeedState(39)).tickMs).toBe(70);
  });

  it('restarts back to the seeded initial state and initial tick speed', () => {
    const started = queueSnakeDirection(createSnakeGameState({ columns: 8, rows: 8, seed: 42 }), 'up');
    const moved = advanceSnakeGame(started);
    const restarted = restartSnakeGame({
      ...moved,
      score: 9,
      tickMs: 70,
      status: 'game_over',
    });

    const fresh = createSnakeGameState({ columns: 8, rows: 8, seed: 42 });

    expect(restarted.score).toBe(0);
    expect(restarted.status).toBe('ready');
    expect(restarted.tickMs).toBe(fresh.tickMs);
    expect(restarted.snake).toEqual(fresh.snake);
    expect(restarted.food).toEqual(fresh.food);
  });
});
