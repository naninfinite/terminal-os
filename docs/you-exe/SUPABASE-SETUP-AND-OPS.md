# Supabase backend — YOU.EXE M6

## What exists
- Postgres tables:
  - public.you_messages
  - public.you_rate_limits
- RPC function:
  - public.you_allow_post(p_client_key text) returns boolean
- RLS enabled on both tables; no public/anon policies (Edge Function uses service role)

## Edge Function
- Function name: `you`
- Routes inside function:
  - GET  /messages
  - POST /messages
- Deployed endpoint shape:
  - https://<project-ref>.supabase.co/functions/v1/you/messages

## Secrets (Edge Function env)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

## JWT / headers
Preferred for M6:
- verify_jwt = false on the Edge Function
- rely on: server validation + rate limit + CORS allowlist

If verify_jwt remains true:
- client requests must include:
  - Authorization: Bearer <anon-key>
  - apikey: <anon-key>

## CORS allowlist
Allow:
- https://naninfinite.com
- https://www.naninfinite.com
- http://localhost:5173 (dev)

## Smoke tests (curl)
GET:
curl -i "https://<project-ref>.supabase.co/functions/v1/you/messages?limit=5"

POST:
curl -i "https://<project-ref>.supabase.co/functions/v1/you/messages" \
  -H "Content-Type: application/json" \
  --data '{"body":"hello","displayName":"nan"}'

If verify_jwt=true, add:
  -H "Authorization: Bearer <anon-key>" -H "apikey: <anon-key>"

## Rate limit expectations
- Two POSTs within 8 seconds should yield 429 on the second.