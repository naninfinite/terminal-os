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
- Mobile/tablet responsiveness baseline (shared breakpoints + safe-area handling).
- Automated baseline: Vitest suite + production build checks.

Planned / active direction:
- M6 subsystem parity work for `YOU`, `THIRD`, and `CONNECT` (shared panel/fullscreen runtime quality and depth).

## Phases / iteration method

Phase framing:
- **Phase 2 — Panel placeholders + shell baseline:** established landing flow, desktop layout, panel composition, and global status-bar/menu foundations.
- **Phase 3+ — ME shell expansion:** delivered ME runtime foundations, VFS service boundaries, FileMan, viewers, and ongoing hardening work.
- **M6 track — Subsystem parity (`YOU` / `THIRD` / `CONNECT`):** align non-ME subsystems to shared panel/fullscreen runtime contracts.

Current milestone status:
- **M1 — ME shell foundation (Complete):** shared ME state between panel/fullscreen with window lifecycle behavior (focus, move/resize, minimize/maximize, restore).
- **M2 — VFS foundation (Complete):** versioned filesystem service + provider boundary so persistence/state ownership is service-managed.
- **M3 — FileMan baseline (Complete):** explorer navigation, list/grid views, create/rename/delete/reset actions, and shell integration.
- **M4 — Viewer baseline (Complete):** viewer windows for `text`, `image`, `video`, and `project` content.
- **M5 — ME shell polish closeout (Complete):** launcher/task-strip behavior, chrome polish, edge-to-edge framing, and responsive hardening.
- **M6 — Subsystem parity (In progress / planned):** expand `YOU`, `THIRD`, and `CONNECT` to match ME-level runtime consistency and readiness.

Iteration method:
- **Small, reviewable diffs:** one concern per commit/PR.
- **Docs updated with code:** behavior/contract shifts must be documented in the same change cycle.
- **Quality gate stays green:** `pnpm test` + `pnpm build` before merge.
- **Authority order for conflicts:** code -> docs -> ADRs.

## Dev workflow

Install and run:
```bash
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm preview
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
- Never commit secrets. Service-role credentials must stay only in Supabase Edge Function secrets/runtime.

## YOU.EXE persistence (high level)

- Frontend client reads/writes via Supabase Edge Function `you` at function root (`GET /`, `POST /`).
- Current deployment runs with JWT verify disabled (no frontend `Authorization`/`apikey` requirement).
- Client sends `x-you-client-key` on post requests; backend uses it for rate-limit identity and can fall back to IP/UA.
- CORS must allow dev origins (`localhost`) and production domains, and include required headers (`content-type`, `x-you-client-key`, optionally `accept`).

## References

- `docs/overview.md`
- `docs/phase-2.md`
- `docs/fileman-v2-build-spec.md`
- `docs/me-exe-evolution-plan.md`
- `docs/responsive-mobile-tablet-baseline.md`
- `docs/you-api-v1.md`
