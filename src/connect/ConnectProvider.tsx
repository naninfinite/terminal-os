import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildGameConfigFromLobby,
  canStartLobby,
  claimOnlineSeat,
  cloneLobby,
  createLocalCustomLobby,
  createOnlineCustomLobby,
  createQuickMatchLobby,
  deriveOwnedSeatIds,
  listActiveSeatIds,
  releaseClientSeats,
  releaseOnlineSeat,
  setSeatMode as setLobbySeatMode,
} from './lobby';
import {
  createMatchOffer,
  createRoomCode,
  isOfferTargetForClient,
  normalizeRoomCode,
  pickQuickMatchGroup,
  shouldLeadQuickMatch,
} from './matchmaking';
import {
  checksumTronSnapshot,
  createTronGameState,
  createTronScoreRecord,
  hydrateTronSnapshot,
  prepareNextTronRound,
  queueTurn,
  restartTronMatch,
  serializeTronSnapshot,
  stepTronGame,
} from './tronEngine';
import { inspectCpuTurn, TRON_CPU_PROFILES } from './tronCpu';
import {
  CONNECT_QUEUE_CHANNEL,
  createConnectSupabaseClient,
  createPresenceChannel,
  flattenPresenceState,
  getConnectRoomChannelName,
  readBroadcastPayload,
  sendChannelMessage,
  toIsoNow,
} from './realtime';
import type {
  ConnectChannelMessage,
  ConnectConnectionState,
  ConnectDisplayMode,
  ConnectLobbyState,
  ConnectMatchOffer,
  ConnectMatchType,
  ConnectQueuePresence,
  ConnectRematchMessage,
  ConnectRuntimeStatus,
  TronCrashEvent,
  TronCpuDebugByPlayer,
  TronCpuDifficulty,
  TronDirection,
  TronGameState,
  TronPlayerId,
  TronQueuedTurn,
  TronQuickMatchSize,
  TronSeatMode,
} from './types';

const CLIENT_KEY_STORAGE_KEY = 'terminalOS.connect.v2.clientKey';
const MAX_FRAME_DELTA_MS = 250;
const DISCONNECT_GRACE_MS = 2_000;
const ONLINE_INPUT_BUFFER_TICKS = 2;
const LOCAL_INPUT_BUFFER_TICKS = 1;
const HOST_SNAPSHOT_INTERVAL_TICKS = 5;
const ROUND_TRANSITION_DELAY_MS = 1_100;
const SPECTATE_MATCH_RESTART_DELAY_MS = 1_800;
const DEFAULT_CPU_DIFFICULTY: TronCpuDifficulty = 'medium';
const PLAYER_IDS: TronPlayerId[] = ['p1', 'p2', 'p3', 'p4'];
const MAX_RECENT_CRASH_EVENTS = 24;

type ConnectLobbyPreset = 'custom' | 'cpu';
type ConnectLocalParticipantCount = 2 | 3 | 4;
type ConnectLocalHumanCount = 0 | 1 | 2;

type RoomParticipant = {
  clientId: string;
  joinedAt: string;
};

type QuickMatchSelection = {
  size: TronQuickMatchSize;
  selectedClientIds: string[];
  seatAssignments: Record<string, TronPlayerId>;
  hostClientId: string;
};

type ConnectInternalState = {
  displayMode: ConnectDisplayMode;
  matchType: ConnectMatchType;
  forcedStatus: ConnectRuntimeStatus | null;
  connectionState: ConnectConnectionState;
  multiplayerAvailable: boolean;
  quickMatchSize: TronQuickMatchSize;
  lobby: ConnectLobbyState | null;
  game: TronGameState | null;
  isHost: boolean;
  cpuDifficulty: TronCpuDifficulty;
  error: string | null;
  message: string | null;
  queueStartedAtMs: number | null;
  queueWaitMs: number;
  rematchRequests: string[];
  pendingQuickMatch: QuickMatchSelection | null;
  temporaryCpuSeatIds: TronPlayerId[];
  localParticipantCount: ConnectLocalParticipantCount;
  localHumanCount: ConnectLocalHumanCount;
  recentCrashEvents: TronCrashEvent[];
  cpuDebug: TronCpuDebugByPlayer;
};

type ConnectContextValue = {
  displayMode: ConnectDisplayMode;
  mode: ConnectMatchType;
  status: ConnectRuntimeStatus;
  connectionState: ConnectConnectionState;
  multiplayerAvailable: boolean;
  isHost: boolean;
  notificationCount: number;
  quickMatchSize: TronQuickMatchSize;
  roomCode: string | null;
  lobby: ConnectLobbyState | null;
  game: TronGameState | null;
  ownedSeatIds: TronPlayerId[];
  ownedPlayerIds: TronPlayerId[];
  participantCount: ConnectLocalParticipantCount;
  localHumanCount: ConnectLocalHumanCount;
  recentCrashEvents: TronCrashEvent[];
  cpuDebug: TronCpuDebugByPlayer;
  score: Record<TronPlayerId, number>;
  cpuDifficulty: TronCpuDifficulty;
  error: string | null;
  message: string | null;
  queueWaitMs: number;
  canStartLobby: boolean;
  canRequestRematch: boolean;
  setQuickMatchSize: (size: TronQuickMatchSize) => void;
  setParticipantCount: (count: ConnectLocalParticipantCount) => void;
  setLocalHumanCount: (count: ConnectLocalHumanCount) => void;
  openCustomLobby: (preset?: ConnectLobbyPreset) => void;
  startLocalMatch: () => void;
  startCpuMatch: (difficulty?: TronCpuDifficulty) => void;
  startSpectateMatch: (difficulty?: TronCpuDifficulty) => void;
  startQuickMatch: () => void;
  hostRoom: () => void;
  joinRoom: (roomCode: string) => void;
  setSeatMode: (seatId: TronPlayerId, mode: TronSeatMode) => void;
  claimSeat: (seatId: TronPlayerId) => void;
  releaseSeat: (seatId: TronPlayerId) => void;
  startLobbyMatch: () => void;
  setCpuDifficulty: (difficulty: TronCpuDifficulty) => void;
  requestRematch: () => void;
  leaveMatch: () => void;
  sendTurn: (playerId: TronPlayerId, direction: TronDirection) => void;
  openFullscreen: () => void;
  closeFullscreen: () => void;
};

const ConnectContext = createContext<ConnectContextValue | null>(null);

const createClientKey = (): string => (
  `connect_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`
);

const getClientKey = (): string => {
  try {
    if (typeof sessionStorage === 'undefined') return createClientKey();
    const existing = sessionStorage.getItem(CLIENT_KEY_STORAGE_KEY);
    if (existing) return existing;
    const next = createClientKey();
    sessionStorage.setItem(CLIENT_KEY_STORAGE_KEY, next);
    return next;
  } catch {
    return createClientKey();
  }
};

const clampLocalParticipantCount = (count: number): ConnectLocalParticipantCount => (
  count >= 4 ? 4 : count === 3 ? 3 : 2
);

const clampLocalHumanCount = (count: number): ConnectLocalHumanCount => (
  count >= 2 ? 2 : count <= 0 ? 0 : 1
);

const countLocalLobbySeats = (lobby: ConnectLobbyState): number => (
  PLAYER_IDS.filter((playerId) => lobby.seats[playerId].mode === 'local').length
);

