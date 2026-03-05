# TERMINAL-OS

Terminal-OS is an OS-like retro UI built with React, Vite, TypeScript, and SCSS modules.  
It combines panel-based desktop navigation with a persistent ME shell (`ME.EXE`) and subsystem apps (`YOU`, `THIRD`, `CONNECT`).

## Project status

Implemented now:
- Landing flow with keyboard/click enter transition.
- Desktop shell with panel grid, status bar, and scope-aware menu/task behavior.
- ME runtime foundation: windowing, focus/z-order, minimize/maximize, fullscreen layer.
- FileMan + viewer apps inside ME (`text`, `image`, `video`, `project`).
- `YOU.EXE` persistent message board backed by Supabase Edge Function.
- `THIRD.EXE` object-mode playground baseline (primitives, edit/play modes, physics grab, local autosave).
- `CONNECT.EXE` Tron V1 with shared panel/fullscreen runtime, CPU opponent, quick match, and room-code multiplayer over Supabase Realtime.
- Permanent subsystem dock navbar (`ME`, `YOU`, `THIRD`, `CONNECT`) with fullscreen/focus routing.
- `YOU.EXE` dock indicator with session-only draft/unread signals.
- Unified right-click / long-press context menus for subsystem dock + desktop panel roots (V1 scope).
- Mobile/tablet responsiveness baseline (shared breakpoints + safe-area handling).
- Automated baseline: Vitest suite + production build checks.

Planned / active direction:
- M6 subsystem parity work for `YOU`, `THIRD`, and `CONNECT` (shared panel/fullscreen runtime quality and depth).

## Phases / iteration method

### 1) Core intent

Terminal-OS evolves in small, system-safe steps. The goal is an OS-like runtime where shell behavior stays coherent while subsystems (`ME`, `YOU`, `THIRD`, `CONNECT`) gain depth without one-shot rewrites.

### 2) Phase / milestone definition (plain English)

- **Phase 2 — Panel placeholders + shell baseline:** established landing flow, desktop layout, panel composition, and global status-bar/menu foundations.
- **Phase 3+ — ME shell expansion:** delivered and hardened ME runtime foundations, VFS boundaries, FileMan, and viewers.
- **M6 track — Subsystem parity:** align `YOU`, `THIRD`, and `CONNECT` with shared panel/fullscreen runtime contracts used by ME.

### 3) Current milestone status

- **M1 — ME shell foundation (Complete):** shared ME state between panel/fullscreen with core window lifecycle behavior.
- **M2 — VFS foundation (Complete):** versioned filesystem service + provider boundary with service-owned persistence.
- **M3 — FileMan baseline (Complete):** explorer navigation, list/grid, create/rename/delete/reset actions, and shell integration.
- **M4 — Viewer baseline (Complete):** viewer windows for `text`, `image`, `video`, and `project` content.
- **M5 — ME shell polish closeout (Complete):** launcher/task-strip behavior, chrome polish, edge-to-edge framing, and responsive hardening.
- **M6 — Subsystem parity (In progress / planned):** expand `YOU`, `THIRD`, and `CONNECT` toward ME-level runtime consistency/readiness.

### 4) Iteration method

- **Small, reviewable diffs:** one concern per commit/PR.
- **Docs with code:** behavior/contract shifts are documented in the same change cycle.
- **Green baseline required:** `npm test` and `npm run build` before merge.
- **Decision authority order:** code -> docs -> ADRs -> logs.

## Dev workflow

Install and run:
```bash
npm install
npm run dev
npm test
npm run build
npm run preview
```

Vite server baseline is configured in `vite.config.ts`:
- `server.host: true`
- `server.port: 5173`
- `server.strictPort: true`

## Environment

- Use `.env.local` for local overrides (not committed).
- Use `.env.example` as the committed template.
- `VITE_YOU_API_BASE_URL` should point to the Supabase function root:
  - `https://<project-ref>.supabase.co/functions/v1/you`
- `VITE_CONNECT_SUPABASE_URL` should point to the Supabase project root:
  - `https://<project-ref>.supabase.co`
- `VITE_CONNECT_SUPABASE_ANON_KEY` should be the browser-safe anon/publishable key for that project.
- Never commit secrets. Service-role credentials must stay only in Supabase Edge Function secrets/runtime.

## YOU.EXE persistence (high level)

- Frontend client reads/writes via Supabase Edge Function `you` at function root (`GET /`, `POST /`).
- Current deployment runs with JWT verify disabled (no frontend `Authorization`/`apikey` requirement).
- Client sends `x-you-client-key` on post requests; backend uses it for rate-limit identity and can fall back to IP/UA.
- CORS must allow dev origins (`localhost`) and production domains, and include required headers (`content-type`, `x-you-client-key`, optionally `accept`).

## CONNECT.EXE Tron (high level)

- `CONNECT.EXE` uses Supabase Realtime only in v1: queue matchmaking uses presence on `connect:queue:v1`, and matches run on `connect:room:<CODE>:v1`.
- No Postgres schema or Edge Function is required for Tron v1.
- If `VITE_CONNECT_SUPABASE_URL` or `VITE_CONNECT_SUPABASE_ANON_KEY` is missing, CONNECT stays in CPU-only mode and multiplayer buttons remain unavailable.
- Quick Match pairs the oldest two waiting clients; room-code invites let one player host and another join directly.
- Local development: set the two Connect env vars, run `npm install`, then `npm run dev`. Open two tabs to test quick match or room-code flow.

## References

- `docs/README.md`
- `docs/overview.md`
- `docs/timeline.md`
- `docs/adr/README.md`
- `docs/phase-2.md`
- `docs/fileman-v2-build-spec.md`
- `docs/me-exe-evolution-plan.md`
- `docs/responsive-mobile-tablet-baseline.md`
- `docs/you-api-v1.md`
- `docs/connect-exe/CONNECT-TRON-V1.md`
