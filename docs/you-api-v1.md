# YOU.EXE API v1 (Supabase Live Contract)

Status: Active (Supabase configured and deployed)  
Date: 2026-02-25

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
  - `GET /`
  - `POST /`
- Deployed URL shape:
  - `https://<project-ref>.supabase.co/functions/v1/you`

## 3) Frontend contract

Frontend API client lives in `src/you/service.ts`.

### URL behavior

1. If `VITE_YOU_API_BASE_URL` is set:
- Request `${base}` with query params for list (`limit`, `before`) or JSON body for create.

2. If `VITE_YOU_API_BASE_URL` is not set:
- Request `/api/you` (future same-origin proxy path)

### Auth mode (current)

- Edge Function `verify_jwt` is currently disabled.
- Frontend does not send `Authorization` / `apikey` headers in current mode.

## 4) Endpoint contract

### GET `/?before=<ISO>&limit=<N>`

- Returns newest-first feed.
- Default `limit=30`, max `limit=100`.
- `before` is exclusive cursor for loading older messages.

### POST `/`

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

## 6) CORS contract

- Allow origins: localhost dev origin(s) and production domain(s).
- Allow methods: `GET`, `POST`, `OPTIONS`.
- Allow headers must include:
  - `content-type`
  - `x-you-client-key`
  - `accept` (if used by clients)
- `OPTIONS` preflight is handled by the Edge Function.

## 7) Validation and rate limit rules

1. Validation runs server-side and client-side.
2. `body`: trimmed length `1..500`.
3. `displayName`: optional, trimmed, max `32`.
4. Empty/blank name is stored as anon (`isAnon=true`, `displayName=null`).
5. Rate limit baseline uses `you_allow_post(p_client_key text)`.
6. `clientKey` is read from `x-you-client-key` when present; server may fall back to IP/UA identity.
7. Posts are immutable in M6.

## 8) Smoke test references

GET:

```bash
curl -i "https://<project-ref>.supabase.co/functions/v1/you?limit=5"
```

POST:

```bash
curl -i "https://<project-ref>.supabase.co/functions/v1/you" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "x-you-client-key: local-dev-client" \
  --data '{"body":"hello","displayName":"nan"}'
```
