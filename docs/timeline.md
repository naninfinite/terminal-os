# Terminal-OS Timeline (Chronological)

Last updated: 2026-03-06

This is a curated, chronological narrative for quickly reloading context.
It is intentionally higher-level than `docs/conversation-log.md`.

For "current source of truth" contracts, prefer:
- `README.md`
- `docs/overview.md`
- `docs/adr/README.md`

---

## Current state (as of 2026-03-02)

Terminal-OS is a retro OS-like UI with a desktop panel grid and a global status bar.
Subsystems (`ME`, `YOU`, `THIRD`, `CONNECT`) can run in panel mode and expand to fullscreen.

Key baseline claims:

- `ME.EXE` is a live `ME.OS` runtime rendered in both panel + fullscreen without resetting state.
- `ME.OS` uses a persistent, versioned VFS service and deterministic seed/reset behavior.
- `YOU.EXE` is a persistent message board backed by a Supabase Edge Function.
- `THIRD.EXE` is an object-mode three.js playground with shared panel/fullscreen state and local autosave.
- `CONNECT.EXE` is a shared four-seat Tron runtime with CPU fallback and Supabase Realtime multiplayer.

---

## 2026-03-05: CONNECT.EXE Tron V1

What changed:
- Replaced the static CONNECT banner with a deterministic Tron runtime rendered in canvas 2D.
- Added shared panel/fullscreen state, quick match, room-code invites, CPU difficulties, and reconnect/disconnect handling.
- Wired CONNECT into the status-bar menu and subsystem context menu with match-aware actions.

Why it matters:
- Moves CONNECT from placeholder chrome into a real subsystem with the same runtime parity expectations as ME, YOU, and THIRD.
- Establishes the first browser-multiplayer baseline in the repo without introducing a backend schema or Edge Function for v1.

---

## 2026-03-06: CONNECT.EXE Four-Seat Lobby + Visual Rewrite

What changed:
- Generalized CONNECT from a hardcoded two-player game into a four-seat Tron runtime with `p1`..`p4`.
- Added mixed seat lobbies with `local`, `online`, `cpu`, and `closed` seat modes plus per-browser two-human-seat limits.
- Expanded quick match into separate `2P` and `4P` queues and added custom room seat claiming for mixed online/local/cpu matches.
- Reworked the renderer into continuous light-cycle lines with a larger Snake-style board/HUD and reliable window-level keyboard routing.

Why it matters:
- Removes the biggest architectural limit in CONNECT by making local, CPU, and online play use the same seat model.
- Lets the subsystem scale from solo CPU sessions to full four-browser online rounds without introducing a backend schema.

---

## 2025-08-23: Initial Terminal-OS baseline

Source: early commits starting at `befabdb`.

What shipped:
- Landing flow and enter transition.
- Desktop grid with OS panel metaphor.
- Retro cursor + scanlines.
- Early placeholder subsystems and documentation.

Why it matters:
- Established the React/Vite/TypeScript/SCSS baseline that later phases build on.
- Locked the "OS shell + subsystems" mental model early.

---

## 2026-02-04 to 2026-02-05: Responsiveness and surface polish

What changed:
- Mobile/tablet layout hardening across panels and status bar.
- Landing and cursor polish pass.

Why it matters:
- Prevented later subsystem work from breaking mobile and tablet behavior.
- Set the expectation that responsive fixes are part of the core baseline, not a follow-up.

Relevant docs:
- `docs/responsive-mobile-tablet-baseline.md`

---

## 2026-02-08: Phase 3 jump (ME.OS becomes a real subsystem)

Source: the M1–M5 commit cluster on 2026-02-08 (e.g. `8f0f4cf`, `7e0169f`, `b99840f`, `42dc3fc`).

What changed:
- M1: shared `ME.OS` runtime state between `ME.EXE` panel and fullscreen.
- M2: persistent VFS service with schema versioning, deterministic seed, and reset semantics.
- M3–M4: FileMan + viewer baseline (historical UI; architecture contracts remain useful).
- M5: global status bar / scope-aware Start-like menu model + task-strip grouping rules.

