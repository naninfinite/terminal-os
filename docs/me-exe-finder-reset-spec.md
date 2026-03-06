# ME.EXE Finder Reset Spec

Status: Implemented baseline
Date: 2026-03-05
Owner: Terminal-OS
Related: `docs/me-exe-evolution-plan.md`, `docs/fileman-v2-build-spec.md`, `docs/overview.md`, `docs/conversation-log.md`

---

## 1) Summary

`ME.EXE` now centers on a sparse desktop-and-window metaphor with a clearer world-hub payoff instead of the older centered launcher shelf. The active implementation uses a curated desktop icon lane, minimal folder windows, a `Start Here` hub alias backed by canonical `README.txt`, richer project/media surfaces, and read-only `Get Info` windows.

---

## 2) Scope

In scope:
- Sparse desktop icon lane in panel and fullscreen.
- Folder/file-first interaction model.
- Minimal folder windows in place of visible FileMan authoring chrome.
- Canonical `About`, `Contact`, and `README.txt` files inside `Home`, surfaced on the desktop as aliases.
- Real read-only `Get Info` windows.
- Finder-leaning ME chrome while preserving Terminal-OS green/black styling.
- Persisted shell/VFS migration to the new node-backed model.

Out of scope:
- Dedicated gallery/video browser redesign.
- Trash.
- Desktop icon drag/rearrange.
- Visible create/rename/delete/reset affordances in ME.
- Full viewer-interior redesign outside the root docs/contact surfaces.

---

## 3) Desktop Model

Canonical desktop order:
1. `Start Here`
2. `Projects`
3. `Media`
4. `About`
5. `Contact`

Entry rules:
- `Projects` and `Media` are desktop aliases pointing at canonical folders inside `Home`.
- `About`, `Contact`, and `Start Here` are desktop aliases pointing at canonical files inside `Home`.
- `Home` and `Archive` remain canonical folders in the VFS but are not desktop icons.
- Desktop entries are shell config, not VFS alias nodes.

Interaction rules:
- Pointer: single-click selects, double-click opens.
- Keyboard: arrows move selection; `Enter` and `Space` open the selected entry.
- Background click clears selection.
- Background-only double-click enters fullscreen.
- Background-only keyboard activation enters fullscreen when the desktop surface itself is focused.
- Touch: single tap opens; long-press exposes context actions.

Visual rules:
- Labels stay in Terminal-OS green on black.
- Selected labels invert to green background with black text.
- Icons are type-based: folder, document, contact-card.
- Alias state stays subtle and only surfaces on hover/focus or in `Get Info`.

---

## 4) Window Model

Runtime behavior kept:
- focus
- z-order
- drag
- resize
- minimize
- zoom/maximize
- close
- session restore

Presentation changes:
- Inner window headers use a more classic centered-title treatment.
- Controls remain `close`, `minimize`, and `zoom`, but no longer read like terminal action buttons.
- Resize handles remain functional and visually quiet.
- Non-ME scopes still collapse ME activity to `ME.EXE (n)`.

Fullscreen shell:
- Title remains `ME.EXE`.
- Fullscreen header uses a simpler classic title-bar treatment.
- No fake menu bar is introduced in this pass.

---

## 5) Folder Windows

Folder-window contract:
- Opening a folder creates or focuses a deterministic window: `folder_<nodeId>`.
- Opening the same folder again focuses the existing window.
- Opening a child folder opens or focuses a different folder window; it does not replace the current one.

Folder-window UI:
- Icon view only.
- No toolbar.
- No path input.
- No sidebar.
- No visible create/rename/delete/reset controls.
- Bottom status strip only: item count plus absolute path.
- Context actions are `OPEN` and `GET INFO`.

This replaces the visible `FILE.EXE`/`FileMan` authoring browser model in the user-facing shell.

---

## 6) Documents And Viewers

Canonical `Home` contents:
- `About`
- `Contact`
- `README.txt`

Document rules:
- Desktop aliases and canonical files open the same viewer window keyed by canonical node id.
- Window titles use plain labels: `About`, `Contact`, `README.txt`.
- Text remains selectable/copyable.

Viewer specifics:
- `About`: richer world-note layout with authored practice/system sections.
- `Contact`: custom contact-card viewer that renders only real configured channels.
- `README.txt`: `Start Here` hub layout with explicit next-open actions for `Projects`, `Media`, and `About`.
- `Projects`: project cards now foreground purpose, one artifact link, and a `Why it matters` line.
- `Media`: folder browsing remains FileMan-based, but with stronger thumbnail hierarchy and featured reel treatment.

---

## 7) Get Info Windows

Info-window contract:
- Canonical node info window id: `info_node_<nodeId>`.
- Desktop-alias info window id: `info_entry_<desktopEntryId>`.
- Reopening info focuses the existing stable window.

Displayed fields:
- name
- kind
- absolute path
- folder item count or file viewer kind
- alias status and target path for desktop aliases

---

## 8) Data Contracts

Shell:
- Fixed-app launcher ids are removed.
- Node-backed windows now use `folder`, `info`, and viewer-specific ids.
- Shell persistence schema is version `2`.

VFS:
- Canonical documents live under `Home`.
- `contact` is a first-class file kind.
- Structured document metadata supports richer document layouts without inventing alias nodes.
- VFS persistence schema is version `2`.

Menus/context:
- `OPEN HOME` replaces the older `OPEN FILE` command.
- `OPEN ABOUT` and `OPEN CONTACT` are first-class ME commands.
- ME create-file/create-folder commands are removed from visible menus.

Migration:
- Legacy ME windows migrate to node-backed folder/viewer windows.
- Legacy root `About` and `Contact` folders are moved into `Archive/Legacy` when found.

---

## 9) Acceptance Baseline

- `ME.EXE` no longer shows the centered launcher shelf.
- The shell reads as folders/files opening into windows, with `Start Here` acting as the orientation hub.
- Desktop entry order is exactly `Start Here`, `Projects`, `Media`, `About`, `Contact`.
- `About`, `Contact`, and `README.txt` behave as desktop aliases to canonical `Home` files.
- Visible FileMan authoring controls are gone from ME.
- Session restore and window mechanics remain intact.

---

## 10) Follow-Up

Next ME pass after this reset:
- dedicated gallery/video browsing for `Media`
- any deeper viewer-specific art direction beyond the current root-doc/contact surfaces