const resolvePreviewOwnedSeatIds = (
  participantCount: ConnectLocalParticipantCount,
  localHumanCount: ConnectLocalHumanCount,
): TronPlayerId[] => PLAYER_IDS.slice(0, Math.min(participantCount, localHumanCount));

const trimRecentCrashEvents = (events: TronCrashEvent[]): TronCrashEvent[] => (
  events.slice(-MAX_RECENT_CRASH_EVENTS)
);

const createEmptyCpuDebug = (): TronCpuDebugByPlayer => ({
  p1: null,
  p2: null,
  p3: null,
  p4: null,
});

const createConfiguredLocalLobby = (args: {
  participantCount: ConnectLocalParticipantCount;
  localHumanCount: ConnectLocalHumanCount;
  cpuDifficulty: TronCpuDifficulty;
}): ConnectLobbyState => {
  const lobby = cloneLobby(createLocalCustomLobby(args.cpuDifficulty));
  PLAYER_IDS.forEach((playerId, index) => {
    if (index >= args.participantCount) {
      lobby.seats[playerId] = { playerId, mode: 'closed', ownerClientId: null };
      return;
    }
    lobby.seats[playerId] = {
      playerId,
      mode: index < args.localHumanCount ? 'local' : 'cpu',
      ownerClientId: null,
    };
  });
  return lobby;
};

const createInitialState = (multiplayerAvailable: boolean): ConnectInternalState => ({
  displayMode: 'panel',
  matchType: 'idle',
  forcedStatus: 'idle',
  connectionState: multiplayerAvailable ? 'ready' : 'cpu_only',
  multiplayerAvailable,
  quickMatchSize: 2,
  lobby: null,
  game: null,
  isHost: false,
  cpuDifficulty: DEFAULT_CPU_DIFFICULTY,
  error: null,
  message: null,
  queueStartedAtMs: null,
  queueWaitMs: 0,
  rematchRequests: [],
  pendingQuickMatch: null,
  temporaryCpuSeatIds: [],
  localParticipantCount: 2,
  localHumanCount: 1,
  recentCrashEvents: [],
  cpuDebug: createEmptyCpuDebug(),
});

export const shouldAutoAdvanceTronRound = (args: {
  game: TronGameState | null;
  lobby: ConnectLobbyState | null;
  matchType: ConnectMatchType;
  isHost: boolean;
}): boolean => {
  if (!args.game || !args.lobby) return false;
  if (args.game.phase !== 'round_over') return false;
  if (!canStartLobby(args.lobby)) return false;
  return args.matchType !== 'online' || args.isHost;
};

export const shouldAutoRestartSpectateMatch = (args: {
  game: TronGameState | null;
  lobby: ConnectLobbyState | null;
  matchType: ConnectMatchType;
}): boolean => (
  args.matchType === 'spectate'
  && args.game?.phase === 'match_over'
  && args.lobby != null
  && canStartLobby(args.lobby)
);

const phaseToStatus = (game: TronGameState | null): ConnectRuntimeStatus => {
  if (!game) return 'idle';
  if (game.phase === 'countdown') return 'countdown';
  if (game.phase === 'running') return 'playing';
  if (game.phase === 'round_over') return 'round_over';
  return 'match_over';
};

const deriveStatus = (runtime: ConnectInternalState): ConnectRuntimeStatus => {
  if (runtime.forcedStatus && runtime.forcedStatus !== 'idle') return runtime.forcedStatus;
  if (runtime.game) return phaseToStatus(runtime.game);
  if (runtime.lobby) return 'setup';
  return 'idle';
};

const flattenRoomPresenceState = (state: Record<string, unknown>): RoomParticipant[] => {
  const entries: RoomParticipant[] = [];
  Object.values(state).forEach((value) => {
    if (!Array.isArray(value)) return;
    value.forEach((entry) => {
      if (!entry || typeof entry !== 'object') return;
      const clientId = typeof (entry as { clientId?: unknown }).clientId === 'string'
        ? (entry as { clientId: string }).clientId
        : '';
      const joinedAt = typeof (entry as { joinedAt?: unknown }).joinedAt === 'string'
        ? (entry as { joinedAt: string }).joinedAt
        : '';
      if (!clientId || !joinedAt) return;
      entries.push({ clientId, joinedAt });
    });
  });
  return entries;
};

const updateLobbyPhase = (lobby: ConnectLobbyState | null, phase: ConnectLobbyState['phase']): ConnectLobbyState | null => (
  lobby ? {
    ...cloneLobby(lobby),
    phase,
  } : null
);

const samePlayerSet = (left: TronPlayerId[], right: TronPlayerId[]): boolean => (
  left.length === right.length && left.every((playerId, index) => playerId === right[index])
);

