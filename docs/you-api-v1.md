# YOU API v1 (`/api/you/messages`)

Status: Contract + backend setup reference  
Date: 2026-02-24

## 1) Endpoints

1. `GET /api/you/messages?before=<ISO>&limit=<N>`
- Returns newest-first messages.
- Default `limit=30`, max `limit=100`.
- `before` is an exclusive timestamp cursor for older-page fetches.

2. `POST /api/you/messages`
- Request body:
  - `body: string` (required, trimmed, `1..500`)
  - `displayName?: string` (optional, trimmed, `<=32`)
- Response:
  - Created message payload in `YouMessage` shape.

No update/delete endpoints in M6.

## 2) Message Shape

```json
{
  "id": "uuid",
  "body": "hello world",
  "displayName": "optional name",
  "isAnon": false,
  "createdAt": "2026-02-24T12:00:00.000Z"
}
```

## 3) Database Schema (Postgres)

```sql
create table if not exists you_messages (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 500),
  display_name text null check (char_length(display_name) <= 32),
  is_anon boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists you_messages_created_at_desc_idx
  on you_messages (created_at desc);
```

## 4) Baseline API Rules

1. Input validation must run server-side (never client-only).
2. If `display_name` is blank/null then `is_anon=true`.
3. Responses should normalize casing to camelCase for client simplicity.
4. Rate limit baseline for M6:
- 1 post per 8 seconds per IP or client key.
5. Messages are immutable in M6 (no edit/delete).

## 5) Frontend Integration Notes

1. Frontend client is implemented in `src/you/service.ts`.
2. Runtime provider is implemented in `src/you/YouProvider.tsx`.
3. Configure managed backend host via:

```bash
VITE_YOU_API_BASE_URL=https://your-api-host.example
```

If env is unset, frontend calls same-origin `/api/you/messages`.
