# ME.EXE Finder Reset Spec

Status: Implemented baseline
Date: 2026-03-01
Owner: Terminal-OS
Related: `docs/me-exe-evolution-plan.md`, `docs/fileman-v2-build-spec.md`, `docs/overview.md`, `docs/conversation-log.md`

---

## 1) Summary

`ME.EXE` now centers on a sparse desktop-and-window metaphor instead of the older centered launcher shelf. The active implementation uses a left-column desktop icon lane, minimal folder windows, canonical `Home` documents surfaced as desktop aliases, and read-only `Get Info` windows. Gallery/video browsing remains deferred; `Media` continues to use the current viewer windows inside the new shell.

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
1. `Home`
2. `Projects`
3. `Media`
4. `About`
5. `Contact`
6. `Archive`
7. `README.txt`

Entry rules:
- `Home`, `Projects`, `Media`, and `Archive` are canonical folders.
- `About`, `Contact`, and `README.txt` are desktop aliases pointing at canonical files inside `Home`.
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
- `About`: richer document layout with hero placeholder and sections.
- `Contact`: custom contact-card viewer with `Email`, `GitHub`, and `Instagram` actions plus explicit placeholders when data is missing.
- `README.txt`: standard text-document viewer.
- `Projects`, `Media`, image, video, and project viewers keep current behavior in this pass.

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
- The shell reads as folders/files opening into windows.
- `About`, `Contact`, and `README.txt` behave as desktop aliases to canonical `Home` files.
- Visible FileMan authoring controls are gone from ME.
- Session restore and window mechanics remain intact.
- Gallery/video redesign is explicitly deferred.

---

## 10) Follow-Up

Next ME pass after this reset:
- dedicated gallery/video browsing for `Media`
- any deeper viewer-specific art direction beyond the current root-doc/contact surfaces
