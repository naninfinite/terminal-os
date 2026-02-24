import { describe, expect, it } from 'vitest';
import { YouApiClient, mergeYouMessages, sanitizeCreateInput } from './service';
import type { YouMessage } from './types';

describe('YOU service', () => {
  it('sanitizes create input and rejects invalid payloads', () => {
    expect(sanitizeCreateInput({ body: '  hello world  ' })).toEqual({ body: 'hello world', displayName: undefined });
    expect(sanitizeCreateInput({ body: 'ok', displayName: '  nano  ' })).toEqual({ body: 'ok', displayName: 'nano' });
    expect(() => sanitizeCreateInput({ body: '   ' })).toThrowError('Message cannot be empty.');
    expect(() => sanitizeCreateInput({ body: 'x', displayName: 'a'.repeat(33) })).toThrowError('Name must be 32 characters or fewer.');
  });

  it('maps API responses to valid YouMessage records', async () => {
    const client = new YouApiClient({
      baseUrl: 'https://example.test',
      fetcher: async () => new Response(JSON.stringify({
        messages: [
          {
            id: 'm_2',
            body: 'second',
            display_name: null,
            is_anon: true,
            created_at: '2026-02-24T10:02:00.000Z',
          },
          {
            id: 'm_1',
            body: 'first',
            display_name: 'neo',
            is_anon: false,
            created_at: '2026-02-24T10:01:00.000Z',
          },
        ],
      }), { status: 200 }),
    });

    const messages = await client.listMessages({ limit: 30 });
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject<Partial<YouMessage>>({
      id: 'm_2',
      isAnon: true,
      displayName: null,
      body: 'second',
    });
    expect(messages[1]).toMatchObject<Partial<YouMessage>>({
      id: 'm_1',
      isAnon: false,
      displayName: 'neo',
      body: 'first',
    });
  });

  it('merges polling batches without duplicates', () => {
    const existing: YouMessage[] = [
      {
        id: 'm_2',
        body: 'existing second',
        displayName: null,
        isAnon: true,
        createdAt: '2026-02-24T10:02:00.000Z',
      },
      {
        id: 'm_1',
        body: 'existing first',
        displayName: 'neo',
        isAnon: false,
        createdAt: '2026-02-24T10:01:00.000Z',
      },
    ];
    const incoming: YouMessage[] = [
      {
        id: 'm_3',
        body: 'new third',
        displayName: null,
        isAnon: true,
        createdAt: '2026-02-24T10:03:00.000Z',
      },
      {
        id: 'm_2',
        body: 'existing second',
        displayName: null,
        isAnon: true,
        createdAt: '2026-02-24T10:02:00.000Z',
      },
    ];

    const merged = mergeYouMessages(existing, incoming);
    expect(merged.map((message) => message.id)).toEqual(['m_3', 'm_2', 'm_1']);
  });
});

