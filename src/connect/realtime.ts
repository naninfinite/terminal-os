import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { ConnectChannelMessage, ConnectQueuePresence } from './types';

export const CONNECT_QUEUE_CHANNEL = 'connect:queue:v1';
export const CONNECT_ROOM_CHANNEL_PREFIX = 'connect:room:';
export const CONNECT_ROOM_CHANNEL_SUFFIX = ':v1';

export const getConnectRoomChannelName = (roomCode: string): string => (
  `${CONNECT_ROOM_CHANNEL_PREFIX}${roomCode}${CONNECT_ROOM_CHANNEL_SUFFIX}`
);

export const createConnectSupabaseClient = (): SupabaseClient | null => {
  const url = import.meta.env.VITE_CONNECT_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_CONNECT_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;

  try {
    return createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 12,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch {
    return null;
  }
};

export const toIsoNow = (): string => new Date().toISOString();

type BroadcastPayload = {
  payload: ConnectChannelMessage;
};

export const sendChannelMessage = async (
  channel: RealtimeChannel,
  payload: ConnectChannelMessage,
): Promise<void> => {
  await channel.send({
    type: 'broadcast',
    event: payload.type,
    payload: { payload } satisfies BroadcastPayload,
  });
};

export const readBroadcastPayload = (value: unknown): ConnectChannelMessage | null => {
  if (!value || typeof value !== 'object') return null;
  const payload = (value as { payload?: unknown }).payload;
  if (!payload || typeof payload !== 'object') return null;
  const typed = (payload as { payload?: unknown }).payload;
  if (!typed || typeof typed !== 'object') return null;
  if (typeof (typed as { type?: unknown }).type !== 'string') return null;
  return typed as ConnectChannelMessage;
};

export const createPresenceChannel = (client: SupabaseClient, name: string, clientId: string): RealtimeChannel => (
  client.channel(name, {
    config: {
      broadcast: {
        ack: true,
      },
      presence: {
        key: clientId,
      },
    },
  })
);

export const flattenPresenceState = (state: Record<string, unknown>): ConnectQueuePresence[] => {
  const entries: ConnectQueuePresence[] = [];

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
