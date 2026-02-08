# Terminal-OS Conversation Log

Purpose: running summary of user/assistant decisions and direction.
Updated: 2026-02-08

---

## Entry Template (Use For New Entries)

Date:
Topic:

Summary:
- What was asked and why.
- What was decided.

Why it matters:
- Expected user impact.
- Technical impact.

Risks / Notes:
- Known tradeoffs.
- Follow-up doc links.

---

## Entry 01 - Direction Review Request

Summary:
- User asked for a repo-wide direction review before any new coding, with special focus on prior branch experiments.
- Branch comparison covered `main`, `phase0-2`, `phase3`, and `master`.
- Core conclusion: `phase3` had stronger window interaction design, but the old `ME.EXE` + filetree layer created usability and consistency problems.

Why it matters:
- This avoided blindly reviving old work that looked good visually but was unstable behaviorally.
- It established that we should separate visual wins (window chrome/interaction) from weak architecture (state ownership and restore flow).

Risks / Notes:
- Existing local environment had unrelated `node_modules` modifications; those were intentionally ignored.
- This became the foundation for all follow-up decisions.

---

## Entry 02 - Strategic Recommendation

Summary:
- Recommendation was to keep `main` as the implementation baseline for responsive/layout polish.
- Only bring back the best parts of `phase3` windowing behavior, not the entire app stack.
- Rebuild filetree as a service-backed system instead of restoring component-local persistence patterns.

Why it matters:
- Preserves recent quality improvements from `main`.
- Reduces regression risk from `phase3` behaviors that previously felt brittle.

Risks / Notes:
- Cherry-picking blindly from `phase3` would likely reintroduce earlier failure modes.
- A clean rebuild path was preferred for filesystem/state flow.

---

## Entry 03 - External Reference (ProzillaOS)

Summary:
- User requested review of `https://github.com/naninfinite/ProzillaOS` for filetree interaction patterns.
- Assistant cloned the repo, inspected file explorer + virtual drive internals, then removed the temporary clone.
- Key lessons: service-owned filesystem model, event-driven UI updates, reusable directory list, path/history controls, and declarative context actions.

Why it matters:
- Gave a concrete, working reference for a cleaner explorer model.
- Confirmed that our target architecture is practical, not theoretical.

Risks / Notes:
- We explicitly chose not to copy everything as-is.
- Avoided patterns like broad storage reset behavior and weak key namespacing.

---

## Entry 04 - FileMan v2 Mapping

Summary:
- Proposed `ME.OS` as a portfolio mini-OS opened from `ME.EXE`.
- Defined core layers: `ME.OS Shell` (windowing/navigation), `VFS Service` (state/persistence), `FileMan v2` (explorer UI consumer), and viewer apps (images/videos/text/projects).

Why it matters:
- Repositions `ME.EXE` from static bio panel to primary portfolio platform.
- Creates clear module boundaries for maintainability and testing.

Risks / Notes:
- Without hard boundaries, `ME.EXE` can become an overloaded “god component” again.
- Build spec required to keep implementation sequencing controlled.

---

## Entry 05 - UX Clarification

Summary:
- User requested plain-English UX journey for `ME.EXE`.
- Agreed flow: desktop panel opens `ME.OS`, users browse portfolio folders/files, open content viewers/windows, then return to desktop without losing in-session state.

Why it matters:
- Aligns user experience expectations before implementation.
- Prevents technical decisions that conflict with intended feel.

Risks / Notes:
- “Feels like an OS” requires cohesive interaction patterns (windowing, menu, navigation), not just visual styling.

---

## Entry 06 - Live Mini + Fullscreen Same Instance

Summary:
- User requested that `ME.OS` always remain visible on desktop in the `ME.EXE` panel, even when not fullscreen.
- Decision: one shared `ME.OS` runtime instance, rendered in two display modes (`panel` for mini/live preview, `fullscreen` for full interaction).

Why it matters:
- Matches desired “real subsystem” behavior: same running state in both views.
- Eliminates state divergence bugs caused by duplicate instances.

Risks / Notes:
- Panel rendering can become expensive if fullscreen effects run unthrottled.
- Requires explicit performance profiles by mode.

---

## Entry 07 - Context-Aware Menu

Summary:
- User requested Windows-like menu behavior that changes by active context.
- Decision: one global Start-like button in the bottom status bar, with scope-aware menu contents.
- Scopes include desktop, `ME.OS`, and future subsystem scopes (for example `THIRD`).

Why it matters:
- Keeps interaction model consistent while still feeling context-aware and intentional.
- Avoids creating separate menu systems per subsystem.

Risks / Notes:
- Must keep menu structure stable so context changes do not confuse users.
- Menu content should be config-driven, not hardcoded in each app.

---

## Entry 08 - Documentation Request

Summary:
- User requested a running conversation log and synced scope/ADR docs.
- Added/updated docs to capture decisions and keep project intent visible.

