# FileMan v2 Build Spec

Status: Historical architecture doc, UI superseded by Finder Reset
Date: 2026-02-08
Last updated: 2026-03-01
Owner: Terminal-OS
Related: `docs/me-exe-finder-reset-spec.md`, `docs/me-exe-evolution-plan.md`, `docs/overview.md`, `docs/conversation-log.md`

---

## 1) Purpose

This document preserves the architecture and state-boundary decisions that came out of the FileMan v2 work. The visible user-facing ME shell no longer exposes the old FileMan browser surface; that UI has been superseded by the Finder Reset described in `docs/me-exe-finder-reset-spec.md`.

Use this file for:
- shell/VFS/viewer boundary rules
- persistence ownership rules
- historical rationale for replacing UI-owned file browser state

Do not use this file as the source of truth for the current ME desktop UX.

---

## 2) What Still Matters From FileMan v2

The following contracts remain active:

1. `ME.OS Shell`
- Owns window lifecycle, focus, z-order, drag/resize, minimize/maximize, and persisted shell state.

2. `VFS Service`
- Owns filesystem data, versioned migrations, deterministic seed/reset behavior, and persistence.

3. Folder/document windows and viewers
- Consume shell and VFS APIs only.
- Do not write persistence directly.

4. Shared runtime
- `ME.EXE` panel and fullscreen render the same ME runtime instance.

5. Deterministic reopen behavior
- Reopening the same node focuses the existing canonical window instead of duplicating it.

---

## 3) Superseded UI Assumptions

The following FileMan-era assumptions are no longer current:

- No centered `FILE / ABOUT / PROJECTS / MEDIA` launcher shelf.
- No visible FileMan toolbar.
- No visible path input.
- No quick-access sidebar in the active ME shell.
- No visible create/rename/delete/reset controls in ME.
- No `OPEN FILE` terminology; the current command is `OPEN HOME`.

Current replacement:
- sparse desktop icon lane
- minimal folder windows
- canonical `Home` documents exposed as desktop aliases
- read-only `Get Info` windows

---

## 4) Current Runtime Contract

Desktop:
- Curated entry list: `Home`, `Projects`, `Media`, `About`, `Contact`, `Archive`, `README.txt`
- `About`, `Contact`, and `README.txt` are aliases to canonical files inside `Home`
- Pointer single-click selects and double-click opens
- Touch single-tap opens
- Background-only double gesture enters fullscreen

Folder windows:
- Deterministic ids: `folder_<nodeId>`
- Icon-grid content only
- Bottom status strip only
- Context actions: `OPEN`, `GET INFO`

Viewer windows:
- Deterministic ids based on canonical node ids
- `About` uses richer document layout metadata
- `Contact` uses a custom contact-card viewer
- Existing image/video/project viewers remain active

Info windows:
- Canonical node id: `info_node_<nodeId>`
- Desktop alias id: `info_entry_<desktopEntryId>`

---

## 5) Persistence Contract

Storage keys remain:
- `terminalOS.meos.v1.shell`
- `terminalOS.meos.v1.vfs`

Versioned runtime expectations:
- Shell snapshot version: `2`
- VFS snapshot version: `2`

Migration rules now include:
- legacy fixed-app ME windows -> node-backed folder/viewer windows
- canonical `Home` documents for `About`, `Contact`, and `README.txt`
- legacy root `About`/`Contact` folders archived to `Archive/Legacy`

Reset rule:
- only owned ME/VFS state is reset
- deterministic seed data is reapplied

---

## 6) Menu And Scope Contract

Desktop scope:
- `OPEN ME.EXE`
- `OPEN HOME`
- `TOGGLE THEME`

ME scope:
- `OPEN HOME`
- `OPEN PROJECTS`
- `OPEN MEDIA`
- `OPEN ABOUT`
- `OPEN CONTACT`
- `EXIT ME.EXE`
- `TOGGLE THEME`

Task-strip contract:
- ME scope shows individual ME windows
- non-ME scopes collapse ME activity to `ME.EXE (n)`

---

## 7) Non-Goals

Still deferred:
- dedicated gallery/video browsing
- Trash
- desktop drag/rearrange
- visible file authoring workflows inside ME
- broad subsystem parity work beyond current ME scope

---

## 8) Documentation Rule

When the ME runtime changes:
- update `docs/me-exe-finder-reset-spec.md`
- update this file only if architecture/persistence boundaries change
- add a short entry to `docs/conversation-log.md`
