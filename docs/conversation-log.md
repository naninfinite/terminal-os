# Terminal-OS Conversation Log

Purpose: running summary of user/assistant decisions and direction.
Updated: 2026-02-23

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

---

## Entry 21 - M5 Step 4 Real Non-ME Menu Actions

Summary:
- Replaced placeholder `YOU`, `THIRD`, and `CONNECT` menu entries with concrete commands.
- Added panel-focus commands that scroll/focus target desktop panels through scope IDs.
- Wired panel-specific command handlers:
- `YOU`: save input and clear input commands.
- `THIRD`: reset scene rotation command.
- `CONNECT`: copy ASCII banner to clipboard command.

Why it matters:
- Makes non-ME menu scopes immediately useful rather than decorative placeholders.
- Validates the new menu command model against real subsystem behavior before larger feature expansion.

Risks / Notes:
- Clipboard writes may be blocked by browser permissions/context in some environments.
- Panel actions currently use lightweight window events; a later pass can formalize this into a dedicated command bus if needed.

---

## Entry 22 - UX Fixes (CONNECT Scroll + ME.EXE Surface Naming)

Summary:
- Removed CONNECT panel horizontal scrollbar by tightening ASCII rendering styles (no pre margins, clamped font size, hidden overflow).
- Updated user-facing ME shell naming from `ME.OS` to `ME.EXE` in viewport chrome/menu labels/aria surface text.
- Hid panel-mode internal shell chrome header/footer so the embedded experience reads as one `ME.EXE` panel instead of nested framing.

Why it matters:
- Resolves a clear visual regression in CONNECT and improves panel cleanliness.
- Aligns product presentation with intended “ME.EXE as one immersive panel” UX while preserving underlying architecture.

Risks / Notes:
- Internal identifiers and storage keys still use ME.OS naming for technical stability.
- If panel text scales too small on very large displays, clamp tuning can be adjusted without logic changes.

---

## Entry 23 - FileMan UX Polish (Scrollbar Uniformity + Launch Position)

Summary:
- Fixed dual-scroll behavior in `FILEMAN.EXE` by disabling outer shell body scrolling for FileMan windows and keeping scrolling inside FileMan regions.
- Styled FileMan sidebar/list scrollbars to match terminal-green block styling and keep scrollbar visuals consistent.
- Normalized default FileMan window template position to align with core shell window origin (removed extra open offset).

Why it matters:
- Removes visual noise and interaction confusion caused by nested scroll containers.
- Improves consistency with the broader terminal UI language.
- Makes FileMan feel anchored/predictable when launched.

Risks / Notes:
- Existing persisted window positions can still reflect older offsets until users reopen/reset those saved states.

---

## Entry 24 - Styling Baseline + Slow Iteration Lock

Summary:
- User confirmed current in-repo Terminal-OS styling is closer to the target than recent broad redesign attempts.
- Decision: preserve current styling as primary baseline and iterate ME.EXE behavior slowly in small, concise steps.
- Added a dedicated plan doc capturing the visual references, locked constraints, and iteration method.

Why it matters:
- Prevents disruptive one-shot UI rewrites that drift from project identity.
- Establishes a shared operating agreement for future ME.EXE updates.

Risks / Notes:
- Progress may be slower by design, but review quality and direction alignment should improve.
- Reference doc: `docs/me-exe-evolution-plan.md`.

---

## Entry 25 - Shell Cleanup + Spawn Baseline Lock

Summary:
- Completed incremental shell cleanup by removing legacy `HOME.EXE` app/menu wiring from fixed app types, provider templates, viewport branch, and status-bar menu routing.
- Normalized menu command naming from `open_fileman` to `open_file` to match current `FILE.EXE` terminology.
- Added deterministic window spawn baseline: cascaded open positions with viewport clamping so window headers remain visible/reachable.

