# Terminal-OS Overview

Start here:
- `docs/README.md` (documentation hub)
- `docs/timeline.md` (chronological narrative)

Phases:
- Phase 0: Landing page (video background + ENTER overlay + fade)
- Phase 1: Skeleton app layout (panels + status bar)
- Phase 2: Panel content placeholders (ME, YOU, THIRD, CONNECT)
- Phase 3+: Usability, archive, and extras

Current Status:
- Phase 0 implemented. Replace assets in `public/assets/` as needed.
- Phase 1 skeleton implemented (App shell, Desktop layout, StatusBar, scanlines overlay).
- Phase 2 implemented: panel placeholders and core behaviors. See `docs/phase-2.md` for details.
- ME.EXE world-hub recovery baseline implemented: curated 5-item desktop stack, stronger shell hierarchy, `Start Here` hub content, richer project/media payoff, and updated shell/VFS migrations.
- CONNECT.EXE now runs a shared 4-seat Tron runtime with mixed local/online/CPU lobbies and Supabase Realtime multiplayer.

Recent updates:
- Implemented custom retro green mouse cursor with larger-on-hover behavior; hidden on touch devices; respects `prefers-reduced-motion`.
- Fixed landing page responsive video box sizing and enter transition cleanup.
- Added cross-surface mobile/tablet hardening (shell, status bar, ME shell, folder windows, viewers, YOU, CONNECT) with shared breakpoints and safe-area-aware fullscreen/status behavior.
- Rebuilt `ME.EXE` around a Finder-style desktop metaphor while keeping Terminal-OS styling.
- Shifted the desktop shell to a hero-plus-rail composition so `ME.EXE` reads as the world hub instead of one equal tile among four.
- Reframed `THIRD.EXE` panel mode as a clean scene preview and simplified fullscreen utility tabs to `SCENE`, `OBJECT`, and `CAMERA`.
- Replaced the static CONNECT placeholder with canvas-rendered Tron, 2P/4P quick match, custom seat lobbies, and deterministic CPU play.

Assets:
- `landing-bg.mp4` (looping)
- `landing-poster.jpg` (fallback)
- `me.png` (ME panel image)

---

## Direction Update (2026-03-06)

- `ME.EXE` now runs as a live miniature `ME.OS` inside the panel and expands to fullscreen without resetting state.
- Desktop behavior is world-hub-first:
  - desktop icons are now `Start Here`, `Projects`, `Media`, `About`, and `Contact`;
  - `Home` and `Archive` remain canonical folders in the VFS, but no longer occupy desktop icon slots;
  - `Start Here` opens the canonical `README.txt` node as the orientation hub for the shell.
- Global status bar remains fixed at the bottom.
- One Start-like menu button remains context-aware by active scope.
- `THIRD.EXE` panel mode is preview-first; fullscreen carries the fuller scene-lab controls.
- `CONNECT.EXE` now uses a four-seat runtime, mixed seat lobbies, and continuous light-cycle rendering instead of filled trail blocks.

Related docs:
- `docs/phase-3.md`
- `docs/adr/README.md`
- `docs/conversation-log.md`
- `docs/me-exe-finder-reset-spec.md`
- `docs/fileman-v2-build-spec.md`
- `docs/me-exe-evolution-plan.md`
- `docs/responsive-mobile-tablet-baseline.md`
- `docs/subsystem-expansion-roadmap.md`
