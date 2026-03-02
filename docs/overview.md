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
- ME.EXE Finder Reset baseline implemented: sparse desktop icon lane, minimal folder windows, richer `About`/`Contact` document surfaces, read-only info windows, and updated shell/VFS migrations.

Recent updates:
- Implemented custom retro green mouse cursor with larger-on-hover behavior; hidden on touch devices; respects `prefers-reduced-motion`.
- Fixed landing page responsive video box sizing and enter transition cleanup.
- Added cross-surface mobile/tablet hardening (shell, status bar, ME shell, folder windows, viewers, YOU, CONNECT) with shared breakpoints and safe-area-aware fullscreen/status behavior.
- Rebuilt `ME.EXE` around a Finder-style desktop metaphor while keeping Terminal-OS styling.

Assets:
- `landing-bg.mp4` (looping)
- `landing-poster.jpg` (fallback)
- `me.png` (ME panel image)

---

## Direction Update (2026-03-01)

- `ME.EXE` now runs as a live miniature `ME.OS` inside the panel and expands to fullscreen without resetting state.
- Desktop behavior is folder/file-first:
  - `Home`, `Projects`, `Media`, and `Archive` open as folder windows.
  - `About`, `Contact`, and `README.txt` live canonically in `Home` and appear on the desktop as aliases.
  - `Get Info` windows expose read-only item metadata, including alias target paths.
- Global status bar remains fixed at the bottom.
- One Start-like menu button remains context-aware by active scope.
- Gallery/video browsing remains a deferred follow-up; current media/project viewers stay in place.

Related docs:
- `docs/phase-3.md`
- `docs/adr/README.md`
- `docs/conversation-log.md`
- `docs/me-exe-finder-reset-spec.md`
- `docs/fileman-v2-build-spec.md`
- `docs/me-exe-evolution-plan.md`
- `docs/responsive-mobile-tablet-baseline.md`
- `docs/subsystem-expansion-roadmap.md`