Why it matters:
- Reduces stale code paths that no longer match the current ME.EXE UX model.
- Improves naming clarity for future scope/menu work and lowers accidental regressions.
- Makes window launches feel more predictable across display sizes without changing visual design.

Risks / Notes:
- Existing persisted snapshots may still contain old window coordinates until reopened/saved under new behavior.
- This pass intentionally did not address window-resize or video-player issues yet; both remain planned follow-up items.

---

## Entry 26 - Window Resize Completion + Video Fit Responsiveness

Summary:
- Implemented ME window resize interactions from all corners and all edges.
- Added responsive window clamping behavior so open/resize/move actions keep windows usable inside the ME fullscreen frame.
- Updated resize affordance visibility so handles appear only on hover/focus.
- Fixed video viewer responsiveness by adjusting media fit behavior to keep controls visible and prevent overflow spill in small windows.

Why it matters:
- Resolves the core usability issue where FILE/media windows could open larger than the visible ME frame and hide critical UI.
- Brings ME interactions closer to expected desktop OS behavior while preserving current styling direction.
- Improves reliability across different desktop viewport sizes without requiring a visual redesign pass.

Risks / Notes:
- Existing persisted window geometry may need one open/close cycle to settle into the new clamped bounds.
- Resize interactions currently prioritize pointer/mouse behavior; keyboard resize behavior remains a separate future accessibility enhancement.

---

## Entry 27 - M5 Backlog Capture (No-Code UX Notes)

Summary:
- Recorded user UX follow-ups as backlog items without changing runtime behavior.
- Added preference notes for edge-first resize interaction and strict header-only drag safety around window control buttons.
- Captured launcher discoverability request (`FILE / ABOUT / PROJECTS / MEDIA` visible even when windows are open) for a future incremental pass.
- Captured panel-preview parity question: current desktop panel shows top active window only; multi-window miniature preview remains a deliberate future evaluation.
- Captured task-strip/dock behavior options: contextual per-panel task lists vs desktop master grouping (`ME.EXE (n)`) with click-to-expand behavior.

Why it matters:
- Preserves design direction decisions without forcing rushed implementation.
- Keeps M5 polish work scoped and traceable as micro-iterations.
- Reduces repeated re-discussion by storing exact UX intent in spec docs.

Risks / Notes:
- No code changes were made as part of this backlog-capture pass.
- Implementation order should remain incremental to protect current styling baseline.

---

## Entry 28 - M5 Launcher Persistence (Windows-Open Discoverability)

Summary:
- Updated ME shell stage rendering so launcher actions (`FILE`, `ABOUT`, `PROJECTS`, `MEDIA`) are always visible.
- Launchers are no longer limited to the empty-state branch; windows now render as an overlay layer above the desktop launcher shelf.
- Kept current interaction contract unchanged (`single-click` select, `double-click` open) and retained panel-mode non-interactive behavior.

Why it matters:
- Resolves the discoverability issue where launcher actions disappeared after opening a window.
- Preserves current Terminal-OS styling while making ME desktop behavior feel more OS-like and persistent.
- Keeps the change incremental and easy to review/rollback.

Risks / Notes:
- Launcher shelf placement is intentionally minimal and can be refined in a later polish pass without changing core behavior.
- Panel mode still shows only the top active window in miniature; multi-window preview remains a separate queued decision.

---

## Entry 29 - M5 Task Strip Grouping Baseline (`ME.EXE (n)`)

Summary:
- Updated status bar task rendering to be scope-aware:
  - In `ME.EXE` scope (`meos`), show individual ME window task buttons.
  - In non-ME scopes, collapse ME windows into a single master task item labeled `ME.EXE (n)`.
- Added click behavior for the master item to open ME fullscreen and expose individual task buttons there.

Why it matters:
- Matches the intended desktop behavior where non-active panel windows do not flood the global dock.
- Preserves quick access to ME runtime state from other scopes without losing open-window count context.
- Keeps the change small and style-safe while moving task-strip UX toward OS-like grouping semantics.

