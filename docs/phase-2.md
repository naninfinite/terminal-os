# Phase 2 — Panel Placeholders and Core Behavior

This document summarizes the work completed through Phase 2 and explains the code and pages in a developer-friendly, text-heavy way.

## Goals Completed
- Landing page with video background and keyboard/click entry
- App shell and Desktop layout with four panels: `ME`, `YOU`, `THIRD`, `CONNECT`
- StatusBar with live clock
- Scanlines CRT overlay and reduced-motion fallbacks
- Custom retro mouse cursor (monospace glyph) with hover enlargement and reduced-motion support
- `YOU` panel input that persists to `localStorage` and shows a transient saved state

## File map and responsibilities

- `src/App.tsx` — application entry point. Controls landing flow and the transition into the main shell. Key behavior:
  - Tracks `entered` / `exiting` state. Pressing Enter or clicking `[ ENTER ]` sets `exiting` and after a CSS-aligned delay flips to `entered`.
  - Renders `Cursor` at top-level so the custom pointer appears on landing and app screens.

- `src/main.tsx` — mounts React app and imports global styles.

- `src/components/Landing/` — landing UI. `Landing.module.scss` contains responsive clamps for the video box and ENTER button styles.

- `src/components/Panel/Panel.tsx` — small single-responsibility wrapper used by all panels. It provides an ASCII-style header and a body area.

- `src/components/Desktop/` — 2×2 grid of panels; each panel is an instance of `Panel` and contains one of the feature components.

- `src/components/YOU/` — implements a basic input that persists to `localStorage` using `src/utils/storage.ts`. The save button shows `SAVED` for 3 seconds after saving.

- `src/components/Cursor/` — custom cursor implemented with a small React component that:
  - Detects hover-capable devices and skips touch devices
  - Smoothly follows the pointer (with reduced-motion respect)
  - Detects interactive elements and scales on hover
  - Adds a `custom-cursor-enabled` class to `document.body` to hide the native cursor

- `src/components/Scanlines/` and `src/styles/crt.module.scss` — visual CRT overlay and scanline effect. Includes `prefers-reduced-motion` fallbacks.

- `src/utils/storage.ts` — `getItemSafe`/`setItemSafe` wrappers around `localStorage` that guard against parse errors and storage failures.

- `src/utils/useTypewriter.ts` — a small hook used by any future components that want a typewriter reveal effect.

## Accessibility notes

- Keyboard: Landing accepts `Enter` to proceed. Focus rings are visible via `:focus-visible` in `global.scss`.
- Reduced motion: CSS and JS check `prefers-reduced-motion` and disable animations where appropriate.
- Screen reader: key components include `aria-label` and `aria-live` where needed (e.g., StatusBar time and YOU saved status).

## How to run locally

1. npm install
2. npm run dev
3. Open `http://localhost:5173`

## Next steps (Phase 3 suggestions)

- Replace panel placeholders with interactive content and persistence (ME profile, YOU messaging, THIRD archive, CONNECT live links)
- Add keyboard-only navigation between panels
- Implement thick block caret inside text inputs (optional)
- Add tests and CI

## Notes about recent changes

- Several commits were rewritten to normalize the committer name to `NaNinfinite` and the repo was pushed to GitHub at `naninfinite/terminal-os`.


