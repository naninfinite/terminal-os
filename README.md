# TERMINAL-OS

Retro terminal-inspired UI (Severance Lumon terminals) built with React, Vite, TypeScript, and SCSS Modules.

## Stack
- React + Vite + TypeScript
- Styling: SCSS modules

## Development
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Phase 1 – Skeleton App Layout
- App shell layout (`AppShell`) with CRT scanlines overlay
- `Desktop` grid with four panels: `ME`, `YOU`, `THIRD`, `CONNECT`
- `StatusBar` footer with basic system state and a live clock

## Phase 0 – Landing Page
- Fullscreen looping video background at `public/assets/landing-bg.mp4`.
- Overlay framed box with "TERMINAL-OS" and "[ ENTER ]".
- Enter key or click triggers fade-out transition.
- Fallback poster image: `public/assets/landing-poster.jpg`.

If the video fails, the poster + gradient background are used.

## Accessibility
- Keyboard Enter triggers entry.
- Visible focus ring via `:focus-visible`.

## Assets
- Place in `public/assets/`:
  - `landing-bg.mp4`
  - `landing-poster.jpg`
  - `me.png` (used by `ME` panel)

## Changelog
- Phase 1: App shell + StatusBar implemented.
- Phase 0: Scaffold and landing implemented.

Recent updates:
- Added custom retro green mouse cursor (monospace glyph) with hover-enlarge behavior and reduced-motion support.
- Fixed landing responsiveness (video box clamp) and enter transition timer cleanup.

## Phase 2 — Panel placeholders

Phase 2 completes the panel placeholder work and core behaviors. See `docs/phase-2.md` for a detailed, text-heavy explanation of the codebase and components.

Detailed docs: `docs/phase-2.md`

## Codespaces / Devcontainer

This repo includes a `.devcontainer` with a Node/TypeScript image. To use it in Codespaces or VS Code Remote:

- Open in Codespaces or `Remote-Containers: Open Folder in Container...`.
- The container runs `npm install` automatically on create.


