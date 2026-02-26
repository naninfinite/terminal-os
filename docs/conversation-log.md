# Terminal-OS Conversation Log

Purpose: running summary of user/assistant decisions and direction.
Updated: 2026-02-25

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

---

## Entry 41 - M5.x Window Interaction + Stage-Bounded Maximize

Summary:
- Removed top-edge right-side resize inset so the resize hit area now spans the full top edge, including top-right above controls.
- Kept drag semantics strictly header-only with explicit left-button/action-control guards.
- Added per-window maximize/restore button (`[]`) for all ME windows.
- Maximized windows now fill the ME stage only (below `[ME.EXE]` header and above footer status token), not the global status bar region.
- Added persisted maximize state (`maximized`, `restoreRect`) with backward-safe load behavior for older snapshots.

Why it matters:
- Resolves visible light-theme gap above `_` / `X` caused by prior top-edge inset geometry.
- Completes the requested interaction lock: full-edge/corner resize plus predictable title-bar drag.
- Adds a practical first-pass maximize flow for viewer-heavy sessions (for example gallery/video exploration) without altering shell chrome structure.

Risks / Notes:
- Top-right resize and close hit areas are intentionally allowed to overlap behaviorally by user choice; accidental resize near `X` is accepted by design.
- Alternative maximize target behavior (different lower bound strategy) remains deferred for a future UX decision pass.

---

## Entry 42 - M5.x Panel Interaction Rework (Desktop-Interactive ME)

Summary:
- Reverted lightweight panel-preview behavior and restored full real-content rendering in panel mode.
- Removed panel miniature cap; panel now renders all active non-minimized ME windows (not just a top-two stack).
- Kept windows fully interactive in panel mode (drag, resize, minimize, maximize, close).
- Changed fullscreen entry behavior in panel mode to background-only double gesture:
  - Desktop: double-click stage background.
  - Touch: true double-tap stage background.
- Kept launcher interactions active in panel mode (single-click open/focus), while preventing launcher/window interactions from triggering fullscreen.
- Removed ME root single-click fullscreen open so panel interactions are no longer hijacked.

Why it matters:
- Matches the intended UX: panel behaves like a live mini desktop users can manipulate directly before entering fullscreen.
- Prevents accidental fullscreen jumps during normal panel interactions.
- Improves panel/fullscreen runtime parity by showing the complete active ME session in both contexts.

Risks / Notes:
- Rendering all windows in panel can increase visual density and overlap in compact layouts; this is now accepted by product direction.
- Maximize-control visual polish remains deferred: replace `[]` glyph with square icon treatment in a later M5.x pass.

---

## Entry 43 - Deferred TODO: ME Edge-to-Edge Framing Polish

Summary:
- User flagged that ME currently retains outer inset/padding and asked to track edge-to-edge framing as a TODO.
- Decision: keep current behavior for now; capture as a deferred M5.x polish task.
- Intended direction: remove outer ME wrapper padding/inset in panel and fullscreen so ME stage reaches frame edges, while keeping internal window/body padding unchanged.

Why it matters:
- Aligns ME shell framing with the desired “window edges at full width/height” desktop feel.
- Keeps scope narrow by separating shell-density framing from window-content spacing.

Risks / Notes:
- Treated as a styling-density tweak only; no window manager behavior changes are required.

---

## Entry 44 - M5.x FileMan Toolbar Icon Polish (Icon + Text)

Summary:
- Replaced text-only FileMan toolbar controls with icon + text controls while preserving existing control order and behavior.
- Included all requested toolbar actions in this pass:
  - `BACK`, `FWD`, `UP`
  - `NEW FOLDER`, `NEW FILE`
  - `LIST`, `GRID`
  - `RESET`
- Implemented icon visuals with CSS/ASCII-safe primitives (no SVG/icon asset pipeline).
- Kept `LIST`/`GRID` active-state behavior and added toggle semantics (`aria-pressed`) only for those two view-mode buttons.

Why it matters:
- Improves OS-like affordance and scanability in FileMan without introducing new dependencies or visual drift.
- Keeps the pass narrow and low-risk by limiting scope to FileMan toolbar chrome.

Risks / Notes:
- On very narrow widths, icon + label buttons rely on existing responsive toolbar flow and label truncation handling.
- Maximize square-glyph polish remains a separate deferred M5.x item and was intentionally not changed in this pass.

---

## Entry 45 - M5.x Edge-to-Edge ME Framing (Panel + Fullscreen)

Summary:
- Implemented the deferred shell-density polish for ME framing.
- In desktop panel mode, ME now flushes to panel edges by removing ME-specific body inset while leaving other panels unchanged.
- In fullscreen mode, removed ME fullscreen wrapper padding so the ME stage reaches the fullscreen frame edge.
- Kept internal ME window/content spacing unchanged (no changes to window body padding rules).

Why it matters:
- Aligns ME framing with the requested “window edges / 100% width” desktop feel.
- Preserves current non-ME panel styling and avoids broad layout churn.

Risks / Notes:
- This is a shell framing change only; window manager behavior is unchanged.

---

## Entry 46 - M5.x Status Language Simplification (Single Readiness Signal)

Summary:
- Simplified ME fullscreen footer copy from readiness+count to count-only.
- Footer now renders window count tokens only (`0 WINDOWS`, `1 WINDOW`, `N WINDOWS`).
- Kept global status bar `SYS: READY` unchanged as the sole readiness signal.

