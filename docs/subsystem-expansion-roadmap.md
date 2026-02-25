# Subsystem Expansion Roadmap (M6 Program: YOU / THIRD / CONNECT)

Status: M6 planning baseline (no large one-shot implementation)  
Date captured: 2026-02-08  
Last updated: 2026-02-25  
Purpose: Preserve future intent so subsystem delivery stays aligned when we shift from ME-focused work into full panel parity.

---

## 1) Core Intent

All four desktop panels should eventually follow the same interaction model as `ME.EXE`:

- Live preview state visible in the desktop panel.
- Enter fullscreen using the same running runtime (no duplicate instance).
- Exit fullscreen back to desktop with state preserved.
- Mode-aware behavior (`panel` lightweight, `fullscreen` full fidelity).

This is architecture-first guidance and should be shipped incrementally.

---

## 2) M6 Definition (Plain English)

`M6` is the subsystem-parity milestone after ME shell closeout:

- `THIRD.EXE` moves from visual demo to a real mode-aware subsystem.
- `YOU.EXE` moves from placeholder/local-only behavior toward a persistent message-board architecture with moderation gates.
- `CONNECT.EXE` moves from static placeholder to a deterministic game runtime baseline (`Pong` first, `Tron` target).

M6 does not mean all advanced features launch at once.  
M6 means each subsystem has a clear runtime/service boundary and reaches baseline panel/fullscreen parity.

---

## 3) M6 Exit Criteria

M6 is complete when all of the following are true:

1. `THIRD`, `YOU`, and `CONNECT` each run as shared panel/fullscreen runtimes (same state instance).
2. Each subsystem has an explicit service/store boundary (no ad-hoc component-owned persistence for core state).
3. Fullscreen subsystem layers reserve global status bar space.
4. Scope-aware menu entries for each subsystem are functional (not placeholder-only).
5. Baseline safety/performance rules are active per subsystem (documented below).

---

## 4) Cross-Cutting Constraints (Applies to All M6 Tracks)

1. Terminal-OS styling remains primary; no broad aesthetic reset.
2. Changes ship in small reviewable passes (one narrow goal at a time).
3. Panel mode stays lightweight and readable; fullscreen mode carries full interaction depth.
4. Menu and status bar remain global shell surfaces.
5. Fullscreen must not overlap the global status bar.

---

## 5) M6 Step-by-Step Delivery Order

### Step 1 - Shared Subsystem Runtime Contract

Required before deep subsystem work:

- Common `displayMode: panel | fullscreen` handling per subsystem.
- Shared lifecycle hooks for pause/resume/throttle behavior.
- Scope-aware menu wiring for subsystem-specific actions.

Why first:

- Prevents each subsystem from inventing incompatible runtime patterns.

### Step 2 - `THIRD.EXE` Parity Track

Goal: make THIRD the first non-ME subsystem with full parity behavior.

Current implementation checkpoint (2026-02-25):

- Runtime/provider boundary is now active:
  - shared scene state for panel + fullscreen;
  - local autosave persistence with versioned payload;
  - menu/context actions can switch `PLAY`/`EDIT` mode.
- V1 object-mode baseline is now active:
  - default grid + axes + cube scene bootstrap;
  - primitive add/select/duplicate/delete;
  - edit gizmo (`move/rotate/scale`) + snap toggle.
- V1 play interaction baseline is now active:
  - `cannon-es` rigid-body world;
  - fixed-depth grab/drag constraint;
  - orbit lock while grabbing (with touch two-finger camera override).
- V1 animation preset baseline is now active:
  - object-level `bounce`, `rotate`, `pulse` presets in edit mode.
- V1 tweak pass baseline is now active:
  - global physics master toggle defaults `OFF`;
  - per-object physics toggle defaults `OFF`;
  - play-mode simulation/grab requires global + object physics `ON`;
  - primitives default to solid accent materials with per-object wireframe option;
  - axes helper keeps default RGB colors for visibility.
- V1.3 viewport workflow baseline is now active:
  - floating left HUD replaced by right-docked inspector workflow;
  - viewport right-click menu provides grouped quick actions;
  - camera supports perspective/orthographic switching + top/front/right/reset actions;
  - camera projection mode persists in autosave payload.

Implementation slices:

1. Extract scene/object state into a dedicated service/store.
2. Panel profile:
  - freeze or heavily throttle simulation/render loop;
  - keep current scene state visible.
3. Fullscreen profile:
  - full object interaction (add/remove/transform).
