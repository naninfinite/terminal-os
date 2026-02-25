# Terminal-OS Overview

Phases:
- Phase 0: Landing page (video background + ENTER overlay + fade)
- Phase 1: Skeleton app layout (panels + status bar)
- Phase 2: Panel content placeholders (ME, YOU, THIRD, CONNECT)
- Phase 3+: Usability, archive, and extras

Current Status:
- Phase 0 implemented. Replace assets in `public/assets/` as needed.
- Phase 1 skeleton implemented (App shell, Desktop layout, StatusBar, scanlines overlay).
- Phase 2 implemented: panel placeholders and core behaviors. See `docs/phase-2.md` for details.

Recent updates:
- Implemented custom retro green mouse cursor with larger-on-hover behavior; hidden on touch devices; respects `prefers-reduced-motion`.
- Fixed landing page responsive video box sizing and enter transition cleanup.
- Added cross-surface mobile/tablet hardening (shell, status bar, ME shell, YOU, FileMan, viewers, CONNECT) with shared breakpoints and safe-area-aware fullscreen/status behavior.

Assets:
- `landing-bg.mp4` (looping)
- `landing-poster.jpg` (fallback)
- `me.png` (ME panel image)

---

## Direction Update (2026-02-08)

- `ME.EXE` is now intended to evolve into `ME.OS`: a portfolio-focused pseudo OS.
- Desktop behavior target:
- `ME.OS` is visible in miniature inside the `ME.EXE` panel.
- Clicking `ME.EXE` expands the same live instance to fullscreen.
- Returning to desktop keeps the same live state visible in the panel.
- Global status bar remains fixed at the bottom.
- Menu behavior target:
- One Start-like menu button with context-aware entries by active scope.
- Desktop scope: core panels/system actions.
- `ME.OS` scope: portfolio/file manager/viewer actions.
- Other scopes (for example `THIRD`): domain-specific actions.
- Implementation status:
- M1 shell foundation is now implemented (shared `ME.OS` state, panel preview, fullscreen expansion, persisted shell windows).
- M2 VFS foundation is now implemented (versioned VFS service, seed/reset/migration, unit tests).
- M3 FileMan is now implemented (FileMan window app, list/grid views, navigation/actions, viewer launch routing).

Related docs:
- `docs/phase-3.md`
- `docs/ADR Index`
- `docs/conversation-log.md`
- `docs/fileman-v2-build-spec.md`
- `docs/me-exe-evolution-plan.md`
- `docs/responsive-mobile-tablet-baseline.md`
- `docs/subsystem-expansion-roadmap.md`
