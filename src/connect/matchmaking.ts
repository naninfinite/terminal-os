import type {
  ConnectMatchOffer,
  ConnectQueuePresence,
  TronPlayerId,
  TronQuickMatchSize,
} from './types';

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PLAYER_IDS: TronPlayerId[] = ['p1', 'p2', 'p3', 'p4'];

export const normalizeRoomCode = (value: string): string => (
  value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
);

export const isValidRoomCode = (value: string): boolean => normalizeRoomCode(value).length === 6;

const comparePresence = (left: ConnectQueuePresence, right: ConnectQueuePresence): number => {
  const timeDiff = Date.parse(left.joinedAt) - Date.parse(right.joinedAt);
  if (timeDiff !== 0) return timeDiff;
  return left.clientId.localeCompare(right.clientId);
};

export const sortQueuePresence = (presence: ConnectQueuePresence[]): ConnectQueuePresence[] => (
  [...presence].sort(comparePresence)
);

export const createSeatAssignments = (selectedClientIds: string[]): Record<string, TronPlayerId> => {
  const assignments: Record<string, TronPlayerId> = {};
  selectedClientIds.forEach((clientId, index) => {
    const playerId = PLAYER_IDS[index];
    if (!playerId) return;
    assignments[clientId] = playerId;
  });
  return assignments;
};

export const pickQuickMatchGroup = (
  presence: ConnectQueuePresence[],
  desiredPlayers: TronQuickMatchSize,
): {
  hostClientId: string;
  selectedClientIds: string[];
  queueSize: TronQuickMatchSize;
  seatAssignments: Record<string, TronPlayerId>;
} | null => {
  const matching = sortQueuePresence(presence)
    .filter((entry) => entry.desiredPlayers === desiredPlayers)
    .slice(0, desiredPlayers);
  if (matching.length < desiredPlayers) return null;
  const selectedClientIds = matching.map((entry) => entry.clientId);
  return {
    hostClientId: selectedClientIds[0]!,
    selectedClientIds,
    queueSize: desiredPlayers,
    seatAssignments: createSeatAssignments(selectedClientIds),
  };
};

export const shouldLeadQuickMatch = (
  clientId: string,
  presence: ConnectQueuePresence[],
  desiredPlayers: TronQuickMatchSize,
): boolean => (
  pickQuickMatchGroup(presence, desiredPlayers)?.hostClientId === clientId
);

const toDeterministicHash = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const createRoomCode = (args: {
  clientId: string;
  nowMs: number;
  salt?: number;
}): string => {
  const hash = toDeterministicHash(`${args.clientId}:${args.nowMs}:${args.salt ?? 0}`);
  let code = '';
  let working = hash;
  for (let index = 0; index < 6; index += 1) {
    code += ROOM_ALPHABET[working % ROOM_ALPHABET.length];
    working = Math.floor(working / ROOM_ALPHABET.length);
  }
  return code;
};

export const createMatchOffer = (args: {
  hostClientId: string;
  roomCode: string;
  queueSize: TronQuickMatchSize;
  selectedClientIds: string[];
  seatAssignments: Record<string, TronPlayerId>;
  createdAt: string;
}): ConnectMatchOffer => {
  const roomCode = normalizeRoomCode(args.roomCode);
  return {
    type: 'match_offer',
    offerId: `${args.hostClientId}:${roomCode}:${args.createdAt}`,
    roomCode,
    queueSize: args.queueSize,
    hostClientId: args.hostClientId,
    selectedClientIds: [...args.selectedClientIds],
    seatAssignments: { ...args.seatAssignments },
    createdAt: args.createdAt,
  };
};

export const isOfferTargetForClient = (offer: ConnectMatchOffer, clientId: string): boolean => (
  offer.selectedClientIds.includes(clientId)
);