Why it matters:
- This is the moment Terminal-OS stopped being "panels with placeholders" and became a real runtime.
- It locked the core boundary rules:
  - shell owns windows and layout,
  - services own persistence and state,
  - apps consume APIs and do not write persistence directly.

Relevant docs:
- `docs/fileman-v2-build-spec.md` (architecture rules, even though the UI is now superseded)
- `docs/adr/README.md`
- `docs/subsystem-expansion-roadmap.md` (M6 program was framed immediately after M5)

---

## 2026-02-13: Windowing hardening and ME shell cleanup

What changed:
- Window spawn cascade and clamp behavior became consistent and responsive.
- Legacy shell/menu traces were removed to reduce drift.

Why it matters:
- Reduced "window feels brittle" issues as more apps started opening windows.
- Helped keep the ME runtime coherent as the UI evolved.

---

## 2026-02-20 to 2026-02-23: Repo hygiene + theme system lock

What changed:
- `.gitignore` added and assets moved to Git LFS pointers.
- Theme system landed (auto/dark/light) and theme-split rules were documented.
- ME panel/fullscreen interactivity and edge-to-edge framing were polished.

Why it matters:
- Reduced repo footguns and made asset management predictable.
- Theme tokens became a real contract rather than ad-hoc styling.

Relevant docs:
- `docs/me-exe-evolution-plan.md` (theme split lock)

---

## 2026-02-24 to 2026-02-25: M6 begins (subsystem parity moves beyond ME)

What changed:
- YOU.EXE:
  - backend-backed message board runtime shipped (Supabase Edge Function).
  - API client + polling state shared across panel + fullscreen.
- Status bar / dock:
  - permanent subsystem dock (`ME`, `YOU`, `THIRD`, `CONNECT`),
  - fullscreen layers for subsystems,
  - scope-aware context menus.
- THIRD.EXE:
  - V1 baseline shipped and then rapidly expanded (edit/play modes, hierarchy, inspector, camera controls).

Why it matters:
- Established the "parity contract" for subsystems: same runtime instance in panel + fullscreen.
- Turned `YOU` and `THIRD` into real subsystems rather than placeholders.

Relevant docs:
- `docs/subsystem-expansion-roadmap.md`
- `docs/you-api-v1.md`
- `docs/third-exe/THIRD-V1-RUNTIME-CONTRACT.md`

---

## 2026-02-26 to 2026-02-28: THIRD polish + boot/loader work

What changed:
- THIRD.EXE got deeper UX polish (camera hotkeys, undo/redo, lock workflow, mobile utility drawer).
- Boot loader and desktop runtime splitting work landed, with a landing-first startup flow.

Why it matters:
- THIRD became a credible V1 "tool" rather than a demo.
- Boot/loader work reduced perceived load jank as the runtime expanded.

---

## 2026-03-01: Finder Reset (ME UX pivots while keeping the architecture)

Source: `c0c064c` and associated docs updates.

What changed:
- The visible ME UX moved away from the FileMan browser surface to a Finder-like desktop:
  - sparse desktop icon lane,
  - minimal folder windows,
  - canonical `Home` documents surfaced as desktop aliases,
  - read-only `Get Info` windows.

Why it matters:
- Preserved the ME shell + VFS boundary rules while changing the user-facing experience.
- Made ME read as "desktop and windows" first, instead of "file browser UI" first.

Relevant docs:
- `docs/me-exe-finder-reset-spec.md`
- `docs/me-exe-evolution-plan.md`
- `docs/fileman-v2-build-spec.md` (historical; architecture contracts still apply)

---

## 2026-03-02: Skills and integration hygiene

What changed:
- Agent skills were updated (repo-local Codex routing and instructions).
- FontAwesome icon boot boundary was added.

Why it matters:
- Reduced drift between how work is done (skills) and how the repo expects changes to be made.
- Made icon usage more predictable (single boot path).