Why it matters:
- Removes duplicated readiness language (`SYS: READY` vs `DESKTOP READY/ACTIVE`) while preserving useful ME session context.
- Keeps footer informative without introducing extra status semantics.

Risks / Notes:
- This is a copy-only behavior change; no menu, windowing, or persistence logic changed.

---

## Entry 47 - M5.x Chrome Polish Bundle (Maximize Glyph + Panel Hover Parity + Footer Token Format)

Summary:
- Replaced ME maximize control text glyph (`[]`) with a square-style icon treatment while keeping maximize/restore logic unchanged.
- Matched panel edge hover framing across all desktop panels (`ME`, `YOU`, `THIRD`, `CONNECT`) by applying the same body-flush hover footprint treatment.
- Tightened ME footer token formatting from plain count text to structured token style (`WINDOW(S) | N`) without changing status semantics.

Why it matters:
- Improves control clarity and OS-like chrome consistency without broad layout redesign.
- Reduces visual mismatch between ME and non-ME panels in desktop hover/focus behavior.
- Keeps recent status-language simplification while improving readability of window-count footer data.

Risks / Notes:
- This bundle is visual polish only; no state, persistence, or command routing behavior changed.

---

## Entry 48 - M5.x Closeout: Remove ME Fullscreen Footer

Summary:
- Removed the ME fullscreen footer entirely.
- ME fullscreen layout now renders only header + stage (no bottom footer row/token).
- Did not relocate window count into header or status bar; count is no longer explicitly displayed in ME-local chrome.
- Kept global status bar `SYS: READY` unchanged as the sole readiness signal.

Why it matters:
- Completes the M5 shell-closeout decision for cleaner fullscreen chrome.
- Eliminates duplicated status language and reduces visual noise in ME fullscreen.

Risks / Notes:
- This is a chrome/layout cleanup only; window behavior, persistence, and menu scope logic are unchanged.

---

## Entry 49 - M6 Program Lock (Explicit Subsystem Runbook + M7 Preview)

Summary:
- User requested a clear, readable, step-by-step M6 explanation with separate deep sections for `THIRD.EXE`, `YOU.EXE`, and `CONNECT.EXE` due complexity.
- Added an explicit M6 program definition, sequencing, cross-cutting constraints, subsystem-specific tracks, and exit criteria to `docs/subsystem-expansion-roadmap.md`.
- Synced milestone language in `docs/fileman-v2-build-spec.md` so M6 is documented as subsystem parity and M7 is documented as post-parity depth work.

Why it matters:
- Converts prior directional notes into an execution-ready runbook so subsystem work can start without rediscovering scope.
- Separates complexity by subsystem so planning risk is visible early (`THIRD` runtime/perf, `YOU` moderation/safety, `CONNECT` deterministic multiplayer).
- Keeps roadmap memory stable while preserving the incremental-change rule (no one-shot redesign).

Risks / Notes:
- This is a planning/documentation lock only; no runtime behavior changed in this pass.
- M6 remains staged delivery, not an all-at-once release.

---

## Entry 50 - M6 `YOU.EXE` Persistent Board Baseline (Service + API Contract)

Summary:
- Implemented `YOU.EXE` as a message-board runtime backed by a dedicated service/provider boundary (replacing localStorage input-save behavior).
- Added frontend API contract integration for:
  - `GET /api/you/messages` (newest-first list, pagination cursor support),
  - `POST /api/you/messages` (immutable message create).
- Added shared runtime state for panel preview + fullscreen board layer.
- Added polling refresh, older-message pagination, submit guardrails, and temporary client-side post cooldown behavior.

Why it matters:
- Delivers the first online-capable subsystem architecture in M6 while keeping shell patterns consistent.
- Removes board data ownership from component-local storage and aligns with service-owned persistence direction.
- Enables durable persistence across refresh/cache clears once backend endpoint is deployed.

Risks / Notes:
- Durable cross-device persistence now depends on managed backend deployment behind `/api/you/messages`.
- This pass intentionally excludes moderation tooling and edit/delete flows (deferred to M6.x/M7).

---

## Entry 51 - Supabase State Sync (Docs + Env Template Refresh)

Summary:
- Refreshed YOU.EXE backend docs to match live Supabase state:
  - tables present (`you_messages`, `you_rate_limits`),
  - RPC present (`you_allow_post`),
  - Edge Function `you` with `GET/POST /messages` route.
- Refreshed `.env.example` for current frontend integration:
  - `VITE_YOU_API_BASE_URL` points to Supabase function base ending with `/you`,
  - optional `VITE_YOU_API_ANON_KEY` only for `verify_jwt=true`.
- Added explicit Phase 2 note that localStorage YOU input references are legacy historical context.

Why it matters:
- Keeps docs aligned with real backend state so implementation and ops guidance do not drift.
- Avoids accidental policy mistakes by reiterating no anon/public table policies and no frontend service-role keys.

Risks / Notes:
- Documentation-only refresh in this pass; no runtime/code behavior changed.

---

## Entry 52 - Cross-Surface Mobile/Tablet Hardening (Desktop-Safe)

Summary:
- Implemented a CSS-first responsiveness hardening pass across shell/app surfaces:
  - shell viewport container,
  - desktop grid/panel sizing rules,
  - status bar/menu/task strip compaction,
  - `YOU` layout truncation/wrap behavior,
  - `CONNECT` ASCII scaling,
  - ME shell window/title/control compaction and fullscreen safe-area handling,
  - FileMan and FileViewer overflow/compaction handling.
- Added shared responsive breakpoint tokens:
  - `tablet: 1024`,
  - `compact: 760`,
  - `phone: 560`,
  - `narrow: 420`.
