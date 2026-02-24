import type { CreateYouMessageInput, ListYouMessagesInput, YouMessage } from './types';

const MESSAGES_PATH = '/api/you/messages';
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const MAX_BODY_LENGTH = 500;
const MAX_NAME_LENGTH = 32;

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type RawRecord = Record<string, unknown>;

export class YouApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'YouApiError';
    this.status = status;
  }
}

const isObject = (value: unknown): value is RawRecord => (
  typeof value === 'object' && value !== null
);

const normalizeBaseUrl = (baseUrl?: string): string => {
  const trimmed = baseUrl?.trim() ?? '';
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const sanitizeLimit = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_LIMIT;
  const rounded = Math.floor(value);
  if (rounded < 1) return 1;
  if (rounded > MAX_LIMIT) return MAX_LIMIT;
  return rounded;
};

const normalizeIso = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const parseMessage = (value: unknown): YouMessage | null => {
  if (!isObject(value)) return null;

  const id = typeof value.id === 'string' ? value.id : '';
  const body = typeof value.body === 'string' ? value.body.trim() : '';
  const createdAtRaw = value.createdAt ?? value.created_at;
  const createdAt = normalizeIso(createdAtRaw);
  if (!id || !body || !createdAt) return null;

  const displayNameRaw = value.displayName ?? value.display_name;
  const displayName = typeof displayNameRaw === 'string'
    ? displayNameRaw.trim().slice(0, MAX_NAME_LENGTH) || null
    : null;

  const anonRaw = value.isAnon ?? value.is_anon;
  const isAnon = typeof anonRaw === 'boolean' ? anonRaw : displayName == null;

  return {
    id,
    body: body.slice(0, MAX_BODY_LENGTH),
    displayName,
    isAnon,
    createdAt,
  };
};

const sortNewestFirst = (messages: YouMessage[]): YouMessage[] => (
  [...messages].sort((a, b) => {
    const diff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
    if (diff !== 0) return diff;
    return b.id.localeCompare(a.id);
  })
);

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = await response.json();
    if (isObject(payload)) {
      if (typeof payload.error === 'string' && payload.error.trim()) return payload.error.trim();
      if (typeof payload.message === 'string' && payload.message.trim()) return payload.message.trim();
    }
  } catch {
    // Ignore JSON parse failures and fall back to status text.
  }
  if (response.statusText) return response.statusText;
  return 'Request failed';
};

const asMessageArray = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (isObject(payload) && Array.isArray(payload.messages)) return payload.messages;
  return [];
};

export const mergeYouMessages = (existing: YouMessage[], incoming: YouMessage[]): YouMessage[] => {
  const byId = new Map<string, YouMessage>();
  for (const message of existing) {
    byId.set(message.id, message);
  }
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return sortNewestFirst([...byId.values()]);
};

export const sanitizeCreateInput = (input: CreateYouMessageInput): CreateYouMessageInput => {
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!body) throw new YouApiError('Message cannot be empty.');
  if (body.length > MAX_BODY_LENGTH) throw new YouApiError(`Message must be ${MAX_BODY_LENGTH} characters or fewer.`);

  const name = typeof input.displayName === 'string' ? input.displayName.trim() : '';
  if (name.length > MAX_NAME_LENGTH) throw new YouApiError(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);

  return {
    body,
    displayName: name || undefined,
  };
};

type CreateMessageOptions = {
  clientKey?: string;
};

export class YouApiClient {
  private baseUrl: string;

  private fetcher: Fetcher;

  constructor(args?: { baseUrl?: string; fetcher?: Fetcher }) {
    this.baseUrl = normalizeBaseUrl(
      args?.baseUrl ?? import.meta.env.VITE_YOU_API_BASE_URL
    );
    this.fetcher = args?.fetcher ?? fetch;
  }

  private buildPath(path: string): string {
    if (!this.baseUrl) return path;
    return `${this.baseUrl}${path}`;
  }

  async listMessages(input?: ListYouMessagesInput): Promise<YouMessage[]> {
    const params = new URLSearchParams();
    params.set('limit', String(sanitizeLimit(input?.limit)));
    const before = normalizeIso(input?.before);
    if (before) params.set('before', before);

    const url = `${this.buildPath(MESSAGES_PATH)}?${params.toString()}`;
    const response = await this.fetcher(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new YouApiError(await readErrorMessage(response), response.status);
    }

    const payload = await response.json();
    const parsed = asMessageArray(payload).map(parseMessage).filter((item): item is YouMessage => item != null);
    return sortNewestFirst(parsed);
  }

  async createMessage(input: CreateYouMessageInput, options?: CreateMessageOptions): Promise<YouMessage> {
    const payload = sanitizeCreateInput(input);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (options?.clientKey) {
      headers['x-you-client-key'] = options.clientKey;
    }

    const response = await this.fetcher(this.buildPath(MESSAGES_PATH), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new YouApiError(await readErrorMessage(response), response.status);
    }

    const raw = await response.json();
    const message = parseMessage(isObject(raw) && raw.message ? raw.message : raw);
    if (!message) {
      throw new YouApiError('Message payload was invalid.', response.status);
    }
    return message;
  }
}