Risks / Notes:
- This baseline groups ME windows only; panel-owned grouping for `YOU`, `THIRD`, and `CONNECT` remains future work.
- Task-strip layout/placement styling was intentionally left unchanged in this pass.

---

## Entry 30 - M5 Status Bar Placement Polish (`ME.EXE (n)` Right Cluster)

Summary:
- Moved collapsed master task item `ME.EXE (n)` from the central task strip to the right status cluster.
- Added a simple visual divider (`|`) between `ME.EXE (n)` and the clock for clearer grouping.
- Kept scope behavior unchanged:
  - `meos`: individual ME window task buttons stay in the main task strip.
  - non-`meos`: collapsed master item appears near the clock.

Why it matters:
- Reduces visual churn in the central dock area when browsing non-ME panels.
- Aligns with earlier UX direction to place compact ME aggregate status near time/status tokens.
- Preserves existing interaction model while improving scanability.

Risks / Notes:
- Divider/spacing style is intentionally minimal and can be tuned later without behavior changes.

---

## Entry 31 - Status Bar Placement Revert (Reserve Right Slot)

Summary:
- Reverted collapsed `ME.EXE (n)` master task placement back to the central/left task strip.
- Removed the temporary right-cluster divider treatment added in the previous pass.
- Kept grouping behavior unchanged:
  - `meos`: individual ME task buttons.
  - non-`meos`: one collapsed `ME.EXE (n)` master item.

Why it matters:
- Preserves the right side near the clock for a planned future location handle.
- Keeps dock semantics consistent while avoiding layout churn in the time/status area.

Risks / Notes:
- This is a placement-only adjustment; no command/scope/task grouping logic changed.

---

## Entry 32 - Status Cluster Future Slot (`location | time`)

Summary:
- Captured explicit future UX requirement for right status cluster formatting: show user location to the left of time.
- Locked display intent as `location | time` with a pipe separator.
- Confirmed that right cluster should remain reserved for this token pair and not be used for collapsed ME task items.

Why it matters:
- Prevents future regressions where ad-hoc status tokens consume the planned location slot.
- Keeps status-bar information hierarchy predictable for users.

Risks / Notes:
- Backlog-only capture; no runtime location lookup/rendering was implemented in this pass.

---

## Entry 33 - M5 Edge-First Resize Restore + Control-Safe Top Hitboxes

Summary:
- Restored full directional resize in ME windows using edge-first handles (`N`, `E`, `S`, `W`) plus corner handles.
- Reintroduced top-corner resizing with control-safe hitbox geometry so `_` / `X` remain reliably clickable.
- Kept existing header drag model and button event-guard behavior intact.

Why it matters:
- Brings window interaction closer to standard desktop OS expectations.
- Resolves prior tradeoff where top-corner resize was disabled to avoid button collisions.
- Maintains current Terminal-OS style while improving practical pointer ergonomics.

Risks / Notes:
- Top-edge hitbox offsets are intentionally conservative; minor tuning can be done later based on device testing.

---

## Entry 34 - M5 Panel Preview Parity (Top-Two Mini Stack)

Summary:
- Updated ME panel-mode preview to render up to the top two active windows instead of only one.
- Added lightweight visual layering: secondary preview window is dimmed and slightly offset behind the active one.
- Kept fullscreen rendering unchanged (all active windows still render in fullscreen mode).

Why it matters:
- Improves desktop panel readability by showing that multiple ME windows are active without full task-strip scanning.
- Preserves performance and visual clarity by limiting panel preview to a small stack rather than full multi-window rendering.
- Moves panel/fullscreen parity closer to expected “live runtime” behavior.

Risks / Notes:
- Panel preview intentionally caps at two windows for clarity; deeper stacks remain accessible in fullscreen/task strip.

---

## Entry 35 - ME Footer Status Token (`READY/ACTIVE | N WINDOWS`)