- Added dedicated responsive baseline doc:
  - `docs/responsive-mobile-tablet-baseline.md`.

Why it matters:
- Reduces risk of mobile/tablet regressions as subsystem complexity grows.
- Preserves desktop visual/behavioral baseline while improving small-screen usability.
- Provides one source of truth for future responsive updates and validation.

Risks / Notes:
- This pass is layout/chrome hardening only; no public API/type changes were introduced.
- Manual viewport matrix checks remain required in-browser even though automated tests/build pass.

---

## Entry 53 - Session-Only YOU Dock Indicator (Status Bar)

Summary:
- Added an always-visible `YOU.EXE` task-strip item in the status bar.
- Implemented session-only indicator rules:
  - draft only: `YOU.EXE (•)`,
  - unread only: `YOU.EXE (N)`,
  - draft + unread: `YOU.EXE (N)` plus dot indicator.
- Added local `youLastSeenAt` tracking in status-bar runtime only (no localStorage/sessionStorage badge persistence).
- Added pure helper logic + unit tests for deterministic label/count/dot derivation.

Why it matters:
- Keeps `YOU.EXE` presence visible in shell navigation, even while users work elsewhere.
- Gives low-noise signal for active draft and new messages without backend/API changes.
- Preserves existing ME task-strip behavior while extending the strip with a YOU-focused entry.

Risks / Notes:
- Badge state intentionally resets on refresh (session-only by decision).
- Unread resets when `YOU` is focused/open, including fullscreen.

---

## Entry 54 - Subsystem Dock Navbar + Fullscreen Routing Matrix

Summary:
- Expanded the status-bar strip into a permanent subsystem navbar ordered as `ME.EXE`, `YOU.EXE`, `THIRD.EXE`, `CONNECT.EXE`.
- Added deterministic dock click routing:
  - desktop state: `ME`/`THIRD`/`CONNECT` open fullscreen, `YOU` focuses panel;
  - fullscreen state: dock clicks switch fullscreen target, including `YOU`;
  - same-target fullscreen clicks are no-op.
- Preserved existing ME window task buttons after the permanent subsystem buttons.
- Added `THIRD` and `CONNECT` runtime providers and fullscreen layers so those subsystems now support fullscreen shell routing.
- Kept `YOU` draft/unread dock behavior unchanged.

Why it matters:
- Gives the status bar a stable pseudo-navbar role across subsystem navigation.
- Aligns dock interactions with current desktop/fullscreen context without replacing existing ME task affordances.
- Establishes subsystem parity infrastructure for M6 while keeping behavior deterministic and testable.

Risks / Notes:
- ME right-click window-ladder popup is intentionally deferred to a follow-up milestone.
- `THIRD` and `CONNECT` notification counts remain future-ready but inactive (`N=0`) in this pass.

---

## Entry 55 - ME Dock Window Ladder (Deferred Follow-Up)

Summary:
- Implemented the deferred ME dock follow-up: right-clicking `ME.EXE` in the status-bar dock now opens a window ladder popup.
- Popup lists current ME windows in top-first order and supports direct jump/focus actions per window.
- Selecting a window routes to `ME.EXE` fullscreen (if needed) and restores/focuses that specific window.
- Kept left-click ME dock behavior unchanged.

Why it matters:
- Adds fast cross-scope window targeting for ME without replacing existing task-strip behavior.
- Makes multi-window ME sessions easier to navigate from desktop and other subsystem contexts.

Risks / Notes:
- Mobile dock responsiveness regression discovered after subsystem dock expansion remains unresolved in this pass by user request.
- TODO: schedule a focused mobile/tablet dock compaction hardening pass for subsystem buttons + overflow behavior.

---

## Entry 56 - Dock Simplification: Remove ME Per-Window Task Buttons

Summary:
- Removed ME per-window task buttons from the global dock/task strip.
- Kept ME window access via the new `ME.EXE` right-click window ladder popup.
- Kept left-click ME dock behavior unchanged.

Why it matters:
- Reduces dock clutter now that ME window targeting is available through the ladder.
- Preserves fast access to ME windows without duplicating dock affordances.

Risks / Notes:
- Mobile dock responsiveness TODO remains open and unchanged in this pass.

---

## Entry 57 - Unified Right-Click / Long-Press Menus (Dock + Panel Roots, V1)

Summary:
- Added a shared context-trigger interaction layer for desktop right-click plus mobile/touch long-press.
- Applied this to subsystem dock buttons and desktop panel roots (`ME`, `YOU`, `THIRD`, `CONNECT`) without changing left-click behavior.
- Kept `ME.EXE` dock context path ladder-first and appended safe action rows (`OPEN ME.EXE`, `OPEN FILE`, `OPEN PROJECTS`, `OPEN MEDIA`).
- Added deterministic subsystem context-menu model helpers and unit tests.
- Added `YOU` context status rows (draft/unread) while keeping existing session-only dock badge semantics intact.
- Added disabled TODO placeholder rows for future `THIRD` and `CONNECT` advanced context actions.

Why it matters:
- Establishes one reusable interaction contract for context menus across desktop and touch devices.
- Improves subsystem discoverability and quick actions without backend/API changes.
- Keeps scope intentionally narrow for low-regression rollout (dock + panel roots only).

Risks / Notes:
- V1 intentionally excludes new global FileMan create commands (`new file` / `new folder`) from dock menus.
- Existing dock mobile compaction responsiveness issue remains tracked as a follow-up and was not addressed in this pass.

