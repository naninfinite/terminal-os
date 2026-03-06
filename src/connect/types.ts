export type ConnectDisplayMode = 'panel' | 'fullscreen';
export type ConnectMatchType = 'idle' | 'local' | 'cpu' | 'online';
export type ConnectRuntimeStatus =
  | 'idle'
  | 'queueing'
  | 'hosting'
  | 'joining'
  | 'setup'
  | 'countdown'
  | 'playing'
  | 'round_over'
  | 'match_over'
  | 'disconnected'
  | 'error';
export type ConnectConnectionState = 'cpu_only' | 'ready' | 'queueing' | 'joining_room' | 'in_room';

export type TronPlayerId = 'p1' | 'p2' | 'p3' | 'p4';
export type TronSeatMode = 'closed' | 'cpu' | 'local' | 'online';
export type TronQuickMatchSize = 2 | 4;
export type TronDirection = 'up' | 'right' | 'down' | 'left';
export type TronRoundPhase = 'countdown' | 'running' | 'round_over' | 'match_over';
export type TronRoundResultReason = 'wall' | 'trail' | 'same_cell' | 'swap' | 'disconnect' | 'abandon';
export type TronCpuDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type ConnectLobbySource = 'local_custom' | 'online_custom' | 'quick_match';
export type ConnectLobbyPhase = 'setup' | TronRoundPhase;

export type TronCell = {
  x: number;
  y: number;
};

export type TronGridPoint = {
  x: number;
  y: number;
};

export type TronQueuedTurn = {
  playerId: TronPlayerId;
  tick: number;
  direction: TronDirection;
};

export type TronPlayerState = {
  id: TronPlayerId;
  head: TronCell;
  direction: TronDirection;
  alive: boolean;
  trailCellIds: number[];
  impactPoint: TronGridPoint | null;
};

export type TronRoundResult = {
  winner: TronPlayerId | null;
  eliminated: TronPlayerId[];
  reason: TronRoundResultReason;
};

export type TronCrashEvent = {
  type: 'crash';
  eventId: string;
  playerId: TronPlayerId;
  tick: number;
  round: number;
  reason: TronRoundResultReason;
  impactPoint: TronGridPoint;
};

export type TronStepEvent = TronCrashEvent;

export type TronSeatConfig = {
  playerId: TronPlayerId;
  mode: TronSeatMode;
  ownerClientId: string | null;
};

export type ConnectLobbyState = {
  version: 1;
  source: ConnectLobbySource;
  roomCode: string | null;
  hostClientId: string | null;
  quickMatchSize: TronQuickMatchSize | null;
  cpuDifficulty: TronCpuDifficulty;
  seats: Record<TronPlayerId, TronSeatConfig>;
  phase: ConnectLobbyPhase;
};

export type TronGameConfig = {
  columns: number;
  rows: number;
  tickMs: number;
  countdownTicks: number;
  firstToScore: number;
  seed: number;
  activePlayerIds: TronPlayerId[];
  score?: Record<TronPlayerId, number>;
  round?: number;
};

export type TronGameState = {
  columns: number;
  rows: number;
  tickMs: number;
  countdownTicks: number;
  countdownTicksRemaining: number;
  firstToScore: number;
  seed: number;
  tick: number;
  round: number;
  phase: TronRoundPhase;
  activePlayerIds: TronPlayerId[];
  score: Record<TronPlayerId, number>;
  players: Record<TronPlayerId, TronPlayerState>;
  pendingInputs: TronQueuedTurn[];
  roundResult: TronRoundResult | null;
};

export type TronStepResult = {
  state: TronGameState;
  events: TronStepEvent[];
};

export type TronSnapshot = TronGameState & {
  version: 1;
};

export type TronCpuWeights = {
  reachableArea: number;
  liberties: number;
  corridorRisk: number;
  opponentPressure: number;
  cutoffPotential: number;
  centerBias: number;
  antiJitter: number;
  forcedDeathRisk: number;
};

export type TronCpuProfile = {
  difficulty: TronCpuDifficulty;
  reactionDelayTicks: number;
  lookaheadDepth: number;
  rolloutCandidates: number;
  randomness: number;
  weights: TronCpuWeights;
};

export type ConnectQueuePresence = {
  clientId: string;
  joinedAt: string;
  desiredPlayers: TronQuickMatchSize;
};

export type ConnectMatchOffer = {
  type: 'match_offer';
  offerId: string;
  roomCode: string;
  queueSize: TronQuickMatchSize;
  hostClientId: string;
  selectedClientIds: string[];
  seatAssignments: Record<string, TronPlayerId>;
  createdAt: string;
};

export type ConnectLobbyStateMessage = {
  type: 'lobby_state';
  clientId: string;
  lobby: ConnectLobbyState;
  createdAt: string;
};

export type ConnectSeatClaimMessage = {
  type: 'seat_claim';
  clientId: string;
  seatIds: TronPlayerId[];
  createdAt: string;
};

export type ConnectSeatReleaseMessage = {
  type: 'seat_release';
  clientId: string;
  seatIds: TronPlayerId[];
  createdAt: string;
};

export type ConnectInputMessage = {
  type: 'input';
  clientId: string;
  playerId: TronPlayerId;
  tick: number;
  direction: TronDirection;
  createdAt: string;
};

export type ConnectSnapshotMessage = {
  type: 'snapshot';
  clientId: string;
  checksum: string;
  state: TronSnapshot;
  createdAt: string;
};

export type ConnectRoundEventMessage = {
  type: 'round_event';
  clientId: string;
  event: 'round_start' | 'round_over' | 'cpu_takeover' | 'host_disconnected';
  seatIds?: TronPlayerId[];
  reason?: TronRoundResultReason;
  state?: TronSnapshot;
  checksum?: string;
  createdAt: string;
};

export type ConnectRematchMessage = {
  type: 'rematch';
  clientId: string;
  createdAt: string;
};

export type ConnectLeaveMessage = {
  type: 'leave';
  clientId: string;
  reason: 'manual' | 'disconnect';
  createdAt: string;
};

export type ConnectChannelMessage =
  | ConnectMatchOffer
  | ConnectLobbyStateMessage
  | ConnectSeatClaimMessage
  | ConnectSeatReleaseMessage
  | ConnectInputMessage
  | ConnectSnapshotMessage
  | ConnectRoundEventMessage
  | ConnectRematchMessage
  | ConnectLeaveMessage;
