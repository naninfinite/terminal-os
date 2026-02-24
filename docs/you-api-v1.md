# YOU.EXE API v1 (Supabase Live Contract)

Status: Active (Supabase configured and deployed)  
Date: 2026-02-24

## 1) Current backend state

Supabase objects already exist in `public` schema:

- `you_messages`
- `you_rate_limits`
- RPC: `you_allow_post(p_client_key text) returns boolean`

Security baseline:

- RLS is enabled on both tables.
- No anon/public table policies are used.
- DB access is performed by Edge Function using service-role credentials.

## 2) Edge Function

- Function name: `you`
- Routes:
  - `GET /messages`
  - `POST /messages`
- Deployed URL shape:
  - `https://<project-ref>.supabase.co/functions/v1/you/messages`

## 3) Frontend contract

Frontend API client lives in `src/you/service.ts`.

### URL behavior

1. If `VITE_YOU_API_BASE_URL` is set:
- Request `${base}/messages`

2. If `VITE_YOU_API_BASE_URL` is not set:
- Request `/api/you/messages` (future same-origin proxy path)

### Optional auth headers

If `VITE_YOU_API_ANON_KEY` is set, send:

- `Authorization: Bearer <anon-key>`
- `apikey: <anon-key>`

If not set, send no auth headers.

## 4) Endpoint contract

### GET `/messages?before=<ISO>&limit=<N>`

- Returns newest-first feed.
- Default `limit=30`, max `limit=100`.
- `before` is exclusive cursor for loading older messages.

### POST `/messages`

Request body:

- `body: string` (trimmed, `1..500`)
- `displayName?: string` (trimmed, `<=32`)

Response:

- Created message in `YouMessage` shape.

No update/delete endpoints in M6.

## 5) Message shape

```json
{
  "id": "uuid",
  "body": "hello world",
  "displayName": "optional name",
  "isAnon": false,
  "createdAt": "2026-02-24T12:00:00.000Z"
}
```

## 6) Validation and rate limit rules

1. Validation runs server-side and client-side.
2. `body`: trimmed length `1..500`.
3. `displayName`: optional, trimmed, max `32`.
4. Empty/blank name is stored as anon (`isAnon=true`, `displayName=null`).
5. Rate limit baseline: 1 post per 8 seconds via `you_allow_post`.
6. Posts are immutable in M6.

## 7) Smoke test references

GET:

```bash
curl -i "https://<project-ref>.supabase.co/functions/v1/you/messages?limit=5"
```

POST:

```bash
curl -i "https://<project-ref>.supabase.co/functions/v1/you/messages" \
  -H "Content-Type: application/json" \
  --data '{"body":"hello","displayName":"nan"}'
```

If `verify_jwt=true`, add:

```bash
-H "Authorization: Bearer <anon-key>" -H "apikey: <anon-key>"
```
