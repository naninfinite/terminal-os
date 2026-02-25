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

Milestone framing:
- Phase 2: panel placeholders and shell baseline.
- Phase 3+: ME shell/VFS/FileMan/viewers hardening and expansion.
- M6: subsystem parity track (`YOU`/`THIRD`/`CONNECT`).

Current milestone status:
- M1: ME shell foundation complete.
- M2: VFS foundation complete.
- M3: FileMan explorer baseline complete.
- M4: Viewer app baseline complete (`text` / `image` / `video` / `project`).
- M5: ME shell polish closeout complete.
- M6: subsystem parity in progress/planned (`YOU` / `THIRD` / `CONNECT`).

Delivery rules:
- Keep diffs small and reviewable.
- One concern per commit/PR.
- Update docs alongside behavior changes.
- Keep tests/build green before merge.
- Authority order for conflicts: code -> docs -> ADRs.

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
