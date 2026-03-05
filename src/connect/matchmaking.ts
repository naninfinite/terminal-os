import type { ConnectMatchOffer, ConnectQueuePresence } from './types';

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

export const shouldLeadQuickMatch = (clientId: string, presence: ConnectQueuePresence[]): boolean => (
  sortQueuePresence(presence)[0]?.clientId === clientId
);

export const pickQuickMatchPair = (
  presence: ConnectQueuePresence[],
): { hostClientId: string; guestClientId: string } | null => {
  const [host, guest] = sortQueuePresence(presence);
  if (!host || !guest) return null;
  return {
    hostClientId: host.clientId,
    guestClientId: guest.clientId,
  };
};

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
  guestClientId: string;
  roomCode: string;
  createdAt: string;
}): ConnectMatchOffer => {
  const roomCode = normalizeRoomCode(args.roomCode);
  return {
    type: 'match_offer',
    offerId: `${args.hostClientId}:${args.guestClientId}:${roomCode}:${args.createdAt}`,
    roomCode,
    hostClientId: args.hostClientId,
    guestClientId: args.guestClientId,
    createdAt: args.createdAt,
  };
};

export const isOfferTargetForClient = (offer: ConnectMatchOffer, clientId: string): boolean => (
  offer.hostClientId === clientId || offer.guestClientId === clientId
);
