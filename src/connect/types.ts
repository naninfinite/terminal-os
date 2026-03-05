export type ConnectDisplayMode = 'panel' | 'fullscreen';
export type ConnectMatchType = 'idle' | 'cpu' | 'online';
export type ConnectRuntimeStatus =
  | 'idle'
  | 'queueing'
  | 'hosting'
  | 'joining'
  | 'countdown'
  | 'playing'
  | 'round_over'
  | 'match_over'
  | 'disconnected'
  | 'error';
export type ConnectConnectionState = 'cpu_only' | 'ready' | 'queueing' | 'joining_room' | 'in_room';

export type TronPlayerId = 'p1' | 'p2';
export type TronDirection = 'up' | 'right' | 'down' | 'left';
export type TronRoundPhase = 'countdown' | 'running' | 'round_over' | 'match_over';
export type TronRoundResultReason = 'wall' | 'trail' | 'same_cell' | 'swap' | 'disconnect' | 'abandon';
export type TronCpuDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type TronCell = {
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
};

export type TronRoundResult = {
  winner: TronPlayerId | null;
  eliminated: TronPlayerId[];
  reason: TronRoundResultReason;
};

export type TronGameConfig = {
  columns: number;
  rows: number;
  tickMs: number;
  countdownTicks: number;
  firstToScore: number;
  seed: number;
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
  score: Record<TronPlayerId, number>;
  players: Record<TronPlayerId, TronPlayerState>;
  pendingInputs: TronQueuedTurn[];
  roundResult: TronRoundResult | null;
};

export type TronSnapshot = TronGameState & {
  version: 1;
};

export type TronCpuProfile = {
  difficulty: TronCpuDifficulty;
  reactionDelayTicks: number;
  lookaheadDepth: number;
  randomness: number;
};

export type ConnectQueuePresence = {
  clientId: string;
  joinedAt: string;
};

export type ConnectMatchOffer = {
  type: 'match_offer';
  offerId: string;
  roomCode: string;
  hostClientId: string;
  guestClientId: string;
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
  event: 'room_ready' | 'round_start' | 'round_over' | 'opponent_disconnected';
  reason?: TronRoundResultReason;
  state?: TronSnapshot;
  checksum?: string;
  createdAt: string;
};

export type ConnectRematchMessage = {
  type: 'rematch';
  clientId: string;
  restartMatch: boolean;
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
  | ConnectInputMessage
  | ConnectSnapshotMessage
  | ConnectRoundEventMessage
  | ConnectRematchMessage
  | ConnectLeaveMessage;
