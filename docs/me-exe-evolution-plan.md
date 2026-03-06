# ME.EXE Evolution Plan (Finder Reset Baseline)

Date: 2026-03-01  
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
6. The centered launcher shelf is retired; desktop icons and windows are now the baseline ME interaction model.

## 3) What We Will Not Do

- No sudden full visual overhauls.
- No giant grid/block redesigns that replace current style language.
- No multi-system aesthetic swap in a single pass.
- No return to visible FileMan authoring chrome without explicit re-approval.

## 4) Iteration Method (Required)

Each pass must be small and isolated:

1. One narrow goal.
2. Minimal file touch.
3. Clear before/after behavior.
4. Fast review.
5. Easy rollback.

## 5) Implementation Priorities

1. Preserve current shell styling and status bar behavior.
2. Keep ME.EXE readable as a sparse desktop, not a launcher dashboard.
3. Preserve panel/fullscreen shared-state behavior.
4. Keep folders, files, and windows as the primary ME affordances.
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
- Keep decisions anchored to this document and `docs/me-exe-finder-reset-spec.md` unless explicitly re-approved.

## 8) Current Finder Reset Lock (2026-03-05)

1. Curated desktop icon lane complete: `Start Here`, `Projects`, `Media`, `About`, `Contact`.
2. Desktop semantics complete: pointer single-click selects, double-click opens; touch single tap opens; keyboard navigation remains active.
3. Background-only fullscreen entry complete: icon/window interactions never trigger fullscreen.
4. Desktop-panel runtime parity complete: panel renders the same ME runtime and active windows as fullscreen.
5. Folder/file baseline complete: centered launcher shelf removed in favor of folder/document windows.
6. Deterministic window ids complete: folders, viewers, and info windows focus existing windows when reopened.
7. Canonical `Home` docs complete: `About`, `Contact`, and `README.txt` live in `Home`, with `README.txt` surfaced on desktop as `Start Here`.
8. Minimal folder-window contract complete: no toolbar, sidebar, path input, or visible authoring controls.
9. Finder-leaning chrome complete: centered titles, quieter resize affordances, classic-style controls, authored backdrop, and Terminal-OS palette preserved.
10. Task-strip grouping baseline complete: show individual ME tasks only in `ME.EXE` scope and a collapsed `ME.EXE (n)` master item in non-ME scopes.
11. Session restore + shell/VFS v2 migrations complete.
12. Cross-surface mobile/tablet hardening remains a required baseline for the new shell.
13. `Start Here` now acts as the world hub with explicit next-open actions.
14. Dedicated gallery/video browsing beyond current folder/viewer behavior remains deferred to a later ME pass.

## 9) Theme Split Lock (Auto / Dark / Light)

Theme direction is now locked for incremental rollout:

1. Default behavior follows system preference (`auto`).
2. User override is menu-command driven and persisted locally.
3. Dark theme preserves current Terminal-OS visual baseline (no drift).
4. Light theme is monochrome and intentionally less emissive.
5. CRT/cursor effects are reduced in light mode.
6. Text casing follows resolved theme: dark uppercase, light mixed/lower.
7. Sequence: core shell first, then app interiors in follow-up passes.

## 10) Handoff to M6 (Subsystem Parity)

After M5 ME-shell closeout, subsystem implementation planning moves to:

- `docs/subsystem-expansion-roadmap.md`

That roadmap now holds:

1. Explicit M6 definition and exit criteria.
2. Step-by-step delivery order.
3. Separate complexity tracks for `THIRD`, `YOU`, and `CONNECT`.
4. M7 post-parity preview.

## 11) Deferred Shell Follow-Ups

These items are intentionally deferred behind the current shell recovery baseline:

1. Featured-panel identity pass:
   - when a subsystem is promoted into the left-hand hero slot, give it a materially stronger hero-state presentation instead of only reflowing layout.
2. `ME.EXE` media payoff pass:
   - deepen the `Media` surface with richer browsing, stronger poster/reel framing, and more authored atmosphere.
3. Desktop stage-transition motion pass:
   - evaluate a GSAP-driven desktop-only promotion transition where panels shift and slot into place,
   - preserve fullscreen behavior,
   - respect reduced-motion preferences,
   - avoid turning the shell into an auto-rotating carousel.
