import type {
  ConnectLobbyState,
  TronCpuDifficulty,
  TronControlSource,
  TronGameConfig,
  TronMode,
  TronPlayerId,
  TronQuickMatchSize,
  TronSeatConfig,
  TronSeatMode,
} from './types';

const PLAYER_IDS: TronPlayerId[] = ['p1', 'p2', 'p3', 'p4'];
const DEFAULT_CPU_DIFFICULTY: TronCpuDifficulty = 'medium';

const cloneSeat = (seat: TronSeatConfig): TronSeatConfig => ({
  playerId: seat.playerId,
  mode: seat.mode,
  ownerClientId: seat.ownerClientId,
});

const cloneSeats = (seats: Record<TronPlayerId, TronSeatConfig>): Record<TronPlayerId, TronSeatConfig> => ({
  p1: cloneSeat(seats.p1),
  p2: cloneSeat(seats.p2),
  p3: cloneSeat(seats.p3),
  p4: cloneSeat(seats.p4),
});

export const cloneLobby = (lobby: ConnectLobbyState): ConnectLobbyState => ({
  ...lobby,
  seats: cloneSeats(lobby.seats),
});

const createClosedSeats = (): Record<TronPlayerId, TronSeatConfig> => ({
  p1: { playerId: 'p1', mode: 'closed', ownerClientId: null },
  p2: { playerId: 'p2', mode: 'closed', ownerClientId: null },
  p3: { playerId: 'p3', mode: 'closed', ownerClientId: null },
  p4: { playerId: 'p4', mode: 'closed', ownerClientId: null },
});

const createControlSources = (
  overrides: Partial<Record<TronPlayerId, TronControlSource>> = {},
): Record<TronPlayerId, TronControlSource> => ({
  p1: overrides.p1 ?? 'human',
  p2: overrides.p2 ?? 'human',
  p3: overrides.p3 ?? 'human',
  p4: overrides.p4 ?? 'human',
});

export const listActiveSeatIds = (lobby: ConnectLobbyState): TronPlayerId[] => (
  PLAYER_IDS.filter((playerId) => lobby.seats[playerId].mode !== 'closed')
);

const countLocalSeats = (lobby: ConnectLobbyState): number => (
  PLAYER_IDS.filter((playerId) => lobby.seats[playerId].mode === 'local').length
);

export const countOwnedHumanSeats = (lobby: ConnectLobbyState, clientId: string): number => (
  PLAYER_IDS.filter((playerId) => {
    const seat = lobby.seats[playerId];
    return (seat.mode === 'local' || seat.mode === 'online') && seat.ownerClientId === clientId;
  }).length
);

const getHumanOwnerCounts = (lobby: ConnectLobbyState): Map<string, number> => {
  const counts = new Map<string, number>();
  PLAYER_IDS.forEach((playerId) => {
    const seat = lobby.seats[playerId];
    if ((seat.mode !== 'local' && seat.mode !== 'online') || !seat.ownerClientId) return;
    counts.set(seat.ownerClientId, (counts.get(seat.ownerClientId) ?? 0) + 1);
  });
  return counts;
};

export const deriveOwnedSeatIds = (
  lobby: ConnectLobbyState,
  clientId: string,
  isHost: boolean,
): TronPlayerId[] => PLAYER_IDS.filter((playerId) => {
  const seat = lobby.seats[playerId];
  if (seat.mode === 'cpu' || seat.mode === 'closed') return false;
  if (seat.ownerClientId === clientId) return true;
  return lobby.source === 'local_custom' && isHost && seat.mode === 'local';
});

export const createLocalCustomLobby = (
  cpuDifficulty: TronCpuDifficulty = DEFAULT_CPU_DIFFICULTY,
): ConnectLobbyState => {
  const seats = createClosedSeats();
  seats.p1 = { playerId: 'p1', mode: 'local', ownerClientId: null };
  seats.p2 = { playerId: 'p2', mode: 'cpu', ownerClientId: null };
  return {
    version: 1,
    source: 'local_custom',
    roomCode: null,
    hostClientId: null,
    quickMatchSize: null,
    cpuDifficulty,
    seats,
    phase: 'setup',
  };
};

export const createOnlineCustomLobby = (
  hostClientId: string,
  roomCode: string,
  cpuDifficulty: TronCpuDifficulty = DEFAULT_CPU_DIFFICULTY,
): ConnectLobbyState => {
  const seats = createClosedSeats();
  seats.p1 = { playerId: 'p1', mode: 'local', ownerClientId: hostClientId };
  seats.p2 = { playerId: 'p2', mode: 'online', ownerClientId: null };
  return {
    version: 1,
    source: 'online_custom',
    roomCode,
    hostClientId,
    quickMatchSize: null,
    cpuDifficulty,
    seats,
    phase: 'setup',
  };
};

export const createQuickMatchLobby = (args: {
  size: TronQuickMatchSize;
  hostClientId: string;
  roomCode: string;
  seatAssignments: Record<string, TronPlayerId>;
  cpuDifficulty?: TronCpuDifficulty;
}): ConnectLobbyState => {
  const seats = createClosedSeats();
  const assignments = Object.entries(args.seatAssignments)
    .sort((left, right) => left[1].localeCompare(right[1]));

  assignments.forEach(([clientId, playerId], index) => {
    seats[playerId] = {
      playerId,
      mode: index === 0 ? 'local' : 'online',
      ownerClientId: clientId,
    };
  });

  return {
    version: 1,
    source: 'quick_match',
    roomCode: args.roomCode,
    hostClientId: args.hostClientId,
    quickMatchSize: args.size,
    cpuDifficulty: args.cpuDifficulty ?? DEFAULT_CPU_DIFFICULTY,
    seats,
    phase: 'setup',
  };
};