---

## Entry 58 - THIRD.EXE V1 Playground Baseline (Object-Mode + Physics + Local Autosave)

Summary:
- Replaced the placeholder rotating `THIRD` demo with a provider-owned V1 playground runtime.
- Added runtime contract + persistence boundary:
  - `src/third/types.ts`,
  - `src/third/state.ts`,
  - `src/third/storage.ts`,
  - refactored `src/third/ThirdProvider.tsx`.
- Implemented V1 scene baseline in `src/components/THIRD/THIRD.tsx`:
  - default scene boot (`grid + axes + cube`),
  - object list and primitive actions (`cube/sphere/cylinder/plane`),
  - single-select, duplicate, delete.
- Implemented `EDIT` mode behavior:
  - physics pause,
  - transform gizmo (`W/E/R`),
  - snap toggle (`G`),
  - visible `EDIT` indicator.
- Implemented `PLAY` mode behavior with `cannon-es`:
  - fixed timestep rigid-body stepping,
  - fixed-depth ray grab constraint,
  - orbit lock while grabbing,
  - touch rule: one-finger grab + two-finger camera override while grabbed.
- Added user-clickable animation presets in edit mode:
  - `bounce`,
  - `rotate`,
  - `pulse`,
  - metadata persisted per object.
- Updated shell integration:
  - start menu now includes THIRD mode toggle command,
  - THIRD subsystem context menu now shows mode status + dynamic mode-switch action,
  - reset action routes to provider reset.
- Added/updated tests:
  - `src/third/state.test.ts`,
  - `src/third/storage.test.ts`,
  - `src/meos/menu/scopes.test.ts`,
  - `src/components/StatusBar/subsystemContextMenu.test.ts`.
- Added docs source-of-truth:
  - `docs/third-exe/THIRD-V1-RUNTIME-CONTRACT.md`,
  - roadmap checkpoint update in `docs/subsystem-expansion-roadmap.md`.

Why it matters:
- Moves `THIRD.EXE` from visual placeholder to an interaction-capable subsystem aligned with M6 parity direction.
- Establishes stable runtime/persistence contracts for future skybox and deeper editor features.
- Keeps panel/fullscreen state shared via provider while preserving shell/menu consistency.

Risks / Notes:
- Local storage persistence remains single-device/browser profile only (expected for V1).
- Added physics dependency increases client bundle size for THIRD runtime paths.
- Scene interactions are verified by build/unit tests; deeper pointer/gesture behavior still requires in-browser manual validation.

---

## Entry 59 - THIRD.EXE Tweak Pass (Optional Physics + Solid Materials + Visibility/Theme Polish)

Summary:
- Updated THIRD runtime state and persistence contract to support optional physics:
  - global `physicsEnabled` master toggle (default `OFF`),
  - per-object `physicsEnabled` flags (default `OFF`).
- Updated shell integration for physics controls:
  - added `third_toggle_physics` to start menu scope,
  - added THIRD context-menu physics status + action row,
  - wired physics toggle action handling in status bar.
- Updated THIRD scene behavior:
  - play-mode simulation/grab now requires global + object physics enabled,
  - turning global physics off during play safely releases grab and freezes objects at current transforms,
  - right-mouse pan and touch two-finger dolly/pan remain available when not actively grabbing.
- Updated THIRD visuals:
  - retired wireframe for primitives and normalized legacy wireframe state to solid rendering,
  - switched THIRD control styling to accent-driven green in light theme,
  - restored default AxesHelper RGB coloring.
- Added/updated tests for state/storage/menu/context physics behavior.

Why it matters:
- Makes physics a deliberate user choice rather than always-on behavior.
- Improves light-theme readability and keeps THIRD visuals aligned with system accent styling.
- Preserves compatibility with existing saved scenes while extending persisted scene metadata safely.

Risks / Notes:
- Existing saved scenes migrate with missing physics fields defaulting to `false`.
- Full interaction correctness still depends on in-browser manual pointer/touch validation in addition to unit/build checks.

---

## Entry 60 - THIRD.EXE Material Selector Pass (Preset + Color)

Summary:
- Added per-object material metadata in THIRD runtime state and persistence:
  - `material.preset` (`matte`, `gloss`, `glass`, `neon`),
  - `material.color` (hex),
  - legacy/missing material fields sanitize to safe defaults.
- Added provider actions to mutate selected object materials:
  - `setObjectMaterialPreset(id, preset)`,
  - `setObjectMaterialColor(id, color)`.
- Updated THREE runtime rendering path:
  - switched object materials to `THREE.MeshPhongMaterial`,
  - added ambient + directional lighting for visible preset differences,
  - applied preset-specific shading profiles and preserved custom object colors.
- Added EDIT-mode material controls in THIRD HUD:
  - preset buttons,
  - color swatches,
  - native color input.
- Added/updated tests for state + storage material persistence/sanitization behavior.

Why it matters:
- Gives users a fast, clickable styling workflow without introducing a full inspector yet.
- Keeps material choices persistent across refresh/reopen and compatible with older saved scenes.

Risks / Notes:
- Material presets are intentionally lightweight profiles and may be tuned further during inspector work.
- Lighting values are calibrated for current THIRD scene defaults and may need adjustment if skybox/lighting systems expand.

---

## Entry 61 - THIRD.EXE Transform Inspector Pass (Unity-Style, Transform-Only)