Summary:
- Replaced center empty-state copy with a footer status token model in fullscreen ME shell.
- Footer now reads:
  - `DESKTOP READY | 0 WINDOWS` when no ME windows are active.
  - `DESKTOP ACTIVE | N WINDOWS` when one or more windows are active.

Why it matters:
- Avoids text conflict behind launcher controls while keeping empty/active state visible.
- Aligns requested pipe-separated status phrasing with existing ME footer chrome.

Risks / Notes:
- Treated as a temporary UX phase; user requested this be revisited later and potentially removed as desktop UX matures.

---

## Entry 36 - Status Right Cluster Scaffold (`LOCATION -- | TIME`)

Summary:
- Implemented a right-cluster placeholder token in status bar: `LOCATION -- | HH:MM:SS`.
- Kept location value static (`LOCATION --`) for now, with no geolocation/data-source integration yet.
- Preserved previous decision to keep this slot dedicated to location/time instead of ME task tokens.

Why it matters:
- Locks spacing and visual hierarchy for the planned location feature.
- Enables later location integration as a data-only update without layout churn.

Risks / Notes:
- Placeholder text is temporary and should be replaced by a real location source in a future pass.

---

## Entry 37 - Status Language Review (Global vs Panel Ready Tokens)

Summary:
- Captured UX concern that global `SYS: READY` can clash with ME footer `DESKTOP READY`.
- Recorded preferred direction candidates for later decision:
  - If panel-ready language stays, consider uniform readiness phrasing across panels (for example `YOU READY`, `THIRD READY`, `CONNECT READY`).
  - Otherwise, keep only one readiness source (global or panel-local) to avoid duplicate signals.

Why it matters:
- Improves status clarity and reduces duplicated semantic noise in the UI.
- Keeps future copy/system-status decisions deliberate instead of ad-hoc.

Risks / Notes:
- Conversation/backlog capture only; no code changes were made in this pass.

---

## Entry 38 - Status Right Cluster Location Source (Geolocation + Fallback)

Summary:
- Replaced static location placeholder with a runtime location source in status bar right cluster.
- Current format remains `location | time`:
  - Preferred source: browser geolocation coordinates (`N/S` + `E/W` tokens).
  - Fallback source: timezone-derived token (`TZ <City>`) when permission is denied/unavailable.
- Kept existing layout and right-cluster spacing semantics unchanged.

Why it matters:
- Turns the right status slot from scaffold text into meaningful live context.
- Preserves privacy/permission resilience by providing deterministic fallback output.

Risks / Notes:
- Geolocation availability depends on browser permissions and secure-context behavior.
- Coordinates are intentionally concise and may be truncated visually in tight viewports.

---

## Entry 39 - Deferred: Lowercase Location Token Styling

Summary:
- Parked follow-up to keep location token text in lowercase.
- Deferred for later pass to avoid broad casing side-effects while iterating quickly.

Why it matters:
- Current global text transform can force uppercase rendering, which conflicts with desired location style.

Risks / Notes:
- Backlog-only capture; no runtime/copy styling change applied in this pass.

---

## Entry 40 - Theme Architecture Lock (Auto / Dark / Light, Shell-First)

Summary:
- Locked runtime theme model to three modes: `auto`, `dark`, `light`.
- Confirmed default behavior as system-aware `auto` with persistent manual override via menu actions.
- Locked dark-mode parity requirement (current Terminal-OS look is baseline) and monochrome light-mode direction.
- Scoped first rollout to core shell surfaces (status bar, panel/window chrome, ME shell, cursor/CRT intensity), with app-interior parity deferred.

Why it matters:
- Establishes a stable cross-shell theming contract without destabilizing current ME/File workflows.
- Solves casing flexibility requirements by allowing mixed/lower rendering in light mode while preserving uppercase terminal identity in dark mode.

Risks / Notes:
- Some non-core interiors can remain dark-biased until follow-up token pass.
- Theme control is intentionally menu-only in v1 to keep settings UX minimal and avoid extra settings UI surface.
