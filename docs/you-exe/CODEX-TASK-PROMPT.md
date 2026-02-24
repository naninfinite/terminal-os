You are working in the Terminal-OS repo.

We have already started the YOU.EXE backend: Supabase project exists with tables:
- you_messages
- you_rate_limits
and RPC function you_allow_post. Edge Function exists as `you` exposing /messages GET+POST.

Your job is FRONTEND integration only (no new backend work unless required):
1) Replace YOU.EXE localStorage board persistence with backend API calls per docs/you-exe/YOU-API-SOURCE-OF-TRUTH.md.
2) Create a small YouApiClient module that:
   - uses VITE_YOU_API_BASE_URL when set (Supabase direct), otherwise uses same-origin /api/you/messages (future proxy).
   - if VITE_YOU_API_ANON_KEY is set, include Authorization/apikey headers; otherwise do not.
3) Implement a single shared runtime state (store/hook) used by panel + fullscreen:
   - poll every 10s while visible
   - preview latest 5 in panel
   - full feed in fullscreen with paging (before=<oldest createdAt>)
   - merge/dedupe by id
4) Error handling:
   - 400 invalid input message
   - 429 rate limit message
   - network/5xx non-breaking “service unavailable” state
5) Tests:
   - mapping backend JSON -> YouMessage
   - merge/dedupe logic
   - createMessage blocks empty/whitespace and max length on client side too

Constraints:
- Do not store messages in localStorage (draft-only allowed).
- Do not change windowing/taskbar/other apps.
- Keep diffs small and provide a short manual test checklist in docs/you-exe/FRONTEND-INTEGRATION-NOTES.md.

Start by locating current YOU.EXE component + storage helper usage and propose a minimal file plan, then implement in small commits.