Summary:
- Added a right-docked transform inspector in `EDIT` mode for the selected object.
- Inspector includes grouped vector fields for:
  - `Position` (X/Y/Z),
  - `Rotation` (X/Y/Z, degrees in UI),
  - `Scale` (X/Y/Z, clamped to minimum).
- Added live typing behavior:
  - valid numeric values update runtime transform immediately,
  - invalid/partial input remains local draft until blur/reset.
- Added gizmo-to-inspector synchronization improvements:
  - transform gizmo `objectChange` now pushes runtime transform updates continuously with `requestAnimationFrame` throttling,
  - existing mouse-up save path remains intact.
- Added transform inspector helper utilities and unit tests for:
  - degree/radian conversion,
  - numeric parsing,
  - scale clamping,
  - stable formatting.

Why it matters:
- Introduces a familiar editor workflow comparable to Unity/Blender/Godot transform panels.
- Keeps gizmo and numeric editing fully synchronized without forcing users into one interaction path.

Risks / Notes:
- Inspector is intentionally transform-only in this pass (no hierarchy/tag/layer/prefab concepts).
- Undo/redo is still out of scope and remains a follow-up concern for heavy numeric editing sessions.

---

## Entry 62 - THIRD.EXE V1.3 Viewport Menu + Inspector Consolidation

Summary:
- Replaced blocking floating viewport HUD controls with an inspector-first layout.
- Added a Blender-style viewport right-click menu with grouped actions:
  - `ADD` (cube/sphere/cylinder/plane),
  - `CAMERA` (projection toggle, top/front/right, reset),
  - `SCENE` (play/edit, snap, global physics),
  - `OBJECT` (duplicate/delete/object physics),
  - `INSPECTOR` (show/hide/collapse/expand).
- Added right-click drag tolerance so right-drag camera panning does not open the menu.
- Added per-instance menu behavior to select an object on right-click hit before opening menu actions.
- Consolidated all edit controls into a right-docked, collapsible/hideable inspector:
  - scene controls,
  - object management,
  - transform fields,
  - animation presets,
  - object physics,
  - material controls.
- Added camera projection runtime support and persistence:
  - perspective/orthographic switching,
  - projection mode saved in camera state,
  - camera preset view actions around current target.
- Restored wireframe as a real per-object material option (default remains solid).
- Added viewport menu helper and tests (`thirdViewportMenu.ts` + `thirdViewportMenu.test.ts`).

Why it matters:
- Keeps the viewport clear for interaction and aligns workflow with DCC-style discoverability.
- Preserves existing shared-runtime architecture while adding practical camera/view tooling.
- Brings material behavior in line with user expectation (wireframe optional, persisted).

Risks / Notes:
- Inspector visibility/collapse state is runtime-local and resets on reload by design.
- Camera preset selection itself is not persisted; projection mode is persisted.
- Interaction details (right-click tolerance, touch pan/grab interplay) are covered by unit/build checks and still require manual browser verification.

---

## Entry 63 - THIRD Inspector Refinement (Camera Section + Cleaner Defaults)

Summary:
- Added a dedicated `CAMERA` section inside the right inspector.
- Inspector camera controls now include:
  - projection toggle (`PERSPECTIVE`/`ORTHOGRAPHIC`),
  - quick views (`TOP`, `FRONT`, `RIGHT`),
  - camera reset.
- Updated default inspector expansion behavior to reduce initial visual noise:
  - open by default: `SCENE`, `CAMERA`, `OBJECTS`, `TRANSFORM`;
  - collapsed by default: `ANIMATION`, `PHYSICS`, `MATERIAL`.
- Kept right-click viewport menu camera actions in parallel and added inspector hint text to reinforce discoverability.

Why it matters:
- Makes camera workflow available without right-click dependency.
- Improves first-run inspector readability while preserving full functionality.

Risks / Notes:
- Inspector expansion state remains runtime-local and resets on reload by design.

---

## Entry 64 - Deferred TODO: THIRD Light-Theme Grid Tone + Spawn Material Follow-Up

Summary:
- Captured a deferred THIRD visual follow-up with no runtime/code changes in this pass.
- Locked a future implementation target: in light theme, THIRD grid color should move from accent green to near-black `#101010`.
- Recorded that default spawn material color direction is unresolved and intentionally postponed.
- Confirmed current default spawn behavior remains unchanged until a dedicated material-direction pass.

Why it matters:
- Aligns light-theme THIRD scene styling with the monochrome/low-emissive light-theme direction.
- Prevents premature color-direction churn while higher-priority subsystem work continues.
- Creates an explicit acceptance target so the later implementation pass is deterministic.

Risks / Notes:
- Deferred item only; no behavior changed in this entry.
- Later implementation acceptance target:
  - dark theme grid behavior stays as-is (accent-driven),
  - light theme grid renders near-black `#101010`,
  - existing object material colors remain intact,
  - default spawn color remains current value in that pass,
  - theme switches must not remount/reset THIRD runtime state.
- Spawn material default policy remains open for a separate follow-up (candidates: neutral monochrome default, theme-derived default, or preset-derived defaults).

---

## Entry 65 - THIRD Viewport Right-Click Isolation (Panel Context Suppression)

Summary:
- Fixed a context-routing conflict where right-clicking inside the THIRD viewport could trigger both:
  - the THIRD viewport object menu flow, and
  - parent panel context handling.
- Updated THIRD canvas context-menu handling to stop propagation after preventing default browser context menus.
- Marked THIRD root as a context-ignore subtree so panel-level context triggers do not activate from interactions inside THIRD content.

Why it matters:
- Keeps THIRD right-click behavior deterministic for object/viewport actions.
- Prevents accidental subsystem panel context/menu openings while editing scene objects.

