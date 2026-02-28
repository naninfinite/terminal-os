# YOU.EXE M6 — Basic Persistent Message Board (No Moderation Pass)

## Goal
Ship YOU.EXE in M6 as the first online shared feature with durable backend persistence.

### Locked decisions
- Persistence scope: global persistent backend
- Hosting class: managed backend (Supabase)
- Identity: anonymous by default with optional display name
- Feed model: single global feed
- Update model: polling refresh
- Lifecycle: immutable posts (no edit/delete UI in M6)
- Client never writes board data to localStorage (ephemeral UI state only)

## Primary outcomes
- Users can post a message
- Messages stack in one shared timeline
- Messages persist across refresh, cache clears, and devices

---

## Public Types (frontend)

### YouMessage
- id: string
- body: string
- displayName: string | null
- isAnon: boolean
- createdAt: string (ISO timestamp)

### CreateYouMessageInput
- body: string
- displayName?: string

### ListYouMessagesInput
- before?: string (ISO)
- limit?: number

---

## Backend API (v1)

### GET /api/you/messages?before=<ISO>&limit=<N>
- Returns newest-first page
- Default limit=30, max limit=100
- Response: YouMessage[]

### POST /api/you/messages
- Request body: CreateYouMessageInput
- Response: created YouMessage
- No update/delete endpoints in M6

---

## Validation rules
- body: trimmed, length 1..500
- displayName: optional, trimmed, max 32
- if displayName is blank -> isAnon=true and displayName=null
- if name provided -> isAnon=false and store trimmed displayName

---

## Reliability & Safety baseline (non-moderation)
- Server-side validation (trim + length caps)
- Basic rate limit: 1 post / 8 seconds per client key/IP
- Client-side in-flight submit lock
- Offline / API error state: read/write unavailable without crashing
- No content filtering/mod actions in M6

---

## Polling model
- Poll every 10 seconds while visible
- Panel mode shows as many newest messages as fit in the available panel viewport
- Panel mode auto-loads additional recent pages when a large viewport can display more than the initially loaded batch
- Fullscreen shows full feed + paging (load older)
- Panel and fullscreen share one runtime state

---

## Error handling contract (frontend)
- 400 -> show "message invalid" (body/name length, empty)
- 429 -> show "slow down" (rate limit)
- 5xx / network -> show "service unavailable" + retry UI
