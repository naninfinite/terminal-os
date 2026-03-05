import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createMatchOffer, createRoomCode, isOfferTargetForClient, normalizeRoomCode, pickQuickMatchPair, shouldLeadQuickMatch } from './matchmaking';
import {
  checksumTronSnapshot,
  createTronGameState,
  hydrateTronSnapshot,
  prepareNextTronRound,
  queueTurn,
  restartTronMatch,
  serializeTronSnapshot,
  stepTronGame,
} from './tronEngine';
import { pickCpuTurn, TRON_CPU_PROFILES } from './tronCpu';
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
  ConnectConnectionState,
  ConnectDisplayMode,
  ConnectInputMessage,
  ConnectMatchType,
  ConnectRematchMessage,
  ConnectRuntimeStatus,
  TronCpuDifficulty,
  TronDirection,
  TronGameState,
  TronPlayerId,
  TronQueuedTurn,
} from './types';

const CLIENT_KEY_STORAGE_KEY = 'terminalOS.connect.v1.clientKey';
const MAX_FRAME_DELTA_MS = 250;
const QUICK_MATCH_CPU_SUGGEST_MS = 12_000;
const DISCONNECT_GRACE_MS = 2_000;
const ONLINE_INPUT_BUFFER_TICKS = 2;
const LOCAL_INPUT_BUFFER_TICKS = 1;
const HOST_SNAPSHOT_INTERVAL_TICKS = 5;
const DEFAULT_CPU_DIFFICULTY: TronCpuDifficulty = 'medium';

type ConnectInternalState = {
  displayMode: ConnectDisplayMode;
  matchType: ConnectMatchType;
  forcedStatus: ConnectRuntimeStatus | null;
  connectionState: ConnectConnectionState;
  multiplayerAvailable: boolean;
  game: TronGameState | null;
  roomCode: string | null;
  localPlayerId: TronPlayerId;
  isHost: boolean;
  remoteClientId: string | null;
  cpuDifficulty: TronCpuDifficulty;
  error: string | null;
  message: string | null;
  queueStartedAtMs: number | null;
  queueWaitMs: number;
  rematchRequestedLocal: boolean;
  rematchRequestedRemote: boolean;
};