Risks / Notes:
- Scope is intentionally narrow to THIRD interaction routing only.
- Dock/context behavior outside THIRD remains unchanged.

---

## Entry 66 - THIRD Theme Color Pass (Light Grid + Default Material Tone)

Summary:
- Implemented the deferred THIRD light-theme visual pass.
- Grid rendering is now theme-specific:
  - dark remains accent green,
  - light now uses near-black `#101010`.
- Default material color behavior is now theme-semantic in renderer:
  - legacy/default `#00ff66` values resolve to near-black in light theme,
  - dark theme continues to resolve that default to green.
- Explicit custom material colors remain unchanged across themes.
- Added `thirdTheme` helper tests for palette resolution + legacy-default color mapping behavior.

Why it matters:
- Aligns THIRD light theme with monochrome shell direction and removes green-heavy visuals.
- Preserves compatibility with existing saved scenes while improving light-theme readability.

Risks / Notes:
- Intentional tradeoff: objects explicitly set to `#00ff66` are treated as semantic default and will render as near-black in light theme.
- If users need always-green objects across themes, they should pick a non-default custom green.

---

## Entry 67 - THIRD Scene Helper Visibility Controls (Grid/Axes Off by Default)

Summary:
- User requested removing the always-visible center axes helper and making both scene helpers configurable from inspector controls.
- Implemented `GRID` and `AXES` toggles in the inspector `SCENE` section.
- Updated runtime defaults so both helpers start `OFF` for new/reset scenes.
- Added persistence and sanitization support for helper visibility flags so saved scenes restore helper preferences.

Why it matters:
- Reduces default viewport clutter and keeps first-run scene presentation cleaner.
- Preserves discoverability by keeping helper controls explicit in inspector instead of hidden keybinds.
- Maintains deterministic behavior across reloads by persisting helper toggle state.

Risks / Notes:
- Legacy saved payloads without helper fields sanitize to `showGrid=false` and `showAxes=false`.
- Grid color/theme behavior remains unchanged when grid is toggled on (dark green-accent, light near-black).

---

## Entry 68 - THIRD Inspector + Physics Night Pass (Per-Object Play-Only Physics)

Summary:
- Implemented the requested THIRD cleanup pass focused on inspector UX and physics behavior.
- Physics model now uses per-object toggles only:
  - simulation/grab runs only in `PLAY`,
  - all physics is frozen/disabled in `EDIT`,
  - new objects keep per-object physics default `OFF`.
- Removed obsolete global physics controls from:
  - inspector `SCENE` controls,
  - viewport context menu `SCENE` group,
  - start menu THIRD scope,
  - subsystem context menu THIRD actions/status.
- Updated inspector defaults and controls:
  - inspector now starts hidden (`SHOW INSPECTOR` entry),
  - all inspector sections start collapsed,
  - removed inspector mode-switch button,
  - kept transform play-mode guidance text as read-only status.
- Updated transform hotkeys/UI labels:
  - `W` move,
  - `R` rotate,
  - `S` scale,
  - `G` snap unchanged.
- Added two-column inspector action-row alignment pass for more consistent control layout.

Why it matters:
- Resolves confusion where physics appeared broken due to mixed global + object gating.
- Makes inspector startup cleaner and reduces default UI clutter.
- Aligns transform keymap with requested ergonomic mapping.
- Keeps behavior deterministic across panel/fullscreen and persisted scene reloads.

Risks / Notes:
- Legacy saved payloads that include old global physics field are tolerated and safely ignored.
- Mode-switching remains available outside inspector (viewport menu and shell-level THIRD actions).

---

## Entry 69 - Deferred TODO: Inspector Button Sizing + Selection Scope + Future Primitive Set

Summary:
- Captured follow-up UI polish request for THIRD inspector button sizing consistency.
- Specific issue noted: the camera projection toggle (`PERSPECTIVE`/`ORTHOGRAPHIC`) and adjacent `RESET` button should be uniform in size/width with surrounding controls.
- Locked decision to defer drag-box multi-select for now (not in immediate scope).
- Locked decision to defer broader inspector UX cleanup to a later dedicated pass.
- Captured future primitive expansion as open design follow-up.

Why it matters:
- Uneven button sizes reduce visual consistency and make inspector controls feel noisy.
- Explicitly deferring multi-select avoids scope creep while current interaction model stabilizes.
- Primitive expansion can improve scene-blockout workflow once current UX baseline is stable.

Risks / Notes:
- Deferred item only in this pass; no runtime behavior changed.
- Candidate primitives for later evaluation:
  - `cone`,
  - `torus`,
  - `capsule`,
  - `pyramid` (or generic poly prism),
  - `icosphere`.

---

## Entry 70 - THIRD Hierarchy UX Polish (Rename + Unparent + Drop Affordance)

Summary:
- Implemented hierarchy workflow polish inside the inspector `OBJECTS` section.
- Added inline object rename in hierarchy rows:
  - `double-click` to rename,
  - `F2` shortcut to rename selected object,
  - `Enter` to commit / `Escape` to cancel.
- Added explicit selected-object `UNPARENT` action in inspector controls.
- Added stronger hierarchy drag/drop affordances:
  - valid drop targets now show a dashed hint while dragging,
  - active target remains clearly highlighted.
- Added minimal runtime support for safe object renaming via provider/state action (`setObjectName`) with trim + empty fallback behavior.

