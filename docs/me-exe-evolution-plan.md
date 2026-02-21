# ME.EXE Evolution Plan (Styling-First, Iterative)

Date: 2026-02-08  
Status: Active direction  
Owner: Terminal-OS

## 1) Visual References We Are Targeting

- Mac-style desktop OS feel (clean desktop surface, icon-driven entry points, floating windows).
- ProzillaOS feel (desktop-first, windows layered over desktop, taskbar/system grounding).
- Windows 95 feel (clear window chrome, desktop metaphor, app-like affordances).

## 2) Locked Direction

1. Current Terminal-OS styling is paramount.
2. No large one-shot redesigns.
3. Do not replace background/chrome language abruptly.
4. ME.EXE should evolve into an OS experience through small, concise iterations.
5. Behavioral improvements are welcome, but visual identity must remain Terminal-OS.

## 3) What We Will Not Do

- No sudden full visual overhauls.
- No giant grid/block redesigns that replace current style language.
- No multi-system aesthetic swap in a single pass.

## 4) Iteration Method (Required)

Each pass must be small and isolated:

1. One narrow goal.
2. Minimal file touch.
3. Clear before/after behavior.
4. Fast review.
5. Easy rollback.

## 5) Implementation Priorities

1. Preserve current shell styling and status bar behavior.
2. Incrementally improve ME.EXE desktop semantics.
3. Add/adjust icon and window behavior in small steps.
4. Keep panel/fullscreen shared-state behavior stable.
5. Validate non-ME scopes (`YOU`, `THIRD`, `CONNECT`) are unaffected.

## 6) Acceptance Rules Per Iteration

- Terminal-OS visual baseline is preserved.
- Scope/menu behavior does not regress.
- No unexpected layout shifts in other panels.
- Build and tests pass.
- Change is understandable in one short summary.

## 7) Team Operating Note

When proposing future ME.EXE changes:

- Propose in concise micro-steps.
- Avoid broad visual experimentation in one shot.
- Keep decisions anchored to this document unless explicitly re-approved.

## 8) Near-Term UX Queue (M5 / M5.x)

1. Edge-first resize affordances with safe hitbox separation from header controls.
2. Keep drag strictly on window header zones; no drag collisions on action buttons.
3. Evaluate persistent launcher access (`FILE / ABOUT / PROJECTS / MEDIA`) when windows are open.
4. Evaluate desktop-panel miniature strategy: top-window-only (current) vs multi-window preview.
5. Evaluate task-strip grouping behavior: active-scope-only task list vs desktop master grouping (`ME.EXE (n)`) for non-active panel windows.
