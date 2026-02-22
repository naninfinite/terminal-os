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
- Clicking `ME.EXE` expands that same running instance to fullscreen.
- Closing fullscreen returns to desktop with identical in-session `ME.OS` state visible in panel view.

---

## 2) UX Journey (Target)

1. User enters desktop and sees four panels (`ME`, `YOU`, `THIRD`, `CONNECT`).
2. `ME.EXE` panel already displays a live `ME.OS` mini view.
3. User clicks `ME.EXE`; `ME.OS` expands to fullscreen without reinitializing state.
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
- Windows support corner resize with hover/focus-only handle affordances.
- Current safety lock: top corner handles are temporarily disabled to avoid collisions with window controls (`_` / `X`).
- Backlog follow-up: restore full top-edge/corner resizing with dedicated hitbox separation from header controls.
- Drag and resize updates are clamped so windows remain usable within the ME fullscreen frame.
- Window content areas are constrained to prevent large content overflow from hiding controls.

Viewer-level responsiveness lock:
- Video viewer uses containment-friendly sizing (`height: auto`, bounded by container) so controls remain usable in smaller windows.
- Media containers clip overflow safely, avoiding hidden content spill outside window bounds.

---

## 8.3 M5 Backlog Notes (UX Follow-Ups)

Captured from current review pass (no behavior changes in this doc update):

- Resize affordance preference: move toward standard OS-style edge resizing as primary interaction; keep corner hit areas only when they do not conflict with controls.
- Header/control safety: preserve drag as header-only behavior and avoid hitbox overlap with `_` / `X` controls.
- Launcher discoverability lock (implemented): `FILE / ABOUT / PROJECTS / MEDIA` launcher access now stays visible when windows are open (no longer empty-state-only).
- Launcher placement polish: optional follow-up to refine exact shelf placement without changing launch behavior.
- Panel preview parity: evaluate optional multi-window miniature preview in desktop panel mode; current behavior intentionally shows only the top active window for clarity/perf.
- Task strip model: evaluate panel-aware task grouping. Candidate patterns:
  - Contextual mode: task strip reflects the active panel scope only.
  - Desktop master mode: non-active panel windows collapse into one panel master item (for example `ME.EXE (3)`), with click-to-expand/focus behavior.

Milestone routing:
- Treat these as `M5` polish follow-ups (or `M5.x`) so they stay incremental and styling-safe.

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
