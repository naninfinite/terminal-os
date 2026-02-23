# FileMan v2 Build Spec

Status: Draft for implementation
Date: 2026-02-08
Owner: Terminal-OS
Related: `docs/overview.md`, `docs/phase-3.md`, `docs/ADR Index`, `docs/conversation-log.md`
Milestone status: M1 complete, M2 complete, M3 complete, M4 complete, M5 in progress (iterative polish)

---

## 1) Product Intent

`ME.EXE` evolves from a static panel into `ME.OS`, a portfolio-focused pseudo OS:
- Desktop always shows a live miniature `ME.OS` inside the `ME.EXE` panel.
- Background double-gesture inside `ME.EXE` panel (desktop double-click / touch double-tap) expands that same running instance to fullscreen.
- Closing fullscreen returns to desktop with identical in-session `ME.OS` state visible in panel view.

---

## 2) UX Journey (Target)

1. User enters desktop and sees four panels (`ME`, `YOU`, `THIRD`, `CONNECT`).
2. `ME.EXE` panel already displays a live `ME.OS` mini view.
3. User interacts directly with windows/launchers in panel mode, then double-clicks the panel background (or double-taps on touch) to enter fullscreen without reinitializing state.
4. User browses folders/files in FileMan v2 and opens content windows (images, videos, text, projects).
5. User exits fullscreen; the same `ME.OS` state remains visible in the panel.
6. User can reopen and continue exactly where they left off.

---

## 3) What Went Wrong Before (Phase 3 Lessons)

1. Window restore mismatch:
- Persisted window metadata but restored placeholder content, causing state confusion after reload.

2. UI-owned persistence:
- File browser mutated in-component filesystem state and wrote localStorage directly.
- This blurred boundaries and made behavior brittle.

3. Overloaded `ME.EXE` responsibility:
- Launcher, routing, and data ownership were too coupled, reducing maintainability.

4. Inconsistent service boundary:
- Earlier ADR intent said services should own persistence; old implementation leaked storage logic into app UI.

Implementation rule:
- `FileMan v2` and viewers consume services only; they do not own persistence.

---

## 4) Scope and Non-Goals

In scope:
- Live embedded `ME.OS` + fullscreen expansion from same instance.
- `FileMan v2` explorer with path controls and context actions.
- Viewer windows for portfolio content.
- Context-aware Start-like menu.
- Bottom global status bar remains visible.

Not in scope (v2 initial milestone):
- Multi-user permissions model.
- Cloud sync.
- Complex drag-and-drop desktop behaviors.
- Full shell parity for all non-`ME` subsystems.

---

## 5) Architecture

## 5.1 Runtime Layers

1. `ME.OS Shell`
- Manages internal windows, focus, z-order, minimization, maximize behavior.
- Exposes `displayMode: panel | fullscreen` for render profile tuning.

2. `VFS Service`
- Single source of truth for file/folder state.
- Handles persistence, migrations, reset, and deterministic seed overlay.

3. `FileMan v2`
- Pure UI explorer app consuming VFS and shell actions.
- No direct storage access.

4. `Viewer Apps`
- Image viewer, video viewer, text/markdown/project viewers.
- Opened via shell window APIs from file actions.

## 5.2 State Ownership

- Shell state: owned by `ME.OS Shell` service/store.
- Filesystem state: owned by `VFS Service`.
- View state (selection, pane widths, sort mode): UI-local and disposable.
- Persisted state: only through service layer.

---

## 6) Data and Persistence Model

Storage keys (proposal):
- `terminalOS.meos.v1.shell`
- `terminalOS.meos.v1.vfs`

Constraints:
- Versioned schema.
- Namespaced keys (no generic/global keys).
- Deterministic seed + migration path from older keys if needed.
- No `localStorage.clear()` usage for reset.
- Reset only clears owned keys and reseeds.

---

## 7) FileMan v2 Feature Contract

Navigation:
- Path input with absolute/relative navigation.
- `Back`, `Forward`, `Up`.
- Quick access sidebar (`Home`, `Projects`, `Media`, `About`, `Contact`, `Archive`).

Directory interactions:
- Single select + multi-select (future switchable).
- Double-click to open.
- Context menu actions: `Open`, `Rename`, `Delete`, `Properties`.

Keyboard baseline:
- `Enter` open.
- `F2` rename.
- `Delete` remove (with confirm rules where needed).
- Arrow traversal for list/grid.

