# Phase 2 — Panel Placeholders and Core Behavior

Status: Historical (Phase 2 is complete)  
Date captured: 2025-08-23  
Last updated: 2026-03-02

This document summarizes the work completed through Phase 2 and explains the code and pages in a developer-friendly, text-heavy way.

For current system behavior, start at:
- `docs/overview.md`
- `docs/timeline.md`

## Goals Completed
- Landing page with video background and keyboard/click entry
- App shell and Desktop layout with four panels: `ME`, `YOU`, `THIRD`, `CONNECT`
- StatusBar with live clock
- Scanlines CRT overlay and reduced-motion fallbacks
- Custom retro mouse cursor (monospace glyph) with hover enlargement and reduced-motion support
- `YOU` panel input that persists to `localStorage` and shows a transient saved state

Legacy note (post-M6):
- The `YOU` localStorage input behavior above is historical Phase 2 context only.
- Current `YOU.EXE` runtime uses backend-backed message feed state (Supabase) and no longer stores board messages in localStorage.

## File map and responsibilities

- `src/App.tsx` — application entry point. Controls landing flow and the transition into the main shell. Current behavior:
  - Tracks a `LandingPhase` state machine: `idle` / `loading` / `transitioning` / `entered` / `error`.
  - Pressing Enter or clicking `[ ENTER ]` loads the desktop runtime if needed, then runs a GSAP CRT handoff instead of a CSS-timed fade.
  - Renders `Cursor` at top-level so the custom pointer appears on landing and app screens.

- `src/main.tsx` — mounts React app and imports global styles.

- `src/components/Landing/` — landing UI and motion glue.
  - `Landing.tsx` renders the landing surface and exposes DOM handles for the GSAP intro.
  - `landingIntroMotion.ts` defines the CRT handoff timeline and reduced-motion duration.
  - `Landing.module.scss` contains the shared landing layout and static visual treatment.

- `src/components/Panel/Panel.tsx` — small single-responsibility wrapper used by all panels. It provides an ASCII-style header and a body area.

- `src/components/Desktop/` — 2×2 grid of panels; each panel is an instance of `Panel` and contains one of the feature components.

- `src/components/YOU/` — Phase 2 originally implemented a localStorage input/save panel.
  - Legacy only: replaced in M6 by backend-backed message board runtime (`src/you/*` + Supabase Edge Function API).

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

## What happened next (Phase 3+)

- ME became a live `ME.OS` runtime (shared panel/fullscreen instance) with persistent shell + VFS services.
- FileMan and viewers proved the service boundaries (later ME UX shifted to the Finder Reset desktop model).
- YOU and THIRD moved from placeholders to real subsystems with shared panel/fullscreen runtime state.

See:
- `docs/phase-3.md`
- `docs/me-exe-finder-reset-spec.md`
- `docs/subsystem-expansion-roadmap.md`