Why it matters:
- Reduces friction in common hierarchy tasks (naming and restructuring).
- Makes hierarchy parenting interactions easier to understand before adding richer context actions.
- Keeps keyboard-first editing viable (`F2`, Enter/Escape) and avoids click-only flows.

Risks / Notes:
- Rename is intentionally simple in this pass (single-line name, no batch rename).
- Hierarchy context-menu actions are deferred to a later dedicated pass.

---

## Entry 71 - Deferred TODO: Hierarchy Context Menu + Inspector Order + Scene Toolbar Concept

Summary:
- Captured additional deferred THIRD UX requests from active iteration:
  - add right-click options directly in hierarchy rows,
  - revisit inspector section ordering in a later pass,
  - evaluate an icon-based scene toolbar row at top-left (Unity/Blender-like quick actions).

Why it matters:
- Preserves discoverability goals while preventing immediate scope bloat in the hierarchy polish pass.
- Locks requested direction so future inspector/menu refactors stay aligned with user intent.

Risks / Notes:
- Deferred only; no behavior change in this log-only entry.

---

## Entry 72 - Deferred TODO: Mobile Long-Press Highlight Suppression (THIRD Priority)

Summary:
- Captured mobile interaction follow-up for long-press context behavior.
- User requested reducing/removing highlight/selection artifacts that interfere with long-press acting as right-click, prioritized for `THIRD` first.
- Kept broader site-wide highlight policy as a separate follow-up after THIRD validation.

Why it matters:
- Mobile text/tap highlight behavior can conflict with reliable long-press context triggers.
- Improving this in THIRD first should make object/context workflows more consistent on touch devices.

Risks / Notes:
- Deferred only in this pass; no runtime behavior changes yet.
- Scope should start on interactive THIRD surfaces to avoid unintentionally disabling useful text selection elsewhere.

---

## Entry 73 - THIRD Hierarchy Context Menu (Right-Click + Keyboard Context Key)

Summary:
- Added hierarchy-row context menu actions directly inside inspector `OBJECTS` hierarchy.
- Menu actions:
  - `RENAME`,
  - `DUPLICATE`,
  - `DELETE`,
  - `UNPARENT`.
- Added keyboard-accessible context-open path for focused hierarchy row:
  - `ContextMenu` key,
  - `Shift + F10`.
- Added deterministic menu-model helper/tests (`thirdHierarchyMenu.ts` + `thirdHierarchyMenu.test.ts`).

Why it matters:
- Delivers the requested Blender-style right-click object actions in hierarchy without adding viewport clutter.
- Keeps interactions accessible beyond pointer-only usage.
- Makes hierarchy operations faster by reducing travel to separate inspector buttons.

Risks / Notes:
- Current menu is object-row scoped; root-level hierarchy context actions remain future work.
- Duplicate/delete actions intentionally mirror existing selection-based behavior.

---

## Entry 73 - Consolidated Open TODO Snapshot (By Subsystem) + New THIRD Animation TODO

Summary:
- Ran a full unresolved TODO/deferred sweep across:
  - `docs/conversation-log.md`,
  - `docs/third-exe/THIRD-V1-RUNTIME-CONTRACT.md`,
  - `docs/fileman-v2-build-spec.md`,
  - active placeholder TODO markers in source.
- Consolidated current open backlog by subsystem so older deferred items are not lost.
- Added a new `THIRD` deferred TODO:
  - animation presets should evaluate in both `EDIT` and `PLAY`,
  - physics simulation remains strictly `PLAY`-only.

Why it matters:
- Restores a single actionable view of unresolved work after many incremental passes.
- Reduces risk of regressions or duplicate discussions by keeping pending decisions explicit.

Open TODOs - ME.EXE / Shell:
- Lowercase location token styling remains deferred (`Entry 39`).
- Alternative maximize lower-bound strategy remains deferred (`Entry 41`).
- Mobile/tablet dock compaction hardening remains open (`Entry 55` / `Entry 56`).
- Launcher shelf placement polish remains an optional follow-up (`fileman-v2-build-spec` section 8.3).
- Deep app-interior light-theme parity remains deferred (`fileman-v2-build-spec` section 8.4).

Open TODOs - YOU.EXE:
- Moderation tooling and edit/delete flows remain deferred to post-baseline passes (`Entry 50`).

Open TODOs - THIRD.EXE:
- Spawn material palette/default policy follow-up remains open (`Entry 64`, runtime contract deferred notes).
- Inspector camera-row sizing normalization remains open (`Entry 69`).
- Drag-box multi-object selection remains explicitly out of current scope (`Entry 69`).
- Broader inspector UI/UX cleanup remains deferred (`Entry 69`).
- Primitive catalog expansion remains open (`Entry 69`).
- Hierarchy row context actions remain deferred (`Entry 71`).
- Inspector section ordering revisit remains deferred (`Entry 71`).
- Scene quick-toolbar concept remains deferred (`Entry 71`).
- Mobile long-press highlight suppression remains deferred (`Entry 72`).
- Transform-editing undo/redo remains deferred (`Entry 61`).
- New deferred item:
  - allow animation presets to run in both `EDIT` and `PLAY`,
  - keep physics behavior as `PLAY`-only.

Open TODOs - CONNECT.EXE:
- Replace disabled context action `TODO: NOTIFICATION ACTIONS` with real notification actions (`src/components/StatusBar/subsystemContextMenu.ts`).
- Deterministic gameplay parity roadmap remains open (local `Pong` baseline, `Tron` target, staged multiplayer path in subsystem roadmap).

