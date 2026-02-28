# Frontend integration — YOU.EXE M6

## Non-negotiables
- Messages are sourced from backend only (no localStorage source-of-truth).
- localStorage allowed only for ephemeral UI state:
  - draft text (optional)
  - last poll cursor (optional)

## Environment variables
- VITE_YOU_API_BASE_URL
  - If calling same-origin /api/you/*, leave unset.
  - If calling Supabase directly, set to:
    https://<project-ref>.supabase.co/functions/v1/you

Optional (only if verify_jwt=true):
- VITE_YOU_API_ANON_KEY
  - used to send Authorization/apikey headers from the browser

## URL construction
- baseUrl = import.meta.env.VITE_YOU_API_BASE_URL ?? ""
- listUrl = `${baseUrl}/messages?limit=30` (when baseUrl set)
- or `/api/you/messages?limit=30` (when baseUrl unset and proxy is set up)

## Fetch wrapper requirements
- Centralise fetch logic in one file (YouApiClient).
- Map backend JSON -> YouMessage.
- Deduplicate on merge by id.
- Poll every 10s while visible; stop polling when hidden/unmounted.

## Shared runtime state
- Implement a single in-memory store (hook + module state) used by:
  - panel mode
  - fullscreen mode

## UX behaviour
- Panel preview shows as many newest messages as fit in the available panel viewport.
- Panel preview auto-loads additional recent pages when a large viewport can display more than the initially loaded batch.
- Fullscreen can page older using before=<oldest createdAt>.

## Testing targets
Unit:
- input sanitisation (trim; length caps)
- response mapping
- poll merge dedupe

Integration (mocked fetch):
- POST then GET returns persisted
- polling appends new messages without duplicates
- pagination stable