export const setSeatMode = (
  lobby: ConnectLobbyState,
  seatId: TronPlayerId,
  mode: TronSeatMode,
): ConnectLobbyState => {
  if (lobby.source === 'quick_match') return lobby;
  if (lobby.source === 'local_custom' && mode === 'online') return lobby;
  if ((lobby.source === 'online_custom') && mode === 'local' && !lobby.hostClientId) return lobby;

  const next = cloneLobby(lobby);
  const current = next.seats[seatId];
  const nextSeat: TronSeatConfig = { ...current, mode };

  if (mode === 'local') {
    if (lobby.source === 'online_custom') {
      const wouldBeLocalCount = countLocalSeats(next) - (current.mode === 'local' ? 1 : 0) + 1;
      if (wouldBeLocalCount > 2) return lobby;
      nextSeat.ownerClientId = next.hostClientId;
    } else {
      const wouldBeLocalCount = countLocalSeats(next) - (current.mode === 'local' ? 1 : 0) + 1;
      if (wouldBeLocalCount > 2) return lobby;
      nextSeat.ownerClientId = null;
    }
  } else if (mode === 'online') {
    nextSeat.ownerClientId = null;
  } else {
    nextSeat.ownerClientId = null;
  }

  next.seats[seatId] = nextSeat;
  return canStartLobby(next) || next.phase === 'setup' ? next : lobby;
};

export const claimOnlineSeat = (
  lobby: ConnectLobbyState,
  seatId: TronPlayerId,
  clientId: string,
): ConnectLobbyState => {
  const seat = lobby.seats[seatId];
  if (seat.mode !== 'online') return lobby;
  if (seat.ownerClientId && seat.ownerClientId !== clientId) return lobby;
  if (countOwnedHumanSeats(lobby, clientId) >= 2 && seat.ownerClientId !== clientId) return lobby;

  const next = cloneLobby(lobby);
  next.seats[seatId] = { ...seat, ownerClientId: clientId };
  return next;
};

export const releaseOnlineSeat = (
  lobby: ConnectLobbyState,
  seatId: TronPlayerId,
  clientId: string,
): ConnectLobbyState => {
  const seat = lobby.seats[seatId];
  if (seat.mode !== 'online' || seat.ownerClientId !== clientId) return lobby;
  const next = cloneLobby(lobby);
  next.seats[seatId] = { ...seat, ownerClientId: null };
  return next;
};

export const releaseClientSeats = (
  lobby: ConnectLobbyState,
  clientId: string,
): ConnectLobbyState => {
  let next = lobby;
  PLAYER_IDS.forEach((playerId) => {
    const seat = next.seats[playerId];
    if (seat.ownerClientId !== clientId) return;
    if (seat.mode === 'online') {
      next = releaseOnlineSeat(next, playerId, clientId);
      return;
    }
    if (seat.mode === 'local' && next.source !== 'local_custom') {
      next = cloneLobby(next);
      next.seats[playerId] = {
        ...next.seats[playerId],
        mode: 'online',
        ownerClientId: null,
      };
    }
  });
  return next;
};

export const canStartLobby = (lobby: ConnectLobbyState): boolean => {
  const activeSeatIds = listActiveSeatIds(lobby);
  if (activeSeatIds.length < 2) return false;
  if (lobby.source === 'local_custom' && activeSeatIds.some((playerId) => lobby.seats[playerId].mode === 'online')) {
    return false;
  }

  if (countLocalSeats(lobby) > 2) return false;

  const ownerCounts = getHumanOwnerCounts(lobby);
  for (const count of ownerCounts.values()) {
    if (count > 2) return false;
  }

  return activeSeatIds.every((playerId) => {
    const seat = lobby.seats[playerId];
    if (seat.mode === 'closed') return false;
    if (seat.mode === 'cpu') return true;
    if (seat.mode === 'local') {
      if (lobby.source === 'local_custom') return true;
      return seat.ownerClientId != null && seat.ownerClientId === lobby.hostClientId;
    }
    return seat.ownerClientId != null;
  });
};

export const deriveTronControlSourcesFromLobby = (
  lobby: ConnectLobbyState,
): Record<TronPlayerId, TronControlSource> => {
  const controlSources = createControlSources();

  PLAYER_IDS.forEach((playerId) => {
    const seat = lobby.seats[playerId];
    if (seat.mode === 'cpu') {
      controlSources[playerId] = 'cpu';
      return;
    }
    if (seat.mode === 'local' || seat.mode === 'online') {
      controlSources[playerId] = 'human';
    }
  });

  return controlSources;
};

export const deriveTronModeFromLobby = (lobby: ConnectLobbyState): TronMode => {
  const activeSeatIds = listActiveSeatIds(lobby);
  const controlSources = deriveTronControlSourcesFromLobby(lobby);

  if (activeSeatIds.length > 0 && activeSeatIds.every((playerId) => controlSources[playerId] === 'cpu')) {
    return 'spectate';
  }
  if (activeSeatIds.every((playerId) => controlSources[playerId] === 'human')) {
    return 'localMultiplayer';
  }
  return 'playerVsCpu';
};

export const buildGameConfigFromLobby = (
  lobby: ConnectLobbyState,
): Pick<TronGameConfig, 'activePlayerIds' | 'mode' | 'controlSources'> => ({
  activePlayerIds: listActiveSeatIds(lobby),
  mode: deriveTronModeFromLobby(lobby),
  controlSources: deriveTronControlSourcesFromLobby(lobby),
});