Why it matters:
- Prevents decision drift over time.
- Reduces rediscovery cost when resuming work later.

Risks / Notes:
- Summaries were initially too terse for long-term recall.
- This entry triggered richer log format and build-spec request.

---

## Entry 09 - Build Spec + Expanded Summaries

Summary:
- User requested a concrete build spec and fuller conversation summaries.
- Added `FileMan v2` implementation spec and expanded all prior entries with rationale and risk notes.
- Included prior “what likely went wrong” observations in this log and spec.

Why it matters:
- Provides execution-grade plan for implementation.
- Makes one-month-later context recovery realistic.

Risks / Notes:
- Spec should stay authoritative; if implementation changes, update docs in the same PR.

---

## Entry 10 - M1 Shell Foundation Implemented

Summary:
- Implemented the first ME.OS build milestone from `docs/fileman-v2-build-spec.md`.
- Added shared ME.OS provider state with persisted internal windows (`terminalOS.meos.v1.shell`).
- Added panel-mode ME.OS viewport in `ME.EXE` and fullscreen ME.OS overlay mode driven by the same state.
- Added basic internal window manager behavior: open/focus/move/minimize/close plus default Home bootstrap.
- Wired status bar menu button to open ME.OS fullscreen.

Why it matters:
- Confirms the “same running ME.OS state in panel + fullscreen” direction is now real in code.
- Establishes the shell/service boundary needed before FileMan v2 and viewer apps.

Risks / Notes:
- Panel mode currently shows a compact scaled live preview (not yet optimized beyond basic scaling).
- Internal window content is intentionally placeholder-level for M1; FileMan v2 comes in later milestones.

---

## Entry 11 - M2 VFS Service Implemented

Summary:
- Implemented ME.OS VFS service with versioned persistence key `terminalOS.meos.v1.vfs`.
- Added deterministic seed tree and reset behavior in service layer.
- Added migration path from legacy Phase 3 key `terminal_os_fs_v1`.
- Added React VFS provider and connected ME.OS home window to live root listing + reset action.
- Added VFS unit tests with Vitest and switched project `test` script to run them.

Why it matters:
- Moves filesystem ownership out of UI and into a dedicated service boundary.
- Establishes stable persistence/migration semantics before FileMan v2 UI work.
- Provides repeatable test coverage for core stateful behavior.

Risks / Notes:
- Current ME.OS view only surfaces a root listing and reset action for visibility.
- Full FileMan UX (path nav, rename/delete flows, richer views) remains M3 scope.

---

## Entry 12 - M3 FileMan v2 Core Implemented

Summary:
- Implemented a real `FileMan` app window inside ME.OS (`FILEMAN.EXE`).
- Added core navigation: path input, back, forward, up, and quick-access folders.
- Added core actions: new folder, new file, rename, delete, reset.
- Added keyboard controls (`Enter`, arrows, `F2`, `Delete`) and a React-based context menu.
- Added per-file viewer windows (text/image/video) with focus-existing-window behavior.

Why it matters:
- Delivers the first usable FileMan interaction model over the M2 VFS service.
- Validates the shell + VFS + app layering before advanced polish/features.

Risks / Notes:
- Viewer content is currently lightweight/placeholder-backed for M3.
- Fullscreen ME.OS still overlays status bar; layout polish is tracked for later shell pass.

---

## Entry 13 - Cloud Planning Notes Imported

Summary:
- User shared a full planning discussion from cloud chat covering future behavior for `YOU`, `THIRD`, and `CONNECT`.
- Added a dedicated roadmap doc to preserve those notes as long-term implementation context.
- Linked roadmap doc from overview/spec/phase docs so it remains discoverable during future milestone work.

Why it matters:
- Captures subsystem direction in-project instead of relying on external chat memory.
- Keeps current implementation track intact while preserving richer future requirements.

Risks / Notes:
- This import is directional and not a commitment to immediate implementation order changes.
- Fullscreen/status-bar overlap remains a tracked shell polish item.

---

## Entry 14 - M3 Completion Pass (List/Grid + Grid Keyboard Nav)

Summary:
- User asked to finish M3 before moving on.
- Closed the remaining M3 gap by adding `FileMan` list/grid view mode toggle and keeping both views on the same explorer state.
- Added grid-aware keyboard traversal so arrow keys work in both list and grid modes, while preserving `Enter`, `F2`, and `Delete` actions.

Why it matters:
- Brings implementation in line with the M3 contract requirement for list/grid rendering and keyboard baseline.
- Keeps M3 scope complete without pulling in M4/M5 behavior early.

Risks / Notes:
- Grid traversal uses visual column count from layout, which is responsive and deterministic for current card sizing.
- Fullscreen/status-bar overlap remains intentionally deferred to later shell polish.

---

