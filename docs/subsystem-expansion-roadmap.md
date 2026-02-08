# Subsystem Expansion Roadmap (YOU / THIRD / CONNECT)

Status: Directional roadmap (captured from user planning notes)  
Date captured: 2026-02-08  
Purpose: Preserve future intent so implementation stays aligned when we return to these subsystems.

---

## 1) Core Intent

All four desktop panels should eventually follow the same interaction model as `ME.EXE`:

- Live preview state visible in the desktop panel.
- Clicking panel expands that same running instance to fullscreen.
- Closing fullscreen returns to desktop with state preserved.
- Mode-aware behavior (`panel` lightweight, `fullscreen` full fidelity).

This is architecture-first guidance, not an immediate requirement to ship all features now.

---

## 2) YOU Subsystem (Forum / Message Board)

Target behavior:

- Panel mode:
  - Message composer + recent message preview.
- Fullscreen mode:
  - Full thread/forum-style feed (90s board vibe).
- Posting:
  - Optional name.
  - Anonymous fallback.

Feasibility:

- Local-only persistence is easy (single browser).
- Shared public board requires backend persistence and API.

Required for public launch:

- Moderation/safety controls:
  - Rate limiting.
  - Abuse filtering/report flow.
  - Basic moderation pipeline before broad release.

Notes:

- Concern about trolling/cyberbullying is valid and must be treated as a product + engineering requirement, not optional polish.

---

## 3) THIRD Subsystem (3D Wireframe Dimension)

Target behavior:

- Panel mode:
  - Pause or heavily throttle scene simulation.
  - Keep scene state preserved.
- Fullscreen mode:
  - Full interactive 3D playground.
  - Add/remove/manipulate objects.

Language direction:

- UI text in Japanese (with heavier katakana if needed for accessibility).
- Use localization keys/config, not hardcoded strings.

Notes:

- This follows the same shared-runtime principle as ME: one state model, two display modes.

---

## 4) CONNECT Subsystem (Games Hub)

Target behavior:

- Panel mode:
  - Lightweight hub/lobby snapshot.
- Fullscreen mode:
  - Active game hub or single game scene.

Game targets:

- Pong (2-player default).
- Tron-like game (4-player target).

Feasibility:

- Local single-device prototypes are straightforward.
- True multiplayer requires realtime backend/session infrastructure.

Technical requirements for online multiplayer:

- Room/session management.
- Realtime state sync and reconnect handling.
- Deterministic tick/update model (aligned with existing project principles).

Notes:

- There is no standard “Pong API”/“Tron API” that matches project styling out of the box.
- Custom game implementation is the expected path for visual/style consistency.

---

## 5) Cross-Cutting UX Constraint

Fullscreen subsystem layers should not visually cover the global status bar.

Current note:

- Status bar remains global.
- Menu behavior may evolve by scope.
- Fullscreen layout must reserve status bar space (tracked for shell polish).

---

## 6) Suggested Execution Order

1. Generalize shared subsystem shell contract across all panels.
2. Apply mode-aware panel/fullscreen state handling to `THIRD`.
3. Build `YOU` forum data/service boundary and moderation-safe launch path.
4. Build `CONNECT` game prototypes locally, then add realtime multiplayer.
5. Final cross-subsystem polish (menu scopes, perf, accessibility, status bar layout rule).

---

## 7) Implementation Policy

This roadmap is preserved as directional memory and planning context.

- It does not force immediate implementation out of milestone order.
- Near-term work can continue on current plan while keeping this doc as source context.
- When subsystem work starts, reference this roadmap and update milestone docs in the same PR.

