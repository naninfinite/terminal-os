import { describe, expect, it } from 'vitest';
import {
  createTronGameState,
  prepareNextTronRound,
  queueTurn,
  restartTronMatch,
  stepTronGame,
  tronCellToId,
} from './tronEngine';
import type { TronGameState, TronPlayerId } from './types';

const createRunningState = (state: TronGameState): TronGameState => ({
  ...state,
  phase: 'running',
  countdownTicksRemaining: 0,
});

const withPlayers = (
  state: TronGameState,
  overrides: Partial<Record<TronPlayerId, Partial<TronGameState['players'][TronPlayerId]>>>,
): TronGameState => ({
  ...state,
  players: {
    p1: { ...state.players.p1, ...overrides.p1 },
    p2: { ...state.players.p2, ...overrides.p2 },
    p3: { ...state.players.p3, ...overrides.p3 },
    p4: { ...state.players.p4, ...overrides.p4 },
  },
});

describe('tronEngine', () => {
  it('eliminates all riders targeting the same next cell and continues when others are alive', () => {
    let state = createRunningState(createTronGameState({
      columns: 12,
      rows: 10,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2', 'p3', 'p4'],
    }));
    state = withPlayers(state, {
      p1: { head: { x: 3, y: 5 }, direction: 'right', trailCellIds: [tronCellToId(12, { x: 3, y: 5 })] },
      p2: { head: { x: 5, y: 5 }, direction: 'left', trailCellIds: [tronCellToId(12, { x: 5, y: 5 })] },
      p3: { head: { x: 1, y: 1 }, direction: 'right', trailCellIds: [tronCellToId(12, { x: 1, y: 1 })] },
      p4: { head: { x: 10, y: 8 }, direction: 'left', trailCellIds: [tronCellToId(12, { x: 10, y: 8 })] },
    });

    const { state: next, events } = stepTronGame(state);

    expect(next.phase).toBe('running');
    expect(next.players.p1.alive).toBe(false);
    expect(next.players.p2.alive).toBe(false);
    expect(next.players.p3.alive).toBe(true);
    expect(next.players.p4.alive).toBe(true);
    expect(events.map((event) => event.playerId).sort()).toEqual(['p1', 'p2']);
    expect(events.every((event) => event.reason === 'same_cell')).toBe(true);
    expect(events[0]?.tick).toBe(state.tick + 1);
  });

  it('keeps eliminated trails as solid collision geometry', () => {
    let state = createRunningState(createTronGameState({
      columns: 10,
      rows: 10,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2', 'p3'],
    }));

    const deadTrailCell = tronCellToId(10, { x: 4, y: 4 });
    state = withPlayers(state, {
      p1: {
        alive: false,
        head: { x: 4, y: 4 },
        direction: 'up',
        trailCellIds: [deadTrailCell],
      },
      p2: {
        alive: true,
        head: { x: 3, y: 4 },
        direction: 'right',
        trailCellIds: [tronCellToId(10, { x: 3, y: 4 })],
      },
      p3: {
        alive: true,
        head: { x: 8, y: 8 },
        direction: 'left',
        trailCellIds: [tronCellToId(10, { x: 8, y: 8 })],
      },
    });

    const { state: next, events } = stepTronGame(state);

    expect(next.players.p2.alive).toBe(false);
    expect(events.some((event) => event.playerId === 'p2' && event.reason === 'trail')).toBe(true);
  });

  it('ends a round only when one rider remains alive', () => {
    let state = createRunningState(createTronGameState({
      columns: 10,
      rows: 10,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2', 'p3'],
    }));
    state = withPlayers(state, {
      p1: { head: { x: 9, y: 2 }, direction: 'right', trailCellIds: [tronCellToId(10, { x: 9, y: 2 })] },
      p2: { head: { x: 4, y: 4 }, direction: 'right', trailCellIds: [tronCellToId(10, { x: 4, y: 4 })] },
      p3: { head: { x: 6, y: 6 }, direction: 'left', trailCellIds: [tronCellToId(10, { x: 6, y: 6 })] },
    });

    const { state: continued } = stepTronGame(state);
    expect(continued.phase).toBe('running');
    expect(continued.roundResult).toBeNull();

    let finishState = createRunningState(createTronGameState({
      columns: 10,
      rows: 10,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2', 'p3'],
    }));
    finishState = withPlayers(finishState, {
      p1: { head: { x: 3, y: 5 }, direction: 'right', trailCellIds: [tronCellToId(10, { x: 3, y: 5 })] },
      p2: { head: { x: 5, y: 5 }, direction: 'left', trailCellIds: [tronCellToId(10, { x: 5, y: 5 })] },
      p3: { head: { x: 1, y: 1 }, direction: 'right', trailCellIds: [tronCellToId(10, { x: 1, y: 1 })] },
    });
    const { state: finished } = stepTronGame(finishState);

    expect(finished.phase).toBe('round_over');
    expect(finished.roundResult?.winner).toBe('p3');
  });

  it('detects head swaps and eliminates both riders', () => {
    let state = createRunningState(createTronGameState({
      columns: 8,
      rows: 8,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2'],
    }));
    state = withPlayers(state, {
      p1: { head: { x: 3, y: 4 }, direction: 'right', trailCellIds: [tronCellToId(8, { x: 3, y: 4 })] },
      p2: { head: { x: 4, y: 4 }, direction: 'left', trailCellIds: [tronCellToId(8, { x: 4, y: 4 })] },
    });

    const { state: next, events } = stepTronGame(state);

    expect(next.phase).toBe('round_over');
    expect(next.roundResult).toEqual({
      winner: null,
      eliminated: ['p1', 'p2'],
      reason: 'swap',
    });
    expect(events.every((event) => event.reason === 'swap')).toBe(true);
  });

  it('emits crash events with deterministic tick and impact coordinates', () => {
    let state = createRunningState(createTronGameState({
      columns: 10,
      rows: 8,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2'],
    }));
    state = {
      ...state,
      tick: 10,
    };
    state = withPlayers(state, {
      p1: { head: { x: 9, y: 3 }, direction: 'right', trailCellIds: [tronCellToId(10, { x: 9, y: 3 })] },
      p2: { head: { x: 1, y: 1 }, direction: 'right', trailCellIds: [tronCellToId(10, { x: 1, y: 1 })] },
    });

    const { state: next, events } = stepTronGame(state);
    const p1Event = events.find((event) => event.playerId === 'p1');

    expect(p1Event).toBeTruthy();
    expect(p1Event?.tick).toBe(11);
    expect(p1Event?.round).toBe(state.round);
    expect(p1Event?.reason).toBe('wall');
    expect(p1Event?.impactPoint).toEqual({ x: 10, y: 3.5 });
    expect(next.players.p1.impactPoint).toEqual({ x: 10, y: 3.5 });
  });

  it('supports deterministic stepping with queued inputs', () => {
    const base = createRunningState(createTronGameState({
      seed: 123,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2', 'p3', 'p4'],
    }));
    const queued = queueTurn(
      queueTurn(base, 'p1', 'up', base.tick + 1),
      'p4',
      'left',
      base.tick + 1,
    );

    const run = () => {
      let state = queued;
      for (let index = 0; index < 12; index += 1) {
        state = stepTronGame(state).state;
        if (state.phase === 'round_over' || state.phase === 'match_over') break;
      }
      return state;
    };

    expect(run()).toEqual(run());
  });

  it('does not depend on active rider iteration order for simultaneous crashes', () => {
    const base = createRunningState(createTronGameState({
      columns: 12,
      rows: 10,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2', 'p3'],
    }));
    const shaped = withPlayers(base, {
      p1: { head: { x: 3, y: 5 }, direction: 'right', trailCellIds: [tronCellToId(12, { x: 3, y: 5 })] },
      p2: { head: { x: 5, y: 5 }, direction: 'left', trailCellIds: [tronCellToId(12, { x: 5, y: 5 })] },
      p3: { head: { x: 6, y: 8 }, direction: 'up', trailCellIds: [tronCellToId(12, { x: 6, y: 8 })] },
    });

    const ordered = stepTronGame(shaped);
    const reversed = stepTronGame({
      ...shaped,
      activePlayerIds: ['p3', 'p2', 'p1'],
    });

    expect(reversed.state.phase).toBe(ordered.state.phase);
    expect(reversed.state.roundResult).toEqual(ordered.state.roundResult);
    expect(reversed.state.players.p1.alive).toBe(ordered.state.players.p1.alive);
    expect(reversed.state.players.p2.alive).toBe(ordered.state.players.p2.alive);
    expect(reversed.state.players.p3.alive).toBe(ordered.state.players.p3.alive);
    expect(reversed.events.map((event) => `${event.playerId}:${event.reason}`).sort()).toEqual(
      ordered.events.map((event) => `${event.playerId}:${event.reason}`).sort(),
    );
  });

  it('applies queued turns only when their scheduled turn gate is reached', () => {
    let state = createRunningState(createTronGameState({
      columns: 10,
      rows: 10,
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2'],
    }));
    state = withPlayers(state, {
      p1: { head: { x: 2, y: 2 }, direction: 'right', trailCellIds: [tronCellToId(10, { x: 2, y: 2 })] },
      p2: { head: { x: 8, y: 8 }, direction: 'left', trailCellIds: [tronCellToId(10, { x: 8, y: 8 })] },
    });

    const queued = queueTurn(state, 'p1', 'down', state.tick + 2);
    const firstStep = stepTronGame(queued).state;
    const secondStep = stepTronGame(firstStep).state;

    expect(firstStep.players.p1.direction).toBe('right');
    expect(firstStep.players.p1.head).toEqual({ x: 3, y: 2 });
    expect(secondStep.players.p1.direction).toBe('down');
    expect(secondStep.players.p1.head).toEqual({ x: 3, y: 3 });
  });

  it('rebuilds a clean round and match state while preserving locked mode metadata', () => {
    const base = createRunningState(createTronGameState({
      countdownTicks: 0,
      activePlayerIds: ['p1', 'p2', 'p3'],
      mode: 'spectate',
      controlSources: {
        p1: 'cpu',
        p2: 'cpu',
        p3: 'cpu',
        p4: 'human',
      },
      score: {
        p1: 2,
        p2: 1,
        p3: 0,
        p4: 0,
      },
      round: 3,
    }));

    const nextRound = prepareNextTronRound(base);
    const restarted = restartTronMatch(base);

    expect(nextRound.round).toBe(4);
    expect(nextRound.score).toEqual(base.score);
    expect(nextRound.mode).toBe('spectate');
    expect(nextRound.controlSources.p1).toBe('cpu');
    expect(nextRound.players.p1.trailCellIds.length).toBe(1);
    expect(restarted.round).toBe(1);
    expect(restarted.score).toEqual({ p1: 0, p2: 0, p3: 0, p4: 0 });
    expect(restarted.mode).toBe('spectate');
    expect(restarted.controlSources.p3).toBe('cpu');
  });
});
