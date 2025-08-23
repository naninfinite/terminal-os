# Developer Quickstart — terminal-os

This quickstart condenses how to run the project, the main components to know, and small code reference notes for contributors.

## Run Locally

1. Install dependencies
   ```bash
   npm install
   ```

2. Start dev server
   ```bash
   npm run dev
   # visit http://localhost:5173
   ```

3. Build for production
   ```bash
   npm run build
   npm run preview
   ```

## Branching / Workflow

- `main` — stable releases
- `phase0-2` — current work (landing + skeleton + placeholders)
- Create `phase3` and `phase4` when starting those phases.

Commit guidance:
- Keep commits small and descriptive. Use `feat:`, `fix:`, `docs:`, `style:` prefixes.

## Key files and components (what to edit)

- `src/App.tsx` — root application flow
  - Controls landing state: `entered`, `exiting`.
  - Pressing Enter or clicking `[ ENTER ]` triggers `setExiting(true)`.

- `src/components/Landing/` — landing page and styles (`Landing.module.scss`).

- `src/components/Panel/Panel.tsx` — small wrapper used for each panel (title + body).

- `src/components/Desktop/Desktop.tsx` — main grid layout where panels are mounted.

- `src/components/YOU/` — example interactive panel: persistent input stored via `src/utils/storage.ts`.

- `src/components/Cursor/` — custom cursor implementation (enabled on hover devices, respects reduced motion).

- `src/components/Scanlines/` — CRT scanline overlay (decorative, `aria-hidden`).

## Component Reference (short)

- Panel
  - `src/components/Panel/Panel.tsx`
  - Props: `title: string` and `children`

- YOU
  - `src/components/YOU/YOU.tsx`
  - Uses `getItemSafe` / `setItemSafe` for `localStorage` persistence (key: `terminal_os_you_input_v1`).
  - The save button shows `SAVED` for 3s after saving.

- Cursor
  - `src/components/Cursor/Cursor.tsx`
  - Shows a monospace glyph, hides native cursor (adds `custom-cursor-enabled` to `body`).
  - Scales on interactive elements like links and buttons.

## Contributing Notes

- Respect `prefers-reduced-motion` in animations (check `src/styles/crt.module.scss` and JS checks in `Cursor.tsx`).
- Prefer adding small SCSS module rules scoped to components.
- Keep `node_modules` out of the repo; if the repo contains `node_modules`, consider adding it to `.gitignore` (not done here for reproducible edits).

## Where to document design decisions

- `docs/phase-2.md` (detailed text-heavy descriptions — created already)
- `docs/dev-quickstart.md` (this file) — quick reference for contributors