Risks / Notes:
- Backlog capture only; no runtime behavior changes were made in this pass.
- This snapshot is intentionally explicit about both short-term polish TODOs and larger subsystem-depth follow-ups.

---

## Entry 74 - THIRD V1.4 Layout Split (Scene Window + External Toolbar + Mobile Drawer)

Summary:
- Refactored THIRD utility layout into two windows plus one external toolbar:
  - left `SCENE` window for object hierarchy,
  - right `INSPECTOR` window for object editing sections,
  - top-left scene toolbar for mode/gizmo/snap/grid/axes.
- Removed persistent object action rows from scene list UI:
  - `ADD OBJECT`, `DUP`, `DEL`, `RENAME`, `UNPARENT` buttons no longer shown in scene window.
- Kept object operations menu-driven:
  - viewport right-click `ADD` actions for primitive creation,
  - hierarchy row context menu for `RENAME`, `DUPLICATE`, `DELETE`, `UNPARENT`.
- Added mobile utility fallback:
  - single bottom drawer with `SCENE | INSPECTOR` switcher,
  - default active tab is `SCENE`.
- Added deterministic toolbar model/tests:
  - `thirdSceneToolbar.ts`,
  - `thirdSceneToolbar.test.ts`.

Why it matters:
- Keeps viewport interaction area clearer by moving frequent scene controls to compact toolbar.
- Aligns workflow with DCC/editor mental model (project-style scene list + dedicated inspector).
- Preserves keyboard and context-menu access while reducing persistent UI clutter.

Risks / Notes:
- Utility window visibility and mobile tab state are runtime-local only (not persisted).
- Camera controls remain in inspector + viewport menu in this pass.

---

## Entry 75 - THIRD Camera Toolbar Quick Actions (Projection + Presets + Reset)

Summary:
- Expanded top-left scene toolbar to include camera quick controls:
  - projection toggle,
  - `TOP`/`FRONT`/`RIGHT` preset views,
  - camera reset.
- Kept existing camera control paths in place:
  - inspector camera section,
  - viewport right-click camera menu.
- Updated scene-toolbar model/tests to cover new action set and disabled/active behavior.

Why it matters:
- Moves common camera navigation closer to viewport interaction without opening menus or inspector sections.
- Aligns toolbar direction with external-controls-first workflow.
- Preserves discoverability by keeping redundant fallback paths.

Risks / Notes:
- Toolbar density is higher with added camera buttons; future icon sizing/compaction may still be needed.
- No runtime/persistence contract changes required.

---

## Entry 76 - THIRD Hierarchy Context Expansion (Focus + Scene Add Menu)

Summary:
- Expanded hierarchy context actions to support two contexts:
  - object row menu now includes `FOCUS`, `RENAME`, `DUPLICATE`, `DELETE`, `UNPARENT`,
  - scene/root blank-area menu now supports primitive add (`CUBE`, `SPHERE`, `CYLINDER`, `PLANE`).
- Added keyboard-accessible scene-context open path (`ContextMenu` key / `Shift + F10`) on hierarchy container/root.
- Added hierarchy visual polish:
  - clearer row hover/active contrast,
  - compact spacing improvements,
  - explicit focus-visible treatment on hierarchy container.

Why it matters:
- Keeps object operations menu-driven while restoring fast add/focus actions directly where users manage scene structure.
- Improves keyboard-first parity and avoids pointer-only context workflows.

Risks / Notes:
- Scene-context add currently covers primitives only (no empty/group object creation in this pass).
- Context actions remain intentionally local to the SCENE hierarchy surface.

---

## Entry 77 - THIRD Camera Navigation Polish (Focus Framing + Hotkeys + Regression Helpers)

Summary:
- Updated `FOCUS` behavior to truly frame selected objects instead of only re-centering:
  - framing distance now adapts by object bounds with stable near minimum,
  - camera applies a `+2Y` offset for readability,
  - orthographic mode updates zoom to keep focused object visible.
- Added Blender-style camera hotkeys:
  - `1` front,
  - `3` right,
  - `7` top,
  - `5` perspective/orthographic toggle,
  - `F` focus selected object.
- Added deterministic camera-control helper/tests:
  - `thirdCameraControls.ts`,
  - `thirdCameraControls.test.ts`,
  - hotkey routing + focus-distance math are now unit-covered.

Why it matters:
- Improves navigation speed and makes focus action reliable from both near and far camera states.
- Locks key camera interaction rules behind deterministic tests to reduce regression risk in future inspector/camera passes.

Risks / Notes:
- Numeric hotkeys are intentionally ignored while typing in interactive controls; non-input viewport usage now reserves `1/3/7/5`.

---

## Entry 78 - THIRD Inspector Usability Polish (Default Transform Open + Camera Row Contract)

Summary:
- Updated inspector defaults so `TRANSFORM` opens by default while other sections start collapsed.
- Added deterministic camera-layout helper/tests for inspector camera controls:
  - top row remains `TOP` / `FRONT` / `RIGHT`,
  - second row remains projection toggle + `RESET`.
- Applied inspector spacing/sizing polish:
  - section/header/body spacing is more consistent,
  - action buttons share more uniform heights and row rhythm,
  - material color control aligns with adjacent action button sizing.

Why it matters:
- Improves first-time usability for non-3D users by exposing transform immediately without extra clicks.
- Prevents accidental camera-row regressions by locking the intended row order in a focused test.
- Reduces visual noise and inconsistent control sizing across inspector sections.

Risks / Notes:
- This is a UI/interaction polish pass only; no persistence/state schema changes.