export const ConnectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabaseClient = useMemo(() => createConnectSupabaseClient(), []);
  const initialState = useMemo(() => createInitialState(supabaseClient != null), [supabaseClient]);
  const [runtime, setRuntime] = useState<ConnectInternalState>(initialState);
  const runtimeRef = useRef<ConnectInternalState>(initialState);
  const clientIdRef = useRef<string>(getClientKey());
  const queueChannelRef = useRef<ReturnType<typeof createPresenceChannel> | null>(null);
  const roomChannelRef = useRef<ReturnType<typeof createPresenceChannel> | null>(null);
  const queueOfferKeyRef = useRef<string | null>(null);
  const localBufferedInputsRef = useRef<TronQueuedTurn[]>([]);
  const lastFrameRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const cpuLastDecisionTickRef = useRef<Record<TronPlayerId, number>>({
    p1: Number.NEGATIVE_INFINITY,
    p2: Number.NEGATIVE_INFINITY,
    p3: Number.NEGATIVE_INFINITY,
    p4: Number.NEGATIVE_INFINITY,
  });
  const disconnectTimersRef = useRef<Map<string, number>>(new Map());

  const setRuntimeSafe = useCallback((
    updater: ConnectInternalState | ((current: ConnectInternalState) => ConnectInternalState),
  ) => {
    setRuntime((current) => {
      const next = typeof updater === 'function'
        ? (updater as (value: ConnectInternalState) => ConnectInternalState)(current)
        : updater;
      runtimeRef.current = next;
      return next;
    });
  }, []);

  const clearDisconnectTimers = useCallback(() => {
    disconnectTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    disconnectTimersRef.current.clear();
  }, []);

  const resetLoopClock = useCallback(() => {
    lastFrameRef.current = null;
    accumulatorRef.current = 0;
  }, []);

  const resetCpuDecisionTicks = useCallback(() => {
    cpuLastDecisionTickRef.current = {
      p1: Number.NEGATIVE_INFINITY,
      p2: Number.NEGATIVE_INFINITY,
      p3: Number.NEGATIVE_INFINITY,
      p4: Number.NEGATIVE_INFINITY,
    };
  }, []);

  const cleanupQueueChannel = useCallback(() => {
    const channel = queueChannelRef.current;
    queueChannelRef.current = null;
    queueOfferKeyRef.current = null;
    if (!channel) return;
    void channel.unsubscribe();
  }, []);

  const cleanupRoomChannel = useCallback(() => {
    const channel = roomChannelRef.current;
    roomChannelRef.current = null;
    if (!channel) return;
    void channel.unsubscribe();
  }, []);

  const resetRuntimeToIdle = useCallback((message?: string) => {
    setRuntimeSafe((state) => ({
      ...state,
      matchType: 'idle',
      forcedStatus: message ? 'disconnected' : 'idle',
      connectionState: state.multiplayerAvailable ? 'ready' : 'cpu_only',
      lobby: null,
      game: null,
      isHost: false,
      error: null,
      message: message ?? null,
      queueStartedAtMs: null,
      queueWaitMs: 0,
      rematchRequests: [],
      pendingQuickMatch: null,
      temporaryCpuSeatIds: [],
      recentCrashEvents: [],
      cpuDebug: createEmptyCpuDebug(),
    }));
  }, [setRuntimeSafe]);

  const getOwnedSeatIds = useCallback((state: ConnectInternalState): TronPlayerId[] => (
    state.lobby
      ? deriveOwnedSeatIds(state.lobby, clientIdRef.current, state.isHost).sort((left, right) => left.localeCompare(right))
      : []
  ), []);

  const broadcastLobby = useCallback(async (lobby: ConnectLobbyState) => {
    const channel = roomChannelRef.current;
    if (!channel) return;
    await sendChannelMessage(channel, {
      type: 'lobby_state',
      clientId: clientIdRef.current,
      lobby,
      createdAt: toIsoNow(),
    });
  }, []);

  const broadcastSnapshot = useCallback(async (game: TronGameState) => {
    const channel = roomChannelRef.current;
    if (!channel) return;
    const snapshot = serializeTronSnapshot(game);
    await sendChannelMessage(channel, {
      type: 'snapshot',
      clientId: clientIdRef.current,
      checksum: checksumTronSnapshot(snapshot),
      state: snapshot,
      createdAt: toIsoNow(),
    });
  }, []);

  const notifyRemoteLeaveIfNeeded = useCallback(() => {
    const current = runtimeRef.current;
    if (current.matchType !== 'online' || !roomChannelRef.current) return;
    void sendChannelMessage(roomChannelRef.current, {
      type: 'leave',
      clientId: clientIdRef.current,
      reason: 'manual',
      createdAt: toIsoNow(),
    });
  }, []);

  const clearDisconnectTimerForClient = useCallback((clientId: string) => {
    const timerId = disconnectTimersRef.current.get(clientId);
    if (timerId == null) return;
    window.clearTimeout(timerId);
    disconnectTimersRef.current.delete(clientId);
  }, []);

  const restoreLobbyAfterTakeover = useCallback((state: ConnectInternalState): ConnectLobbyState | null => {
    if (!state.lobby || state.temporaryCpuSeatIds.length === 0) return state.lobby;
    const nextLobby = cloneLobby(state.lobby);
    state.temporaryCpuSeatIds.forEach((seatId) => {
      const seat = nextLobby.seats[seatId];
      nextLobby.seats[seatId] = {
        ...seat,
        mode: 'online',
        ownerClientId: null,
      };
    });
    nextLobby.phase = state.game?.phase ?? 'setup';
    return nextLobby;
  }, []);

  const applyHostDisconnected = useCallback(() => {
    cleanupQueueChannel();
    cleanupRoomChannel();
    clearDisconnectTimers();
    localBufferedInputsRef.current = [];
    resetLoopClock();
    resetCpuDecisionTicks();
    resetRuntimeToIdle('Host disconnected - match ended.');
  }, [
    cleanupQueueChannel,
    cleanupRoomChannel,
    clearDisconnectTimers,
    resetCpuDecisionTicks,
    resetLoopClock,
    resetRuntimeToIdle,
  ]);

  const applyCpuTakeover = useCallback((missingClientId: string) => {
    const current = runtimeRef.current;
    if (!current.isHost || !current.lobby || !current.game) return;

    const seatIds = listActiveSeatIds(current.lobby).filter((seatId) => (
      current.lobby?.seats[seatId].ownerClientId === missingClientId
      && current.lobby.seats[seatId].mode === 'online'
    ));
    if (seatIds.length === 0) return;

    setRuntimeSafe((state) => ({
      ...state,
      temporaryCpuSeatIds: [...new Set([...state.temporaryCpuSeatIds, ...seatIds])].sort((left, right) => left.localeCompare(right)),
      message: `${seatIds.join('/').toUpperCase()} DISCONNECTED - CPU TOOK OVER`,
    }));

    if (roomChannelRef.current) {
      void sendChannelMessage(roomChannelRef.current, {
        type: 'round_event',
        clientId: clientIdRef.current,
        event: 'cpu_takeover',
        seatIds,
        createdAt: toIsoNow(),
      });
    }
  }, [setRuntimeSafe]);

  const sendTurn = useCallback((playerId: TronPlayerId, direction: TronDirection) => {
    const current = runtimeRef.current;
    const ownedSeatIds = getOwnedSeatIds(current);
    if (!current.game || !ownedSeatIds.includes(playerId)) return;

    const targetTick = current.game.tick + (current.matchType === 'online' ? ONLINE_INPUT_BUFFER_TICKS : LOCAL_INPUT_BUFFER_TICKS);
    const nextGame = queueTurn(current.game, playerId, direction, targetTick);
    if (nextGame === current.game) return;

    setRuntimeSafe((state) => ({
      ...state,
      game: nextGame,
      error: null,
      message: null,
    }));

    if (current.matchType === 'online' && roomChannelRef.current) {
      if (!current.isHost) {
        localBufferedInputsRef.current = localBufferedInputsRef.current
          .filter((turn) => !(turn.playerId === playerId && turn.tick === targetTick))
          .concat({ playerId, direction, tick: targetTick })
          .sort((left, right) => left.tick - right.tick);
      }
      void sendChannelMessage(roomChannelRef.current, {
        type: 'input',
        clientId: clientIdRef.current,
        playerId,
        tick: targetTick,
        direction,
        createdAt: toIsoNow(),
      });
    }
  }, [getOwnedSeatIds, setRuntimeSafe]);

  const startLobbyMatch = useCallback(async () => {
    const current = runtimeRef.current;
    if (!current.lobby || !canStartLobby(current.lobby)) return;
    if (current.matchType === 'online' && !current.isHost) return;

    const activePlayerIds = buildGameConfigFromLobby(current.lobby).activePlayerIds;
    let nextGame: TronGameState;
    if (
      current.game
      && current.game.phase === 'round_over'
      && samePlayerSet(current.game.activePlayerIds, activePlayerIds)
      && current.temporaryCpuSeatIds.length === 0
    ) {
      nextGame = prepareNextTronRound(current.game);
    } else if (
      current.game
      && current.game.phase === 'match_over'
      && samePlayerSet(current.game.activePlayerIds, activePlayerIds)
      && current.temporaryCpuSeatIds.length === 0
    ) {
      nextGame = restartTronMatch(current.game);
    } else {
      nextGame = createTronGameState({
        activePlayerIds,
        score: current.game?.phase === 'round_over'
          && samePlayerSet(current.game.activePlayerIds, activePlayerIds)
          ? current.game.score
          : createTronScoreRecord(),
      });
    }

    const nextLobby = updateLobbyPhase(current.lobby, nextGame.phase);
    localBufferedInputsRef.current = [];
    resetLoopClock();
    resetCpuDecisionTicks();

    setRuntimeSafe((state) => ({
      ...state,
      lobby: nextLobby,
      game: nextGame,
      forcedStatus: null,
      error: null,
      message: null,
      connectionState: state.matchType === 'online' ? 'in_room' : state.connectionState,
      rematchRequests: [],
      temporaryCpuSeatIds: [],
    }));

    if (current.matchType === 'online' && current.isHost && roomChannelRef.current && nextLobby) {
      await broadcastLobby(nextLobby);
      const snapshot = serializeTronSnapshot(nextGame);
      const checksum = checksumTronSnapshot(snapshot);
      await sendChannelMessage(roomChannelRef.current, {
        type: 'round_event',
        clientId: clientIdRef.current,
        event: 'round_start',
        state: snapshot,
        checksum,
        createdAt: toIsoNow(),
      });
      await sendChannelMessage(roomChannelRef.current, {
        type: 'snapshot',
        clientId: clientIdRef.current,
        checksum,
        state: snapshot,
        createdAt: toIsoNow(),
      });
    }
  }, [
    broadcastLobby,
    resetCpuDecisionTicks,
    resetLoopClock,
    setRuntimeSafe,
  ]);

  const leaveMatch = useCallback((notifyRemote = true) => {
    if (notifyRemote) notifyRemoteLeaveIfNeeded();
    cleanupQueueChannel();
    cleanupRoomChannel();
    clearDisconnectTimers();
    resetLoopClock();
    resetCpuDecisionTicks();
    localBufferedInputsRef.current = [];
    resetRuntimeToIdle();
  }, [
    cleanupQueueChannel,
    cleanupRoomChannel,
    clearDisconnectTimers,
    notifyRemoteLeaveIfNeeded,
    resetCpuDecisionTicks,
    resetLoopClock,
    resetRuntimeToIdle,
  ]);

  const handleRoomPresenceSync = useCallback(async () => {
    const current = runtimeRef.current;
    const channel = roomChannelRef.current;
    if (!current.lobby || !channel) return;

    const participants = flattenRoomPresenceState(channel.presenceState());
    const presentClientIds = new Set(participants.map((entry) => entry.clientId));

    if (!current.isHost) {
      const hostClientId = current.lobby.hostClientId;
      if (hostClientId && !presentClientIds.has(hostClientId)) {
        applyHostDisconnected();
      }
      return;
    }

    clearDisconnectTimerForClient(clientIdRef.current);

    if (current.lobby.phase === 'setup') {
      let nextLobby = current.lobby;
      const ownerClientIds = new Set<string>();
      PLAYER_IDS.forEach((seatId) => {
        const ownerClientId = nextLobby.seats[seatId].ownerClientId;
        if (!ownerClientId || ownerClientId === clientIdRef.current) return;
        ownerClientIds.add(ownerClientId);
      });
      ownerClientIds.forEach((ownerClientId) => {
        if (presentClientIds.has(ownerClientId)) return;
        nextLobby = releaseClientSeats(nextLobby, ownerClientId);
      });

      if (nextLobby !== current.lobby) {
        setRuntimeSafe((state) => ({
          ...state,
          lobby: nextLobby,
          message: 'A player left the room.',
          rematchRequests: state.rematchRequests.filter((clientId) => presentClientIds.has(clientId)),
        }));
      }

      await broadcastLobby(nextLobby);
      if (
        nextLobby.source === 'quick_match'
        && canStartLobby(nextLobby)
      ) {
        const requiredClients = new Set<string>();
        PLAYER_IDS.forEach((seatId) => {
          const ownerClientId = nextLobby.seats[seatId].ownerClientId;
          if (ownerClientId) requiredClients.add(ownerClientId);
        });
        const everyonePresent = [...requiredClients].every((clientId) => presentClientIds.has(clientId));
        if (everyonePresent) {
          await startLobbyMatch();
        }
      }
      return;
    }

    if (!current.game) return;
    const claimedClientIds = new Set<string>();
    PLAYER_IDS.forEach((seatId) => {
      const seat = current.lobby?.seats[seatId];
      if (!seat?.ownerClientId || seat.ownerClientId === clientIdRef.current || seat.mode !== 'online') return;
      claimedClientIds.add(seat.ownerClientId);
    });

    claimedClientIds.forEach((ownerClientId) => {
      if (presentClientIds.has(ownerClientId)) {
        clearDisconnectTimerForClient(ownerClientId);
        return;
      }
      if (disconnectTimersRef.current.has(ownerClientId)) return;
      const timerId = window.setTimeout(() => {
        disconnectTimersRef.current.delete(ownerClientId);
        applyCpuTakeover(ownerClientId);
      }, DISCONNECT_GRACE_MS);
      disconnectTimersRef.current.set(ownerClientId, timerId);
    });

    [...disconnectTimersRef.current.keys()].forEach((ownerClientId) => {
      if (presentClientIds.has(ownerClientId)) {
        clearDisconnectTimerForClient(ownerClientId);
      }
    });
  }, [
    applyCpuTakeover,
    applyHostDisconnected,
    broadcastLobby,
    clearDisconnectTimerForClient,
    setRuntimeSafe,
    startLobbyMatch,
  ]);

  const subscribeToRoomChannel = useCallback((args: {
    roomCode: string;
    isHost: boolean;
    initialLobby: ConnectLobbyState | null;
  }) => {
    if (!supabaseClient) {
      setRuntimeSafe((state) => ({
        ...state,
        forcedStatus: 'error',
        error: 'Supabase realtime is unavailable.',
      }));
      return;
    }

    cleanupQueueChannel();
    cleanupRoomChannel();
    clearDisconnectTimers();
    resetLoopClock();
    resetCpuDecisionTicks();
    localBufferedInputsRef.current = [];

    const channel = createPresenceChannel(supabaseClient, getConnectRoomChannelName(args.roomCode), clientIdRef.current);
    roomChannelRef.current = channel;

    setRuntimeSafe((state) => ({
      ...state,
      matchType: 'online',
      forcedStatus: args.isHost ? 'hosting' : 'joining',
      connectionState: 'joining_room',
      lobby: args.initialLobby,
      game: null,
      isHost: args.isHost,
      error: null,
      message: args.isHost ? `Room ${args.roomCode} ready.` : `Joining room ${args.roomCode}...`,
      queueStartedAtMs: null,
      queueWaitMs: 0,
      rematchRequests: [],
      pendingQuickMatch: null,
      temporaryCpuSeatIds: [],
      cpuDebug: createEmptyCpuDebug(),
    }));

    channel
      .on('presence', { event: 'sync' }, () => {
        void handleRoomPresenceSync();
      })
      .on('broadcast', { event: 'lobby_state' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'lobby_state' || message.clientId === clientIdRef.current) return;
        setRuntimeSafe((state) => ({
          ...state,
          lobby: cloneLobby(message.lobby),
          forcedStatus: state.game ? state.forcedStatus : 'setup',
          connectionState: 'in_room',
          error: null,
          message: state.game ? state.message : null,
          recentCrashEvents: state.game ? state.recentCrashEvents : [],
          cpuDebug: state.game ? state.cpuDebug : createEmptyCpuDebug(),
          rematchRequests: state.rematchRequests.filter((clientId) => {
            const lobbyOwnerIds = new Set<string>();
            PLAYER_IDS.forEach((seatId) => {
              const ownerClientId = message.lobby.seats[seatId].ownerClientId;
              if (ownerClientId) lobbyOwnerIds.add(ownerClientId);
            });
            return lobbyOwnerIds.has(clientId);
          }),
        }));
      })
      .on('broadcast', { event: 'seat_claim' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'seat_claim' || !runtimeRef.current.isHost) return;
        let nextLobby = runtimeRef.current.lobby;
        if (!nextLobby || nextLobby.phase !== 'setup') return;
        message.seatIds.forEach((seatId) => {
          nextLobby = claimOnlineSeat(nextLobby!, seatId, message.clientId);
        });
        if (!nextLobby) return;
        setRuntimeSafe((state) => ({ ...state, lobby: nextLobby }));
        void broadcastLobby(nextLobby);
      })
      .on('broadcast', { event: 'seat_release' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'seat_release' || !runtimeRef.current.isHost) return;
        let nextLobby = runtimeRef.current.lobby;
        if (!nextLobby || nextLobby.phase !== 'setup') return;
        message.seatIds.forEach((seatId) => {
          nextLobby = releaseOnlineSeat(nextLobby!, seatId, message.clientId);
        });
        if (!nextLobby) return;
        setRuntimeSafe((state) => ({ ...state, lobby: nextLobby }));
        void broadcastLobby(nextLobby);
      })
      .on('broadcast', { event: 'input' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'input' || message.clientId === clientIdRef.current) return;

        setRuntimeSafe((state) => {
          if (!state.game) return state;
          const appliedTick = message.tick <= state.game.tick ? state.game.tick + 1 : message.tick;
          return {
            ...state,
            game: queueTurn(state.game, message.playerId, message.direction, appliedTick),
          };
        });
      })
      .on('broadcast', { event: 'snapshot' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'snapshot' || message.clientId === clientIdRef.current) return;
        if (runtimeRef.current.isHost) return;

        setRuntimeSafe((state) => {
          const incoming = hydrateTronSnapshot(message.state);
          if (state.game) {
            const localChecksum = checksumTronSnapshot(serializeTronSnapshot(state.game));
            if (localChecksum === message.checksum && incoming.tick <= state.game.tick) {
              return state;
            }
          }

          let reconciled = incoming;
          const buffered = localBufferedInputsRef.current.filter((turn) => turn.tick > incoming.tick);
          buffered.forEach((turn) => {
            reconciled = queueTurn(reconciled, turn.playerId, turn.direction, turn.tick);
          });
          localBufferedInputsRef.current = buffered;

          return {
            ...state,
            game: reconciled,
            lobby: updateLobbyPhase(state.lobby, reconciled.phase),
            forcedStatus: null,
            error: null,
            recentCrashEvents: [],
            cpuDebug: createEmptyCpuDebug(),
          };
        });
      })
      .on('broadcast', { event: 'round_event' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'round_event' || message.clientId === clientIdRef.current) return;

        if (message.event === 'round_start' && message.state) {
          localBufferedInputsRef.current = [];
          resetCpuDecisionTicks();
          setRuntimeSafe((state) => ({
            ...state,
            game: hydrateTronSnapshot(message.state!),
            lobby: updateLobbyPhase(state.lobby, message.state!.phase),
            forcedStatus: null,
            error: null,
            message: null,
            rematchRequests: [],
            temporaryCpuSeatIds: [],
            recentCrashEvents: [],
            cpuDebug: createEmptyCpuDebug(),
          }));
          return;
        }

        if (message.event === 'round_over' && message.state) {
          setRuntimeSafe((state) => ({
            ...state,
            game: hydrateTronSnapshot(message.state!),
            lobby: updateLobbyPhase(state.lobby, message.state!.phase),
            forcedStatus: null,
            recentCrashEvents: [],
            cpuDebug: createEmptyCpuDebug(),
          }));
          return;
        }

        if (message.event === 'cpu_takeover') {
          setRuntimeSafe((state) => ({
            ...state,
            temporaryCpuSeatIds: [...new Set([...(state.temporaryCpuSeatIds), ...(message.seatIds ?? [])])].sort((left, right) => left.localeCompare(right)),
            message: `${(message.seatIds ?? []).join('/').toUpperCase()} DISCONNECTED - CPU TOOK OVER`,
          }));
          return;
        }

        if (message.event === 'host_disconnected') {
          applyHostDisconnected();
        }
      })
      .on('broadcast', { event: 'rematch' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'rematch' || message.clientId === clientIdRef.current) return;

        setRuntimeSafe((state) => ({
          ...state,
          rematchRequests: [...new Set([...state.rematchRequests, message.clientId])].sort(),
          message: 'Another player wants a rematch.',
        }));
      })
      .on('broadcast', { event: 'leave' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'leave' || runtimeRef.current.isHost) return;
        if (runtimeRef.current.lobby?.hostClientId === message.clientId) {
          applyHostDisconnected();
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          const queueSize = runtimeRef.current.quickMatchSize;
          void channel.track({
            clientId: clientIdRef.current,
            joinedAt: toIsoNow(),
            desiredPlayers: queueSize,
          });
          if (args.isHost && args.initialLobby) {
            void broadcastLobby(args.initialLobby);
          }
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRuntimeSafe((state) => ({
            ...state,
            forcedStatus: 'error',
            error: 'Failed to connect to the room.',
            connectionState: state.multiplayerAvailable ? 'ready' : 'cpu_only',
          }));
        }
      });
  }, [
    applyHostDisconnected,
    broadcastLobby,
    cleanupQueueChannel,
    cleanupRoomChannel,
    clearDisconnectTimers,
    handleRoomPresenceSync,
    resetCpuDecisionTicks,
    resetLoopClock,
    setRuntimeSafe,
    supabaseClient,
  ]);

  const startQuickMatch = useCallback(() => {
    if (!supabaseClient) {
      setRuntimeSafe((state) => ({
        ...state,
        forcedStatus: 'error',
        error: 'Supabase realtime is not configured. Multiplayer is unavailable.',
      }));
      return;
    }

    cleanupQueueChannel();
    cleanupRoomChannel();
    clearDisconnectTimers();
    resetLoopClock();
    resetCpuDecisionTicks();
    localBufferedInputsRef.current = [];

    const joinedAt = toIsoNow();
    queueOfferKeyRef.current = null;

    setRuntimeSafe((state) => ({
      ...state,
      matchType: 'online',
      forcedStatus: 'queueing',
      connectionState: 'queueing',
      lobby: null,
      game: null,
      isHost: false,
      error: null,
      message: 'Waiting for players...',
      queueStartedAtMs: Date.now(),
      queueWaitMs: 0,
      rematchRequests: [],
      pendingQuickMatch: null,
      temporaryCpuSeatIds: [],
    }));

    const channel = createPresenceChannel(supabaseClient, CONNECT_QUEUE_CHANNEL, clientIdRef.current);
    queueChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const participants = flattenPresenceState(channel.presenceState());
        const desiredPlayers = runtimeRef.current.quickMatchSize;
        const group = pickQuickMatchGroup(participants, desiredPlayers);
        if (!group) return;
        if (!shouldLeadQuickMatch(clientIdRef.current, participants, desiredPlayers)) return;

        const offerKey = `${group.queueSize}:${group.selectedClientIds.join(':')}`;
        if (queueOfferKeyRef.current === offerKey) return;
        queueOfferKeyRef.current = offerKey;

        const offer = createMatchOffer({
          hostClientId: group.hostClientId,
          roomCode: createRoomCode({
            clientId: group.hostClientId,
            nowMs: Date.now(),
            salt: group.queueSize,
          }),
          queueSize: group.queueSize,
          selectedClientIds: group.selectedClientIds,
          seatAssignments: group.seatAssignments,
          createdAt: toIsoNow(),
        });
        void sendChannelMessage(channel, offer);
      })
      .on('broadcast', { event: 'match_offer' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'match_offer') return;
        if (!isOfferTargetForClient(message, clientIdRef.current)) return;
        if (runtimeRef.current.forcedStatus !== 'queueing') return;

        const initialLobby = createQuickMatchLobby({
          size: message.queueSize,
          hostClientId: message.hostClientId,
          roomCode: message.roomCode,
          seatAssignments: message.seatAssignments,
          cpuDifficulty: runtimeRef.current.cpuDifficulty,
        });
        subscribeToRoomChannel({
          roomCode: message.roomCode,
          isHost: message.hostClientId === clientIdRef.current,
          initialLobby,
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({
            clientId: clientIdRef.current,
            joinedAt,
            desiredPlayers: runtimeRef.current.quickMatchSize,
          } satisfies ConnectQueuePresence);
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRuntimeSafe((state) => ({
            ...state,
            forcedStatus: 'error',
            connectionState: state.multiplayerAvailable ? 'ready' : 'cpu_only',
            error: 'Quick Match failed to connect.',
          }));
        }
      });
  }, [
    cleanupQueueChannel,
    cleanupRoomChannel,
    clearDisconnectTimers,
    resetCpuDecisionTicks,
    resetLoopClock,
    setRuntimeSafe,
    subscribeToRoomChannel,
    supabaseClient,
  ]);

  const openCustomLobby = useCallback((preset: ConnectLobbyPreset = 'custom') => {
    cleanupQueueChannel();
    cleanupRoomChannel();
    clearDisconnectTimers();
    resetLoopClock();
    resetCpuDecisionTicks();
    localBufferedInputsRef.current = [];

    const lobby = createLocalCustomLobby(runtimeRef.current.cpuDifficulty);
    setRuntimeSafe((state) => ({
      ...state,
      matchType: 'local',
      forcedStatus: 'setup',
      connectionState: state.multiplayerAvailable ? 'ready' : 'cpu_only',
      lobby: preset === 'cpu' ? lobby : lobby,
      game: null,
      isHost: true,
      error: null,
      message: null,
      queueStartedAtMs: null,
      queueWaitMs: 0,
      rematchRequests: [],
      pendingQuickMatch: null,
      temporaryCpuSeatIds: [],
      recentCrashEvents: [],
      cpuDebug: createEmptyCpuDebug(),
    }));
  }, [
    cleanupQueueChannel,
    cleanupRoomChannel,
    clearDisconnectTimers,
    resetCpuDecisionTicks,
    resetLoopClock,
    setRuntimeSafe,
  ]);

  const setParticipantCount = useCallback((count: ConnectLocalParticipantCount) => {
    setRuntimeSafe((state) => {
      const participantCount = clampLocalParticipantCount(count);
      return {
        ...state,
        localParticipantCount: participantCount,
        localHumanCount: clampLocalHumanCount(Math.min(state.localHumanCount, participantCount)),
      };
    });
  }, [setRuntimeSafe]);

  const setLocalHumanCount = useCallback((count: ConnectLocalHumanCount) => {
    setRuntimeSafe((state) => ({
      ...state,
      localHumanCount: clampLocalHumanCount(Math.min(count, state.localParticipantCount)),
    }));
  }, [setRuntimeSafe]);

  const startConfiguredLocalMatch = useCallback((args?: {
    participantCount?: ConnectLocalParticipantCount;
    localHumanCount?: ConnectLocalHumanCount;
    cpuDifficulty?: TronCpuDifficulty;
    matchType?: ConnectMatchType;
    persistPreviewSelection?: boolean;
  }) => {
    cleanupQueueChannel();
    cleanupRoomChannel();
    clearDisconnectTimers();
    resetLoopClock();
    resetCpuDecisionTicks();
    localBufferedInputsRef.current = [];

    const participantCount = clampLocalParticipantCount(
      args?.participantCount ?? runtimeRef.current.localParticipantCount
    );
    const localHumanCount = clampLocalHumanCount(
      Math.min(args?.localHumanCount ?? runtimeRef.current.localHumanCount, participantCount)
    );
    const cpuDifficulty = args?.cpuDifficulty ?? runtimeRef.current.cpuDifficulty;
    const lobby = createConfiguredLocalLobby({
      participantCount,
      localHumanCount,
      cpuDifficulty,
    });

    setRuntimeSafe((state) => ({
      ...state,
      matchType: args?.matchType ?? 'local',
      forcedStatus: null,
      connectionState: state.multiplayerAvailable ? 'ready' : 'cpu_only',
      lobby,
      game: createTronGameState(buildGameConfigFromLobby(lobby)),
      isHost: true,
      cpuDifficulty,
      error: null,
      message: null,
      queueStartedAtMs: null,
      queueWaitMs: 0,
      rematchRequests: [],
      pendingQuickMatch: null,
      temporaryCpuSeatIds: [],
      localParticipantCount: participantCount,
      localHumanCount: args?.persistPreviewSelection === false ? state.localHumanCount : localHumanCount,
      recentCrashEvents: [],
      cpuDebug: createEmptyCpuDebug(),
    }));
  }, [
    cleanupQueueChannel,
    cleanupRoomChannel,
    clearDisconnectTimers,
    resetCpuDecisionTicks,
    resetLoopClock,
    setRuntimeSafe,
  ]);

  const startLocalMatch = useCallback(() => {
    startConfiguredLocalMatch({ matchType: 'local' });
  }, [startConfiguredLocalMatch]);

  const startCpuMatch = useCallback((difficulty?: TronCpuDifficulty) => {
    startConfiguredLocalMatch({
      cpuDifficulty: difficulty,
      matchType: 'cpu',
    });
  }, [startConfiguredLocalMatch]);

  const startSpectateMatch = useCallback((difficulty?: TronCpuDifficulty) => {
    startConfiguredLocalMatch({
      cpuDifficulty: difficulty,
      localHumanCount: 0,
      matchType: 'spectate',
      persistPreviewSelection: false,
    });
  }, [startConfiguredLocalMatch]);

  const hostRoom = useCallback(() => {
    if (!supabaseClient) {
      setRuntimeSafe((state) => ({
        ...state,
        forcedStatus: 'error',
        error: 'Supabase realtime is not configured. Multiplayer is unavailable.',
      }));
      return;
    }

    const roomCode = createRoomCode({
      clientId: clientIdRef.current,
      nowMs: Date.now(),
      salt: runtimeRef.current.quickMatchSize,
    });
    const initialLobby = createOnlineCustomLobby(clientIdRef.current, roomCode, runtimeRef.current.cpuDifficulty);
    subscribeToRoomChannel({
      roomCode,
      isHost: true,
      initialLobby,
    });
  }, [setRuntimeSafe, subscribeToRoomChannel, supabaseClient]);

  const joinRoom = useCallback((rawRoomCode: string) => {
    const roomCode = normalizeRoomCode(rawRoomCode);
    if (roomCode.length !== 6) {
      setRuntimeSafe((state) => ({
        ...state,
        forcedStatus: 'error',
        error: 'Room code must be 6 characters.',
      }));
      return;
    }
    subscribeToRoomChannel({
      roomCode,
      isHost: false,
      initialLobby: null,
    });
  }, [setRuntimeSafe, subscribeToRoomChannel]);

  const setQuickMatchSize = useCallback((size: TronQuickMatchSize) => {
    setRuntimeSafe((state) => ({ ...state, quickMatchSize: size }));
  }, [setRuntimeSafe]);

  const setSeatMode = useCallback((seatId: TronPlayerId, mode: TronSeatMode) => {
    const current = runtimeRef.current;
    if (!current.lobby || current.lobby.phase !== 'setup') return;
    if (current.matchType === 'online' && !current.isHost) return;

    const nextLobby = setLobbySeatMode(current.lobby, seatId, mode);
    setRuntimeSafe((state) => ({ ...state, lobby: nextLobby }));
    if (current.matchType === 'online' && current.isHost) {
      void broadcastLobby(nextLobby);
    }
  }, [broadcastLobby, setRuntimeSafe]);

  const claimSeat = useCallback((seatId: TronPlayerId) => {
    const current = runtimeRef.current;
    if (!current.lobby || current.lobby.phase !== 'setup' || current.matchType !== 'online') return;
    if (current.isHost) return;
    const channel = roomChannelRef.current;
    if (!channel) return;
    void sendChannelMessage(channel, {
      type: 'seat_claim',
      clientId: clientIdRef.current,
      seatIds: [seatId],
      createdAt: toIsoNow(),
    });
  }, []);

  const releaseSeat = useCallback((seatId: TronPlayerId) => {
    const current = runtimeRef.current;
    if (!current.lobby || current.lobby.phase !== 'setup' || current.matchType !== 'online') return;
    if (current.isHost) return;
    const channel = roomChannelRef.current;
    if (!channel) return;
    void sendChannelMessage(channel, {
      type: 'seat_release',
      clientId: clientIdRef.current,
      seatIds: [seatId],
      createdAt: toIsoNow(),
    });
  }, []);

  const setCpuDifficulty = useCallback((difficulty: TronCpuDifficulty) => {
    setRuntimeSafe((state) => {
      const nextLobby = state.lobby ? { ...cloneLobby(state.lobby), cpuDifficulty: difficulty } : null;
      return {
        ...state,
        cpuDifficulty: difficulty,
        lobby: nextLobby,
      };
    });
    const current = runtimeRef.current;
    if (current.matchType === 'online' && current.isHost && current.lobby) {
      const nextLobby = { ...cloneLobby(current.lobby), cpuDifficulty: difficulty };
      void broadcastLobby(nextLobby);
    }
  }, [broadcastLobby, setRuntimeSafe]);

  const requestRematch = useCallback(() => {
    const current = runtimeRef.current;
    if (!current.game || !current.lobby) return;

    if (current.matchType === 'local' || current.matchType === 'cpu' || current.matchType === 'spectate') {
      void startLobbyMatch();
      return;
    }

    const channel = roomChannelRef.current;
    if (!channel) return;

    const nextRequests = [...new Set([...current.rematchRequests, clientIdRef.current])].sort();
    setRuntimeSafe((state) => ({
      ...state,
      rematchRequests: nextRequests,
      message: 'Rematch requested.',
    }));

    void sendChannelMessage(channel, {
      type: 'rematch',
      clientId: clientIdRef.current,
      createdAt: toIsoNow(),
    } satisfies ConnectRematchMessage);

    if (!current.isHost) return;

    const requiredClientIds = new Set<string>();
    PLAYER_IDS.forEach((seatId) => {
      const seat = current.lobby?.seats[seatId];
      if (!seat) return;
      if ((seat.mode === 'local' || seat.mode === 'online') && seat.ownerClientId) {
        requiredClientIds.add(seat.ownerClientId);
      }
    });
    const everyoneReady = [...requiredClientIds].every((clientId) => nextRequests.includes(clientId));
    if (everyoneReady && canStartLobby(current.lobby)) {
      void startLobbyMatch();
    }
  }, [setRuntimeSafe, startLobbyMatch]);

  const openFullscreen = useCallback(() => setRuntimeSafe((state) => ({ ...state, displayMode: 'fullscreen' })), [setRuntimeSafe]);
  const closeFullscreen = useCallback(() => setRuntimeSafe((state) => ({ ...state, displayMode: 'panel' })), [setRuntimeSafe]);

  useEffect(() => {
    if (runtime.queueStartedAtMs == null) return undefined;
    const id = window.setInterval(() => {
      setRuntimeSafe((state) => (
        state.queueStartedAtMs == null
          ? state
          : {
            ...state,
            queueWaitMs: Date.now() - state.queueStartedAtMs,
          }
      ));
    }, 250);
    return () => window.clearInterval(id);
  }, [runtime.queueStartedAtMs, setRuntimeSafe]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let rafId = 0;

    const onFrame = (timestamp: number) => {
      const current = runtimeRef.current;
      const status = deriveStatus(current);
      if (!current.game || (status !== 'countdown' && status !== 'playing')) {
        resetLoopClock();
        rafId = window.requestAnimationFrame(onFrame);
        return;
      }

      if (lastFrameRef.current == null) {
        lastFrameRef.current = timestamp;
        rafId = window.requestAnimationFrame(onFrame);
        return;
      }

      const delta = Math.min(timestamp - lastFrameRef.current, MAX_FRAME_DELTA_MS);
      lastFrameRef.current = timestamp;
      accumulatorRef.current += delta;
      const stepBudget = Math.floor(accumulatorRef.current / current.game.tickMs);

      if (stepBudget > 0) {
        accumulatorRef.current -= stepBudget * current.game.tickMs;

        setRuntimeSafe((state) => {
          if (!state.game || !state.lobby) return state;

          let nextGame = state.game;
          let nextLobby = state.lobby;
          let nextRecentCrashEvents = state.recentCrashEvents;
          let nextCpuDebug = state.cpuDebug;
          let shouldBroadcastSnapshotTick = false;
          let shouldBroadcastEnd = false;
          let shouldBroadcastLobbyState = false;

          for (let count = 0; count < stepBudget; count += 1) {
            const cpuSeatIds = listActiveSeatIds(nextLobby).filter((seatId) => (
              nextLobby.seats[seatId].mode === 'cpu' || state.temporaryCpuSeatIds.includes(seatId)
            ));

            if ((state.matchType === 'local' || state.isHost) && nextGame.phase === 'running') {
              cpuSeatIds.forEach((cpuSeatId) => {
                const profile = TRON_CPU_PROFILES[state.cpuDifficulty];
                if ((nextGame.tick - cpuLastDecisionTickRef.current[cpuSeatId]) < (profile.reactionDelayTicks + 1)) {
                  return;
                }
                const cpuDecision = inspectCpuTurn({
                  state: nextGame,
                  playerId: cpuSeatId,
                  difficulty: state.cpuDifficulty,
                });
                if (!cpuDecision) return;
                if (nextCpuDebug === state.cpuDebug) {
                  nextCpuDebug = { ...state.cpuDebug };
                }
                nextCpuDebug[cpuSeatId] = cpuDecision;
                const queued = queueTurn(nextGame, cpuSeatId, cpuDecision.chosenDirection, nextGame.tick + 1);
                if (queued === nextGame) return;
                nextGame = queued;
                cpuLastDecisionTickRef.current[cpuSeatId] = nextGame.tick;
                if (state.matchType === 'online' && state.isHost && roomChannelRef.current) {
                  void sendChannelMessage(roomChannelRef.current, {
                    type: 'input',
                    clientId: clientIdRef.current,
                    playerId: cpuSeatId,
                    tick: nextGame.tick + 1,
                    direction: cpuDecision.chosenDirection,
                    createdAt: toIsoNow(),
                  });
                }
              });
            }

            const previousPhase = nextGame.phase;
            const stepResult = stepTronGame(nextGame);
            nextGame = stepResult.state;
            if (stepResult.events.length > 0) {
              nextRecentCrashEvents = trimRecentCrashEvents(
                nextRecentCrashEvents.concat(stepResult.events)
              );
            }
            nextLobby = updateLobbyPhase(nextLobby, nextGame.phase) ?? nextLobby;
            shouldBroadcastSnapshotTick = shouldBroadcastSnapshotTick || (
              state.matchType === 'online'
              && state.isHost
              && nextGame.tick % HOST_SNAPSHOT_INTERVAL_TICKS === 0
            );
            shouldBroadcastEnd = shouldBroadcastEnd || (
              state.matchType === 'online'
              && state.isHost
              && previousPhase !== nextGame.phase
              && (nextGame.phase === 'round_over' || nextGame.phase === 'match_over')
            );

            if (nextGame.phase === 'round_over' || nextGame.phase === 'match_over') {
              if (state.temporaryCpuSeatIds.length > 0) {
                nextLobby = restoreLobbyAfterTakeover({
                  ...state,
                  lobby: nextLobby,
                  game: nextGame,
                }) ?? nextLobby;
                nextLobby.phase = nextGame.phase;
                shouldBroadcastLobbyState = true;
              }
              break;
            }
          }

          if (state.matchType === 'online' && state.isHost && roomChannelRef.current) {
            if (shouldBroadcastLobbyState) {
              void broadcastLobby(nextLobby);
            }
            if (shouldBroadcastSnapshotTick || shouldBroadcastEnd) {
              void broadcastSnapshot(nextGame);
            }
            if (shouldBroadcastEnd) {
              const snapshot = serializeTronSnapshot(nextGame);
              void sendChannelMessage(roomChannelRef.current, {
                type: 'round_event',
                clientId: clientIdRef.current,
                event: 'round_over',
                reason: nextGame.roundResult?.reason,
                state: snapshot,
                checksum: checksumTronSnapshot(snapshot),
                createdAt: toIsoNow(),
              });
            }
          }

          return {
            ...state,
            game: nextGame,
            lobby: nextLobby,
            recentCrashEvents: nextRecentCrashEvents,
            cpuDebug: nextCpuDebug,
            temporaryCpuSeatIds: nextGame.phase === 'round_over' || nextGame.phase === 'match_over'
              ? []
              : state.temporaryCpuSeatIds,
          };
        });
      }

      rafId = window.requestAnimationFrame(onFrame);
    };

    rafId = window.requestAnimationFrame(onFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [broadcastLobby, broadcastSnapshot, resetLoopClock, restoreLobbyAfterTakeover, setRuntimeSafe]);

  useEffect(() => {
    if (!shouldAutoAdvanceTronRound({
      game: runtime.game,
      lobby: runtime.lobby,
      matchType: runtime.matchType,
      isHost: runtime.isHost,
    })) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      void startLobbyMatch();
    }, ROUND_TRANSITION_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, [runtime.game, runtime.isHost, runtime.lobby, runtime.matchType, startLobbyMatch]);

  useEffect(() => {
    if (!shouldAutoRestartSpectateMatch({
      game: runtime.game,
      lobby: runtime.lobby,
      matchType: runtime.matchType,
    })) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      void startLobbyMatch();
    }, SPECTATE_MATCH_RESTART_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, [runtime.game, runtime.lobby, runtime.matchType, startLobbyMatch]);

  useEffect(() => () => {
    cleanupQueueChannel();
    cleanupRoomChannel();
    clearDisconnectTimers();
    localBufferedInputsRef.current = [];
    resetLoopClock();
  }, [
    cleanupQueueChannel,
    cleanupRoomChannel,
    clearDisconnectTimers,
    resetLoopClock,
  ]);

  const status = deriveStatus(runtime);
  const score = runtime.game?.score ?? createTronScoreRecord();
  const ownedSeatIds = getOwnedSeatIds(runtime);
  const participantCount = runtime.lobby
    ? clampLocalParticipantCount(listActiveSeatIds(runtime.lobby).length)
    : runtime.localParticipantCount;
  const localHumanCount = runtime.lobby
    ? clampLocalHumanCount(countLocalLobbySeats(runtime.lobby))
    : runtime.localHumanCount;
  const ownedPlayerIds = (runtime.game || runtime.lobby)
    ? ownedSeatIds
    : resolvePreviewOwnedSeatIds(participantCount, localHumanCount);
  const roomCode = runtime.lobby?.roomCode ?? null;
  const canStartCurrentLobby = runtime.lobby != null && canStartLobby(runtime.lobby);
  const canRequestRematch = runtime.game != null && (runtime.game.phase === 'round_over' || runtime.game.phase === 'match_over');
  const notificationCount = (
    status === 'round_over'
    || status === 'match_over'
    || status === 'disconnected'
  ) ? 1 : 0;

  const value = useMemo<ConnectContextValue>(() => ({
    displayMode: runtime.displayMode,
    mode: runtime.matchType,
    status,
    connectionState: runtime.connectionState,
    multiplayerAvailable: runtime.multiplayerAvailable,
    isHost: runtime.isHost,
    notificationCount,
    quickMatchSize: runtime.quickMatchSize,
    roomCode,
    lobby: runtime.lobby,
    game: runtime.game,
    ownedSeatIds,
    ownedPlayerIds,
    participantCount,
    localHumanCount,
    recentCrashEvents: runtime.recentCrashEvents,
    cpuDebug: runtime.cpuDebug,
    score,
    cpuDifficulty: runtime.cpuDifficulty,
    error: runtime.error,
    message: runtime.message,
    queueWaitMs: runtime.queueWaitMs,
    canStartLobby: canStartCurrentLobby,
    canRequestRematch,
    setQuickMatchSize,
    setParticipantCount,
    setLocalHumanCount,
    openCustomLobby,
    startLocalMatch,
    startCpuMatch,
    startSpectateMatch,
    startQuickMatch,
    hostRoom,
    joinRoom,
    setSeatMode,
    claimSeat,
    releaseSeat,
    startLobbyMatch: () => {
      void startLobbyMatch();
    },
    setCpuDifficulty,
    requestRematch,
    leaveMatch: () => leaveMatch(true),
    sendTurn,
    openFullscreen,
    closeFullscreen,
  }), [
    canRequestRematch,
    canStartCurrentLobby,
    claimSeat,
    closeFullscreen,
    hostRoom,
    joinRoom,
    leaveMatch,
    notificationCount,
    openCustomLobby,
    openFullscreen,
    ownedPlayerIds,
    ownedSeatIds,
    participantCount,
    localHumanCount,
    requestRematch,
    roomCode,
    runtime.connectionState,
    runtime.cpuDebug,
    runtime.cpuDifficulty,
    runtime.displayMode,
    runtime.error,
    runtime.game,
    runtime.isHost,
    runtime.lobby,
    runtime.matchType,
    runtime.message,
    runtime.multiplayerAvailable,
    runtime.recentCrashEvents,
    runtime.queueWaitMs,
    runtime.quickMatchSize,
    score,
    sendTurn,
    setCpuDifficulty,
    setLocalHumanCount,
    setParticipantCount,
    setQuickMatchSize,
    setSeatMode,
    startLocalMatch,
    startCpuMatch,
    startSpectateMatch,
    startLobbyMatch,
    startQuickMatch,
    status,
  ]);

  return <ConnectContext.Provider value={value}>{children}</ConnectContext.Provider>;
};

export const useConnectRuntime = (): ConnectContextValue => {
  const ctx = useContext(ConnectContext);
  if (!ctx) throw new Error('useConnectRuntime must be used within <ConnectProvider>.');
  return ctx;
};