## Entry 15 - M4 Step 1 Viewer Realism Pass

Summary:
- Began M4 by replacing name-based placeholder viewer logic with metadata-driven rendering from VFS nodes.
- Added first-class `project` file kind and project card viewer support (title, summary, stack, links).
- Expanded seed filesystem with richer file metadata (`textContent`, media metadata, project cards) so viewers open meaningful content by default.

Why it matters:
- Makes the in-OS browsing experience feel like a real portfolio system rather than backend scaffolding.
- Keeps rendering source-of-truth in VFS/service layers, aligned with current architecture rules.

Risks / Notes:
- Repository currently has no bundled binary media assets, so image/video viewers include graceful fallback surfaces when `assetSrc` is empty.
- Full media polish and asset pipeline can be layered in later without changing viewer architecture.

---

## Entry 16 - M4 Step 2 Viewer Reuse + Icon-First FileMan

Summary:
- Improved viewer-window reopen behavior so existing windows refresh `appId`, `viewerKind`, and `nodeId` while being focused and restored.
- Shifted FileMan to icon-first browsing by defaulting to grid view and introducing file-type glyph labels (`FOLDER`, `IMG`, `VID`, `PRJ`, `TXT`).

Why it matters:
- Hardens the “same target reuses existing window” contract when metadata evolves.
- Moves user-facing navigation away from backend-like rows toward a more visual desktop/file-browser feel.

Risks / Notes:
- Icon language is intentionally textual/minimal right now to match terminal aesthetics; polished icon art can come later without behavior changes.

---

## Entry 17 - M4 Step 3 UI Polish (Explorer + Viewer Chrome)

Summary:
- Polished FileMan item presentation with clearer active/hover states, kind badges, and explicit selection semantics.
- Added a consistent viewer metadata header (`kind` + file name) across text/image/video/project windows for stronger “app-window” coherence.
- Kept behavior unchanged while improving legibility and hierarchy so the system feels less like backend tooling.

Why it matters:
- Makes file browsing faster by improving scanability and visual affordances in both list and grid modes.
- Gives all viewer apps a shared visual language, which reinforces the pseudo-OS interaction model.

Risks / Notes:
- Styling remains intentionally terminal-themed and lightweight; richer icon artwork and motion can be layered later.

---

## Entry 18 - M5 Step 1 Shell Bar Behavior

Summary:
- Updated fullscreen `ME.OS` layer to respect the bottom status bar instead of covering it.
- Reworked status bar menu into a scoped Start-style menu:
- Desktop scope: open `ME.OS`, `HOME`, or `FILEMAN`.
- ME.OS scope: app launches plus explicit exit action.
- Added a task strip in the status bar showing open windows and allowing restore/focus by click.

Why it matters:
- Aligns fullscreen behavior with product direction that the status bar remains persistently visible.
- Introduces the first context-aware menu behavior and basic window/task affordances required for M5.

Risks / Notes:
- Scope switching is currently driven by `ME.OS` display mode (`panel` vs `fullscreen`), not by non-ME panel focus yet.
- Task strip intentionally prioritizes restore/focus only; minimize/close controls remain in window chrome.

---

## Entry 19 - M5 Step 2 Menu Scope Config Model

Summary:
- Replaced inline menu arrays in `StatusBar` with a dedicated config module under `src/meos/menu/scopes.ts`.
- Added explicit menu scope IDs and command IDs so Start menu behavior is driven by configuration instead of component-local branching.
- Added placeholder scope definitions for future subsystem menus (`YOU`, `THIRD`, `CONNECT`) while keeping current runtime scope resolution (`desktop` vs `meos`).

Why it matters:
- Makes menu behavior easier to expand and maintain as non-ME subsystems gain parity.
- Creates a clear contract for menu scope + command mapping before broader panel-context routing.

Risks / Notes:
- Runtime scope still resolves from `ME.OS` display mode until broader panel focus state is introduced.
- Future subsystem scopes currently expose placeholder actions only.

---

## Entry 20 - M5 Step 3 Active Panel Scope Routing

Summary:
- Added active panel scope state to `MeOsProvider` (`you`, `third`, `connect`) with a setter exposed through shell context.
- Wired desktop panel interaction events (`mouseenter`, focus-capture, mousedown) to update active scope from `Desktop`.
- Updated menu scope resolution so fullscreen always forces `ME.OS`, while desktop mode now reflects the last active non-ME panel scope.

Why it matters:
- Moves Start menu behavior from a display-mode-only heuristic toward true panel-context awareness.
- Establishes the state path needed for future subsystem-specific menu actions without rewriting status bar logic.

Risks / Notes:
- Scope activation currently follows interaction focus/hover patterns; a future pass may refine this with explicit “active window/panel” semantics.
- `YOU`, `THIRD`, and `CONNECT` still use placeholder menu actions until subsystem feature work lands.