type ConnectContextValue = {
  displayMode: ConnectDisplayMode;
  mode: ConnectMatchType;
  status: ConnectRuntimeStatus;
  connectionState: ConnectConnectionState;
  multiplayerAvailable: boolean;
  notificationCount: number;
  roomCode: string | null;
  score: Record<TronPlayerId, number>;
  game: TronGameState | null;
  localPlayerId: TronPlayerId;
  cpuDifficulty: TronCpuDifficulty;
  error: string | null;
  message: string | null;
  queueWaitMs: number;
  canSuggestCpuFallback: boolean;
  canRequestRematch: boolean;
  startQuickMatch: () => void;
  hostRoom: () => void;
  joinRoom: (roomCode: string) => void;
  startCpuMatch: (difficulty?: TronCpuDifficulty) => void;
  setCpuDifficulty: (difficulty: TronCpuDifficulty) => void;
  leaveMatch: () => void;
  requestRematch: () => void;
  sendTurn: (direction: TronDirection) => void;
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

const phaseToStatus = (game: TronGameState | null): ConnectRuntimeStatus => {
  if (!game) return 'idle';
  if (game.phase === 'countdown') return 'countdown';
  if (game.phase === 'running') return 'playing';
  if (game.phase === 'round_over') return 'round_over';
  return 'match_over';
};

const createInitialState = (multiplayerAvailable: boolean): ConnectInternalState => ({
  displayMode: 'panel',
  matchType: 'idle',
  forcedStatus: 'idle',
  connectionState: multiplayerAvailable ? 'ready' : 'cpu_only',
  multiplayerAvailable,
  game: null,
  roomCode: null,
  localPlayerId: 'p1',
  isHost: false,
  remoteClientId: null,
  cpuDifficulty: DEFAULT_CPU_DIFFICULTY,
  error: null,
  message: null,
  queueStartedAtMs: null,
  queueWaitMs: 0,
  rematchRequestedLocal: false,
  rematchRequestedRemote: false,
});

export const ConnectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supabaseClient = useMemo(() => createConnectSupabaseClient(), []);
  const initialState = useMemo(
    () => createInitialState(supabaseClient != null),
    [supabaseClient]
  );
  const [runtime, setRuntime] = useState<ConnectInternalState>(initialState);
  const runtimeRef = useRef<ConnectInternalState>(initialState);
  const clientIdRef = useRef<string>(getClientKey());
  const queueChannelRef = useRef<ReturnType<typeof createPresenceChannel> | null>(null);
  const roomChannelRef = useRef<ReturnType<typeof createPresenceChannel> | null>(null);
  const disconnectTimerRef = useRef<number | null>(null);
  const localBufferedInputsRef = useRef<TronQueuedTurn[]>([]);
  const cpuLastDecisionTickRef = useRef<number>(Number.NEGATIVE_INFINITY);
  const queueOfferKeyRef = useRef<string | null>(null);
  const roomHasStartedRef = useRef(false);
  const lastFrameRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);

  const setRuntimeSafe = useCallback((
    updater: ConnectInternalState | ((current: ConnectInternalState) => ConnectInternalState)
  ) => {
    setRuntime((current) => {
      const next = typeof updater === 'function'
        ? (updater as (value: ConnectInternalState) => ConnectInternalState)(current)
        : updater;
      runtimeRef.current = next;
      return next;
    });
  }, []);

  const clearDisconnectTimer = useCallback(() => {
    if (disconnectTimerRef.current != null) {
      window.clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
  }, []);

  const resetLoopClock = useCallback(() => {
    lastFrameRef.current = null;
    accumulatorRef.current = 0;
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
    roomHasStartedRef.current = false;
    if (!channel) return;
    void channel.unsubscribe();
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

  const applyDisconnectedRound = useCallback(() => {
    const current = runtimeRef.current;
    if (!current.game) {
      setRuntimeSafe((state) => ({
        ...state,
        forcedStatus: 'disconnected',
        message: 'Opponent disconnected.',
      }));
      return;
    }

    const remotePlayerId: TronPlayerId = current.localPlayerId === 'p1' ? 'p2' : 'p1';
    const nextGame: TronGameState = {
      ...current.game,
      phase: 'round_over',
      pendingInputs: [],
      roundResult: {
        winner: null,
        eliminated: [remotePlayerId],
        reason: 'disconnect',
      },
    };

    localBufferedInputsRef.current = [];
    roomHasStartedRef.current = false;
    setRuntimeSafe((state) => ({
      ...state,
      game: nextGame,
      forcedStatus: 'disconnected',
      message: 'Opponent disconnected.',
      rematchRequestedLocal: false,
      rematchRequestedRemote: false,
    }));
  }, [setRuntimeSafe]);

  const startHostControlledRound = useCallback(async (restartMatch: boolean) => {
    const current = runtimeRef.current;
    if (!current.isHost) return;

    const nextGame = current.game == null
      ? createTronGameState()
      : (restartMatch || current.game.phase === 'match_over' || current.forcedStatus === 'disconnected')
        ? restartTronMatch(current.game)
        : prepareNextTronRound(current.game);

    roomHasStartedRef.current = true;
    localBufferedInputsRef.current = [];
    cpuLastDecisionTickRef.current = Number.NEGATIVE_INFINITY;

    setRuntimeSafe((state) => ({
      ...state,
      game: nextGame,
      matchType: 'online',
      forcedStatus: null,
      connectionState: 'in_room',
      rematchRequestedLocal: false,
      rematchRequestedRemote: false,
      error: null,
      message: null,
    }));

    const channel = roomChannelRef.current;
    if (!channel) return;
    const snapshot = serializeTronSnapshot(nextGame);
    const checksum = checksumTronSnapshot(snapshot);
    await sendChannelMessage(channel, {
      type: 'round_event',
      clientId: clientIdRef.current,
      event: 'round_start',
      state: snapshot,
      checksum,
      createdAt: toIsoNow(),
    });
    await sendChannelMessage(channel, {
      type: 'snapshot',
      clientId: clientIdRef.current,
      checksum,
      state: snapshot,
      createdAt: toIsoNow(),
    });
  }, [setRuntimeSafe]);

  const leaveMatch = useCallback((notifyRemote = true) => {
    const current = runtimeRef.current;
    if (notifyRemote && current.matchType === 'online' && roomChannelRef.current) {
      notifyRemoteLeaveIfNeeded();
    }

    cleanupQueueChannel();
    cleanupRoomChannel();
    clearDisconnectTimer();
    resetLoopClock();
    localBufferedInputsRef.current = [];
    cpuLastDecisionTickRef.current = Number.NEGATIVE_INFINITY;

    setRuntimeSafe((state) => ({
      ...state,
      matchType: 'idle',
      forcedStatus: 'idle',
      connectionState: state.multiplayerAvailable ? 'ready' : 'cpu_only',
      game: null,
      roomCode: null,
      localPlayerId: 'p1',
      isHost: false,
      remoteClientId: null,
      error: null,
      message: null,
      queueStartedAtMs: null,
      queueWaitMs: 0,
      rematchRequestedLocal: false,
      rematchRequestedRemote: false,
    }));
  }, [
    cleanupQueueChannel,
    cleanupRoomChannel,
    clearDisconnectTimer,
    resetLoopClock,
    setRuntimeSafe,
  ]);

  const joinRoomInternal = useCallback((rawRoomCode: string, isHost: boolean) => {
    const roomCode = normalizeRoomCode(rawRoomCode);
    if (roomCode.length !== 6 || !supabaseClient) {
      setRuntimeSafe((state) => ({
        ...state,
        forcedStatus: 'error',
        error: roomCode.length !== 6 ? 'Room code must be 6 characters.' : 'Supabase realtime is unavailable.',
      }));
      return;
    }

    notifyRemoteLeaveIfNeeded();
    cleanupQueueChannel();
    cleanupRoomChannel();
    clearDisconnectTimer();
    resetLoopClock();
    localBufferedInputsRef.current = [];
    cpuLastDecisionTickRef.current = Number.NEGATIVE_INFINITY;
    roomHasStartedRef.current = false;

    setRuntimeSafe((state) => ({
      ...state,
      matchType: 'online',
      forcedStatus: isHost ? 'hosting' : 'joining',
      connectionState: 'joining_room',
      roomCode,
      localPlayerId: isHost ? 'p1' : 'p2',
      isHost,
      remoteClientId: null,
      game: null,
      error: null,
      message: isHost ? `Room ${roomCode} ready. Waiting for opponent.` : `Joining room ${roomCode}...`,
      queueStartedAtMs: null,
      queueWaitMs: 0,
      rematchRequestedLocal: false,
      rematchRequestedRemote: false,
    }));

    const channel = createPresenceChannel(supabaseClient, getConnectRoomChannelName(roomCode), clientIdRef.current);
    roomChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const participants = flattenPresenceState(channel.presenceState());
        const remote = participants.find((entry) => entry.clientId !== clientIdRef.current) ?? null;

        setRuntimeSafe((state) => ({
          ...state,
          remoteClientId: remote?.clientId ?? null,
          connectionState: participants.length > 1 ? 'in_room' : 'joining_room',
          message: state.game
            ? state.message
            : participants.length > 1
              ? null
              : (state.isHost ? `Room ${roomCode} ready. Waiting for opponent.` : `Waiting for host in ${roomCode}...`),
        }));

        if (participants.length > 1) {
          clearDisconnectTimer();
          if (isHost && !roomHasStartedRef.current) {
            void startHostControlledRound(false);
          }
          return;
        }

        const current = runtimeRef.current;
        if (current.matchType !== 'online' || current.roomCode !== roomCode || !current.game) return;
        clearDisconnectTimer();
        disconnectTimerRef.current = window.setTimeout(() => {
          applyDisconnectedRound();
        }, DISCONNECT_GRACE_MS);
      })
      .on('broadcast', { event: 'input' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'input' || message.clientId === clientIdRef.current) return;

        setRuntimeSafe((state) => {
          if (!state.game) return state;
          const input = message as ConnectInputMessage;
          const appliedTick = input.tick <= state.game.tick ? state.game.tick + 1 : input.tick;
          return {
            ...state,
            game: queueTurn(state.game, input.playerId, input.direction, appliedTick),
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
          for (const turn of buffered) {
            reconciled = queueTurn(reconciled, turn.playerId, turn.direction, turn.tick);
          }
          localBufferedInputsRef.current = buffered;

          return {
            ...state,
            game: reconciled,
            forcedStatus: null,
            error: null,
            message: null,
          };
        });
      })
      .on('broadcast', { event: 'round_event' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'round_event' || message.clientId === clientIdRef.current) return;

        if (message.event === 'round_start' && message.state) {
          const roundStartState = message.state;
          localBufferedInputsRef.current = [];
          cpuLastDecisionTickRef.current = Number.NEGATIVE_INFINITY;
          roomHasStartedRef.current = true;
          setRuntimeSafe((state) => ({
            ...state,
            game: hydrateTronSnapshot(roundStartState),
            forcedStatus: null,
            error: null,
            message: null,
            rematchRequestedLocal: false,
            rematchRequestedRemote: false,
          }));
          return;
        }

        if (message.event === 'opponent_disconnected') {
          applyDisconnectedRound();
        }
      })
      .on('broadcast', { event: 'rematch' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'rematch' || message.clientId === clientIdRef.current) return;

        setRuntimeSafe((state) => ({
          ...state,
          rematchRequestedRemote: true,
          message: state.rematchRequestedLocal ? null : 'Opponent wants a rematch.',
        }));

        const current = runtimeRef.current;
        if (current.isHost && current.rematchRequestedLocal) {
          void startHostControlledRound(message.restartMatch);
        }
      })
      .on('broadcast', { event: 'leave' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'leave' || message.clientId === clientIdRef.current) return;
        clearDisconnectTimer();
        disconnectTimerRef.current = window.setTimeout(() => {
          applyDisconnectedRound();
        }, DISCONNECT_GRACE_MS);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({
            clientId: clientIdRef.current,
            joinedAt: toIsoNow(),
          });
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
    applyDisconnectedRound,
    cleanupQueueChannel,
    cleanupRoomChannel,
    clearDisconnectTimer,
    notifyRemoteLeaveIfNeeded,
    resetLoopClock,
    setRuntimeSafe,
    startHostControlledRound,
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

    notifyRemoteLeaveIfNeeded();
    cleanupQueueChannel();
    cleanupRoomChannel();
    clearDisconnectTimer();
    resetLoopClock();
    localBufferedInputsRef.current = [];
    cpuLastDecisionTickRef.current = Number.NEGATIVE_INFINITY;

    const joinedAt = toIsoNow();
    queueOfferKeyRef.current = null;
    setRuntimeSafe((state) => ({
      ...state,
      matchType: 'online',
      forcedStatus: 'queueing',
      connectionState: 'queueing',
      game: null,
      roomCode: null,
      localPlayerId: 'p1',
      isHost: false,
      remoteClientId: null,
      error: null,
      message: 'Waiting for an opponent...',
      queueStartedAtMs: Date.now(),
      queueWaitMs: 0,
      rematchRequestedLocal: false,
      rematchRequestedRemote: false,
    }));

    const channel = createPresenceChannel(supabaseClient, CONNECT_QUEUE_CHANNEL, clientIdRef.current);
    queueChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const participants = flattenPresenceState(channel.presenceState());
        const pair = pickQuickMatchPair(participants);
        if (!pair) return;
        if (!shouldLeadQuickMatch(clientIdRef.current, participants)) return;

        const offerKey = `${pair.hostClientId}:${pair.guestClientId}`;
        if (queueOfferKeyRef.current === offerKey) return;
        queueOfferKeyRef.current = offerKey;

        const offer = createMatchOffer({
          hostClientId: pair.hostClientId,
          guestClientId: pair.guestClientId,
          roomCode: createRoomCode({
            clientId: pair.hostClientId,
            nowMs: Date.now(),
          }),
          createdAt: toIsoNow(),
        });
        void sendChannelMessage(channel, offer);
      })
      .on('broadcast', { event: 'match_offer' }, ({ payload }) => {
        const message = readBroadcastPayload(payload);
        if (message?.type !== 'match_offer') return;
        if (!isOfferTargetForClient(message, clientIdRef.current)) return;
        if (runtimeRef.current.forcedStatus !== 'queueing') return;
        joinRoomInternal(message.roomCode, message.hostClientId === clientIdRef.current);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void channel.track({
            clientId: clientIdRef.current,
            joinedAt,
          });
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
    clearDisconnectTimer,
    joinRoomInternal,
    notifyRemoteLeaveIfNeeded,
    resetLoopClock,
    setRuntimeSafe,
    supabaseClient,
  ]);

  const hostRoom = useCallback(() => {
    const roomCode = createRoomCode({
      clientId: clientIdRef.current,
      nowMs: Date.now(),
      salt: runtimeRef.current.queueWaitMs,
    });
    joinRoomInternal(roomCode, true);
  }, [joinRoomInternal]);

  const joinRoom = useCallback((roomCode: string) => {
    joinRoomInternal(roomCode, false);
  }, [joinRoomInternal]);

  const startCpuMatch = useCallback((difficulty?: TronCpuDifficulty) => {
    notifyRemoteLeaveIfNeeded();
    cleanupQueueChannel();
    cleanupRoomChannel();
    clearDisconnectTimer();
    resetLoopClock();
    localBufferedInputsRef.current = [];
    cpuLastDecisionTickRef.current = Number.NEGATIVE_INFINITY;

    setRuntimeSafe((state) => ({
      ...state,
      matchType: 'cpu',
      forcedStatus: null,
      connectionState: state.multiplayerAvailable ? 'ready' : 'cpu_only',
      game: createTronGameState(),
      roomCode: null,
      localPlayerId: 'p1',
      isHost: false,
      remoteClientId: null,
      cpuDifficulty: difficulty ?? state.cpuDifficulty,
      error: null,
      message: null,
      queueStartedAtMs: null,
      queueWaitMs: 0,
      rematchRequestedLocal: false,
      rematchRequestedRemote: false,
    }));
  }, [
    cleanupQueueChannel,
    cleanupRoomChannel,
    clearDisconnectTimer,
    notifyRemoteLeaveIfNeeded,
    resetLoopClock,
    setRuntimeSafe,
  ]);

  const setCpuDifficulty = useCallback((difficulty: TronCpuDifficulty) => {
    setRuntimeSafe((state) => ({ ...state, cpuDifficulty: difficulty }));
  }, [setRuntimeSafe]);

  const requestRematch = useCallback(() => {
    const current = runtimeRef.current;
    if (!current.game) return;

    if (current.matchType === 'cpu') {
      cpuLastDecisionTickRef.current = Number.NEGATIVE_INFINITY;
      setRuntimeSafe((state) => ({
        ...state,
        forcedStatus: null,
        game: state.game == null
          ? createTronGameState()
          : (state.game.phase === 'match_over' || state.forcedStatus === 'disconnected')
            ? restartTronMatch(state.game)
            : prepareNextTronRound(state.game),
        message: null,
        error: null,
      }));
      return;
    }

    setRuntimeSafe((state) => ({
      ...state,
      rematchRequestedLocal: true,
      message: state.rematchRequestedRemote ? null : 'Rematch requested.',
      error: null,
    }));

    const restartMatch = current.game.phase === 'match_over' || current.forcedStatus === 'disconnected';
    const channel = roomChannelRef.current;
    if (channel) {
      void sendChannelMessage(channel, {
        type: 'rematch',
        clientId: clientIdRef.current,
        restartMatch,
        createdAt: toIsoNow(),
      } satisfies ConnectRematchMessage);
    }
    if (current.isHost && current.rematchRequestedRemote) {
      void startHostControlledRound(restartMatch);
    }
  }, [setRuntimeSafe, startHostControlledRound]);

  const sendTurn = useCallback((direction: TronDirection) => {
    const current = runtimeRef.current;
    if (!current.game) return;

    const targetTick = current.game.tick + (current.matchType === 'online' ? ONLINE_INPUT_BUFFER_TICKS : LOCAL_INPUT_BUFFER_TICKS);
    const nextGame = queueTurn(current.game, current.localPlayerId, direction, targetTick);
    if (nextGame === current.game) return;

    setRuntimeSafe((state) => ({
      ...state,
      game: nextGame,
      message: null,
      error: null,
    }));

    if (current.matchType === 'online' && roomChannelRef.current) {
      localBufferedInputsRef.current = localBufferedInputsRef.current
        .filter((turn) => !(turn.playerId === current.localPlayerId && turn.tick === targetTick))
        .concat({ playerId: current.localPlayerId, direction, tick: targetTick })
        .sort((left, right) => left.tick - right.tick);

      void sendChannelMessage(roomChannelRef.current, {
        type: 'input',
        clientId: clientIdRef.current,
        playerId: current.localPlayerId,
        tick: targetTick,
        direction,
        createdAt: toIsoNow(),
      } satisfies ConnectInputMessage);
    }
  }, [setRuntimeSafe]);

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
      const currentStatus = current.forcedStatus ?? phaseToStatus(current.game);
      if (!current.game || (currentStatus !== 'countdown' && currentStatus !== 'playing')) {
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
          if (!state.game) return state;

          let nextGame = state.game;
          let shouldBroadcastEnd = false;
          let shouldBroadcastSnapshotTick = false;

          for (let count = 0; count < stepBudget; count += 1) {
            if (state.matchType === 'cpu' && nextGame.phase === 'running') {
              const cpuPlayerId: TronPlayerId = state.localPlayerId === 'p1' ? 'p2' : 'p1';
              const profile = TRON_CPU_PROFILES[state.cpuDifficulty];
              if ((nextGame.tick - cpuLastDecisionTickRef.current) >= (profile.reactionDelayTicks + 1)) {
                const cpuDirection = pickCpuTurn({
                  state: nextGame,
                  playerId: cpuPlayerId,
                  difficulty: state.cpuDifficulty,
                });
                if (cpuDirection) {
                  nextGame = queueTurn(nextGame, cpuPlayerId, cpuDirection, nextGame.tick + 1);
                  cpuLastDecisionTickRef.current = nextGame.tick;
                }
              }
            }

            const previousPhase = nextGame.phase;
            nextGame = stepTronGame(nextGame);
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
              roomHasStartedRef.current = false;
              break;
            }
          }

          if (state.matchType === 'online' && state.isHost && roomChannelRef.current) {
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
            forcedStatus: state.forcedStatus === 'disconnected' || state.forcedStatus === 'error'
              ? state.forcedStatus
              : null,
          };
        });
      }

      rafId = window.requestAnimationFrame(onFrame);
    };

    rafId = window.requestAnimationFrame(onFrame);
    return () => window.cancelAnimationFrame(rafId);
  }, [broadcastSnapshot, resetLoopClock, setRuntimeSafe]);

  useEffect(() => () => {
    cleanupQueueChannel();
    cleanupRoomChannel();
    clearDisconnectTimer();
    localBufferedInputsRef.current = [];
    resetLoopClock();
  }, [
    cleanupQueueChannel,
    cleanupRoomChannel,
    clearDisconnectTimer,
    resetLoopClock,
  ]);

  const status = runtime.forcedStatus ?? phaseToStatus(runtime.game);
  const score = runtime.game?.score ?? { p1: 0, p2: 0 };
  const canSuggestCpuFallback = status === 'queueing' && runtime.queueWaitMs >= QUICK_MATCH_CPU_SUGGEST_MS;
  const canRequestRematch = status === 'round_over' || status === 'match_over' || status === 'disconnected';
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
    notificationCount,
    roomCode: runtime.roomCode,
    score,
    game: runtime.game,
    localPlayerId: runtime.localPlayerId,
    cpuDifficulty: runtime.cpuDifficulty,
    error: runtime.error,
    message: runtime.message,
    queueWaitMs: runtime.queueWaitMs,
    canSuggestCpuFallback,
    canRequestRematch,
    startQuickMatch,
    hostRoom,
    joinRoom,
    startCpuMatch,
    setCpuDifficulty,
    leaveMatch: () => leaveMatch(true),
    requestRematch,
    sendTurn,
    openFullscreen,
    closeFullscreen,
  }), [
    canRequestRematch,
    canSuggestCpuFallback,
    closeFullscreen,
    hostRoom,
    joinRoom,
    leaveMatch,
    notificationCount,
    openFullscreen,
    requestRematch,
    runtime.connectionState,
    runtime.cpuDifficulty,
    runtime.displayMode,
    runtime.error,
    runtime.game,
    runtime.localPlayerId,
    runtime.matchType,
    runtime.message,
    runtime.multiplayerAvailable,
    runtime.queueWaitMs,
    runtime.roomCode,
    score,
    sendTurn,
    setCpuDifficulty,
    startCpuMatch,
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