Window behaviors:
- Opened files/folders should focus existing window when one already exists for same target.
- Restores must rehydrate real app/window content.

---

## 8) Menu Model

One global Start-like button in bottom status bar.

Menu contents change by active scope:
- Desktop scope: app entry points and system actions.
- `ME.OS` scope: portfolio/fileman/viewer actions.
- Other scopes (for example `THIRD`): domain-specific actions.

Rule:
- Shared menu component + scope configs.
- Avoid bespoke menu logic per app.

Current lock (2026-02 incremental pass):
- `HOME.EXE` launch command removed from menu scope configs.
- File app command id normalized from `open_fileman` to `open_file`.
- Active ME menu app set is `FILE`, `PROJECTS`, `MEDIA` plus `EXIT ME.EXE`.

---

## 8.1 Window Spawn Baseline

ME shell spawn behavior now follows a deterministic baseline:
- New windows open with a fixed cascade step.
- Spawn positions are clamped so headers remain visible/reachable on-screen.
- Viewer windows and fixed-app windows use the same cascade/clamp rules.

This baseline now works with the active resize model below.

---

## 8.2 Window Resize + Responsiveness Baseline

ME shell window interactions now include a responsive resize contract:
- Windows support edge-and-corner resize (`N`, `E`, `S`, `W`, `NW`, `NE`, `SW`, `SE`) with hover/focus-only handle affordances.
- Top-edge and top-right resize remain active even near window controls (`_` / `[]` / `X`); no control-safe inset lock is applied.
- Drag start is header-only; window body/content does not initiate drag.
- Drag and resize updates are clamped so windows remain usable within the ME fullscreen frame.
- Per-window maximize/restore is available for all ME windows and is bounded to the ME stage region (below ME header, above ME footer).
- Window content areas are constrained to prevent large content overflow from hiding controls.

Viewer-level responsiveness lock:
- Video viewer uses containment-friendly sizing (`height: auto`, bounded by container) so controls remain usable in smaller windows.
- Media containers clip overflow safely, avoiding hidden content spill outside window bounds.

---

## 8.3 M5 Backlog Notes (UX Follow-Ups)

Captured from recent review passes (implemented locks + remaining follow-ups):

- Resize affordance baseline (implemented): windows support edge-first resize (`N`, `E`, `S`, `W`) plus corner handles.
- Top-edge coverage lock (implemented): resize hitboxes now span full top edge including top-right control zone.
- Header-only drag lock (implemented): drag remains title-bar-only with explicit action-button guard behavior.
- Per-window maximize baseline (implemented): all ME windows expose `[]` maximize/restore, persisted with stage-bounded maximize behavior.
- Launcher discoverability lock (implemented): `FILE / ABOUT / PROJECTS / MEDIA` launcher access now stays visible when windows are open (no longer empty-state-only).
- Launcher placement polish: optional follow-up to refine exact shelf placement without changing launch behavior.
- Panel runtime parity lock (implemented): desktop panel now renders all active non-minimized ME windows with real content (lightweight secondary-preview mode removed).
- Panel interaction lock (implemented): ME windows remain fully interactive in panel mode (drag, resize, minimize, maximize, close).
- Fullscreen-entry lock (implemented): panel enters fullscreen from background-only double gesture so single-click interactions remain available for launchers/windows.
- FileMan toolbar icon polish (implemented): top toolbar actions now use icon + text controls (`BACK/FWD/UP`, `NEW FOLDER/NEW FILE`, `LIST/GRID`, `RESET`) with CSS/ASCII-safe icon primitives and no external asset pipeline.
- Task strip grouping baseline (implemented):
  - `ME.EXE` scope (`meos`): task strip shows individual ME windows.
  - Non-`ME.EXE` scopes: task strip collapses to a single master item (`ME.EXE (n)`).
  - Clicking the master item opens ME fullscreen, where individual task buttons are available.