4. Localization foundation:
  - Japanese labels via localization keys/config (no hardcoded strings).
5. Theme/profile parity:
  - scene and shell chrome must track active theme mode without remount instability.

M6 acceptance for THIRD:

- Returning between panel/fullscreen keeps the same scene instance.
- Panel mode is visibly lighter-weight than fullscreen mode.
- Japanese UI text can be changed centrally via localization map.

### Step 3 - `YOU.EXE` Parity Track

Goal: move from local demo behavior to architecture that can support a real public board.

Current implementation checkpoint (2026-02-24):

- Frontend runtime/service boundary implemented:
  - shared `YOU` provider state for panel + fullscreen board views;
  - API client contract for `GET/POST /api/you/messages`;
  - immutable post flow with polling refresh + older-page loading.
- Backend checkpoint:
  - Supabase tables (`you_messages`, `you_rate_limits`), RPC (`you_allow_post`), and Edge Function (`you`) are configured.
  - Remaining integration work is environment wiring and smoke validation per deploy target.

Implementation slices:

1. Create message service boundary (CRUD + pagination primitives).
2. Define message model:
  - `id`, `body`, `displayName?`, `isAnon`, `createdAt`, moderation fields.
3. Panel profile:
  - compact composer + recent activity preview.
4. Fullscreen profile:
  - full board/thread view.
5. Moderation baseline before public rollout:
  - rate limiting, report flow, abuse filter hooks, hide/review path.

M6 acceptance for YOU:

- Subsystem runs with shared panel/fullscreen runtime.
- Data model and service boundary are stable.
- Moderation gate is present in architecture (even if policy tooling continues in M6.x).

Launch note:

- Local-only storage is acceptable for early internal milestones.
- Public shared board requires backend persistence/API and moderation operations.

### Step 4 - `CONNECT.EXE` Parity Track

Goal: establish deterministic game runtime baseline and hub flow.

Implementation slices:

1. Build deterministic local game loop primitives first (fixed timestep).
2. Implement local `Pong` baseline (2-player same device).
3. Implement local `Tron` baseline target (4-player same device).
4. Add hub runtime:
  - panel shows lightweight lobby/session snapshot;
  - fullscreen hosts active game/hub.
5. Multiplayer phase (optional inside M6, otherwise M6.x):
  - room/session management;
  - realtime sync + reconnect handling;
  - authority model for fair play.

M6 acceptance for CONNECT:

- Deterministic local game baseline exists and is stable.
- Hub follows shared panel/fullscreen runtime pattern.
- Multiplayer path is explicitly designed and staged, even if full online rollout is deferred.

---

## 6) Complexity Notes by Subsystem

### `THIRD.EXE` Complexity

- Primary complexity is runtime/performance control (render loop, simulation throttling, scene persistence).
- Lower backend risk than YOU/CONNECT, making it a good first parity target.

### `YOU.EXE` Complexity

- Primary complexity is trust/safety and moderation operations, not UI rendering.
- Architecture must assume public misuse from day one.

### `CONNECT.EXE` Complexity

- Primary complexity is deterministic multiplayer networking and session handling.
- Game logic is straightforward relative to sync/reconnect/state authority concerns.

---

## 7) Suggested Sequencing (Pragmatic)

1. Shared subsystem contract (Step 1).
2. `THIRD` full parity baseline.
3. `YOU` service + moderation baseline.
4. `CONNECT` deterministic local baseline.
5. `CONNECT` online multiplayer phase (if included in M6, otherwise M6.x).
6. Cross-subsystem stabilization pass (menu scope polish, perf/a11y, status-bar consistency).

---

## 8) M7 Preview (After M6 Baseline)

`M7` is a depth-and-quality milestone after subsystem parity is stable:

- `YOU`: moderation tooling depth, identity/session improvements, richer thread UX.
- `THIRD`: expanded editor tools, stronger localization coverage, higher-fidelity scene features.
- `CONNECT`: production-ready multiplayer hardening, matchmaking/lobbies, replay/spectator options.
- Shell-level polish: richer task grouping across panels and tighter cross-subsystem UX consistency.

M7 should not start until M6 parity gates are met.

---

## 9) Implementation Policy

This roadmap is preserved as directional memory and planning context.

- It does not force immediate implementation out of milestone order.
- Near-term ME work can continue while this remains the subsystem source-of-truth.
- When subsystem work starts, update this roadmap and milestone docs in the same PR.
