---
name: you-exe-supabase
description: |
  Implement and integrate YOU.EXE M6 persistent message board using Supabase.
  Use when working on YOU.EXE backend API integration, polling feed runtime state,
  schema expectations, env vars, or acceptance tests.
  Do NOT trigger for unrelated apps or general windowing changes.
---

# YOU.EXE Supabase Skill (M6)

## Authority order
1) docs/you-exe/YOU-API-SOURCE-OF-TRUTH.md
2) docs/you-exe/SUPABASE-SETUP-AND-OPS.md
3) existing YOU.EXE code paths in src/
4) project-wide conventions (testing, file structure, commits)

## Scope (M6)
- Replace localStorage message persistence with backend API (read/write)
- Polling every 10s while visible
- Single shared runtime state for panel + fullscreen
- Immutable posts (no edit/delete)
- No moderation tooling in M6

## Hard rules
- Do NOT store messages in localStorage.
- Do NOT add RLS policies that allow anon/public direct table access.
- Keep changes small and testable; prefer one-file or one-concern diffs.

## Required API behaviour
- GET /api/you/messages?before&limit (newest-first)
- POST /api/you/messages (CreateYouMessageInput)
- Handle 400/429/5xx gracefully in UI

## Deliverables (implementation phase)
- A YouApiClient wrapper with:
  - listMessages({ before, limit })
  - createMessage({ body, displayName })
- A shared store/hook for:
  - messages array
  - loading/error state
  - start/stop polling
  - pagination (load older)
- Unit tests for mapping + merge/dedupe
- Manual verification checklist added to docs log

## Acceptance criteria
- Posting + reading shared messages works
- Messages persist across refresh and device
- Panel + fullscreen share runtime state
- No edit/delete controls present
- Build/tests remain green; other apps unchanged