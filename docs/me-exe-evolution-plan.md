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

1. Edge/corner resize baseline complete: `N/E/S/W` + corner handles, including full top-edge and top-right hit coverage.
2. Drag remains header-only; action buttons are protected from drag starts.
3. Per-window maximize baseline complete: all ME windows support maximize/restore with persisted state.
4. Maximize first-pass bounds lock: maximized windows fill ME stage only (below `[ME.EXE]`, above footer status line).
5. Launcher persistence complete: `FILE / ABOUT / PROJECTS / MEDIA` remains visible while windows are open.
6. Desktop-panel runtime parity complete: panel now renders all active non-minimized ME windows with real content (no lightweight secondary preview path).
7. Task-strip grouping baseline complete: show individual ME tasks only in `ME.EXE` scope and a collapsed `ME.EXE (n)` master item in non-ME scopes.
8. Panel interaction lock complete: windows are fully interactive in panel mode (drag, resize, minimize, maximize, close); launchers open/focus on single click in panel.
9. Fullscreen-entry lock complete: panel enters fullscreen via background-only double gesture (desktop double-click / touch double-tap), with keyboard fallback retained.
10. Right status cluster location baseline complete: live `location | time` token with geolocation source and timezone fallback.
11. Fullscreen footer removed: ME fullscreen now renders header + stage only.
12. Status-language hierarchy resolved: `SYS: READY` is the sole readiness token; ME shows no local readiness/count footer token.
13. Maximize control polish complete: maximize glyph now uses square icon treatment.
14. Edge-to-edge ME framing complete: outer ME panel/fullscreen inset padding removed while internal window body spacing remains unchanged.
15. FileMan toolbar icon polish complete: icon + text controls are now CSS/ASCII-safe (no external icon assets), including `RESET`.

## 9) Theme Split Lock (Auto / Dark / Light)

Theme direction is now locked for incremental rollout:

1. Default behavior follows system preference (`auto`).
2. User override is menu-command driven and persisted locally.
3. Dark theme preserves current Terminal-OS visual baseline (no drift).
4. Light theme is monochrome and intentionally less emissive.
5. CRT/cursor effects are reduced in light mode.
6. Text casing follows resolved theme: dark uppercase, light mixed/lower.
7. Sequence: core shell first, then app interiors in follow-up passes.