- Future extension: evaluate panel-owned task grouping for non-ME subsystems (`YOU`, `THIRD`, `CONNECT`) as they gain internal window runtimes.
- Status bar right-cluster location baseline (implemented): renders live `location | time` with geolocation coordinates when available.
- Fallback behavior: when geolocation is unavailable/denied, location token falls back to timezone-derived label (`TZ <City>`).
- Fullscreen footer status token (implemented): window count only (`0 WINDOWS`, `1 WINDOW`, `N WINDOWS`).
- Future decision gate: re-evaluate whether footer status token should remain or be removed once desktop semantics are finalized.
- Status language collision (resolved): `SYS: READY` remains the sole readiness token; ME footer now reports window count only.
- Deferred M5.x visual polish: update maximize control glyph from `[]` to a square-styled icon treatment without changing current interaction behavior.
- ME shell-density polish (implemented): edge-to-edge ME framing is now active in panel and fullscreen by removing outer ME wrapper inset/padding while preserving internal window/content padding.

Milestone routing:
- Treat these as `M5` polish follow-ups (or `M5.x`) so they stay incremental and styling-safe.

---

## 8.4 Theme System v1 (Shell-First)

Theme runtime is now a core-shell concern, not app-local styling:

- Theme modes: `auto`, `dark`, `light`.
- Default mode: `auto` (follow system preference).
- Storage key: `terminalOS.ui.v1.theme`.
- Override rule: manual selection persists until changed.
- Dark parity rule: dark must stay visually aligned with current Terminal-OS baseline.
- Light rule: strict monochrome shell with reduced CRT/cursor intensity.
- Casing rule: dark uses uppercase baseline; light allows mixed/lower text.

v1 rollout scope (implemented first):
- Global shell surfaces and panel chrome.
- Status bar + menu shell controls.
- ME shell chrome and shared panel/window framing.

Deferred to follow-up pass:
- Deep app-interior parity (`FileMan` internals, viewers, and subsystem-specific app surfaces) unless targeted fixes are required for readability/regression.

---

## 9) Performance Profile

Panel mode (`ME.OS` embedded in `ME.EXE`):
- Minimize expensive animations/effects.
- Pause non-essential autoplay media.
- Reduce heavy visual effects and redraw pressure.

Fullscreen mode:
- Enable full interaction fidelity and effects.

Goal:
- Keep desktop responsive while preserving the “live mini OS” illusion.

---

## 10) Module Boundary Proposal

Suggested modules:
- `src/meos/shell/*`
- `src/meos/vfs/*`
- `src/meos/apps/fileman/*`
- `src/meos/apps/viewers/*`
- `src/meos/menu/*`

Integration points:
- Desktop `ME.EXE` panel renders `ME.OS` in `panel` mode.
- Fullscreen overlay renders same `ME.OS` store instance in `fullscreen` mode.

---

## 11) Milestones

M1 - Shell foundation
- Shared `ME.OS` instance lifecycle.
- Panel/fullscreen mode switching.
- Basic internal window manager with persistence.

M2 - VFS service
- Versioned schema.
- CRUD operations + reset + seed load.
- Unit tests for logic and migration behavior.

M3 - FileMan v2
- Navigation controls, list/grid rendering, context actions.
- Integration with VFS events and shell window opening.

M4 - Portfolio viewers
- Image/video/text/project viewers.
- Existing-window focus/reuse behavior.

M5 - Menu + polish
- Context-aware menu configs.
- Performance tuning for panel mode.
- Keyboard and accessibility pass.

---

## 12) Acceptance Criteria

1. `ME.OS` state is shared between panel and fullscreen modes.
2. Returning from fullscreen preserves exact open-window state.
3. `FileMan v2` does not write localStorage directly.
4. Window restore never uses placeholder content for persisted windows.
5. Reset only affects owned `ME.OS` keys and reseeds deterministically.
6. Menu options correctly adapt to active scope.

---

## 13) Documentation Maintenance Rule

When implementation changes this spec:
- Update this file in the same PR.
- Add a short entry to `docs/conversation-log.md`.
- If behavior-level change: reflect in `docs/phase-3.md` and `docs/ADR Index`.

---

## 14) Future Panel Expansion Context

Future subsystem parity notes for `YOU`, `THIRD`, and `CONNECT` are captured in:

- `docs/subsystem-expansion-roadmap.md`

Use that roadmap as directional context when expanding non-ME panels to shared panel/fullscreen runtime behavior.

---

## 15) Styling and Iteration Guardrail

For ME.EXE evolution guardrails (styling baseline + micro-iteration policy), see:

- `docs/me-exe-evolution-plan.md`

This build spec assumes that document is the visual/process constraint source of truth for future ME.EXE UX passes.
