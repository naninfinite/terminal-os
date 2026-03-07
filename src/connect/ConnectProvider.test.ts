import { describe, expect, it } from 'vitest';
import { shouldAutoAdvanceTronRound, shouldAutoRestartSpectateMatch } from './ConnectProvider';
import { buildGameConfigFromLobby, createLocalCustomLobby, setSeatMode } from './lobby';
import { createTronGameState } from './tronEngine';

describe('ConnectProvider round flow helpers', () => {
  it('auto-advances round-over states for local host-controlled matches', () => {
    const lobby = createLocalCustomLobby();
    const game = {
      ...createTronGameState({
        countdownTicks: 0,
        ...buildGameConfigFromLobby(lobby),
      }),
      phase: 'round_over' as const,
    };

    expect(shouldAutoAdvanceTronRound({
      game,
      lobby,
      matchType: 'cpu',
      isHost: true,
    })).toBe(true);
  });

  it('does not auto-advance online rounds on non-host clients', () => {
    const lobby = createLocalCustomLobby();
    const game = {
      ...createTronGameState({
        countdownTicks: 0,
        ...buildGameConfigFromLobby(lobby),
      }),
      phase: 'round_over' as const,
    };

    expect(shouldAutoAdvanceTronRound({
      game,
      lobby,
      matchType: 'online',
      isHost: false,
    })).toBe(false);
  });

  it('auto-restarts completed spectate matches only for dedicated spectate mode', () => {
    let lobby = createLocalCustomLobby();
    lobby = setSeatMode(lobby, 'p1', 'cpu');
    lobby = setSeatMode(lobby, 'p3', 'cpu');
    lobby = setSeatMode(lobby, 'p4', 'cpu');

    const game = {
      ...createTronGameState({
        countdownTicks: 0,
        ...buildGameConfigFromLobby(lobby),
      }),
      phase: 'match_over' as const,
    };

    expect(shouldAutoRestartSpectateMatch({
      game,
      lobby,
      matchType: 'spectate',
    })).toBe(true);
    expect(shouldAutoRestartSpectateMatch({
      game,
      lobby,
      matchType: 'cpu',
    })).toBe(false);
  });
});
