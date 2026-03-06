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

Optional env for YOU board backend and CONNECT realtime:
```bash
# Supabase Edge Function base (must end with /you)
VITE_YOU_API_BASE_URL=https://your-api-host.example

# Optional only if Edge Function verify_jwt=true
VITE_YOU_API_ANON_KEY=<optional_anon_publishable_key>

# Supabase Realtime root + anon key for CONNECT.EXE Tron multiplayer
VITE_CONNECT_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_CONNECT_SUPABASE_ANON_KEY=<your-anon-publishable-key>
```

## Branching / Workflow

- `main` — active baseline
- `phase0-2` — historical snapshot (landing + skeleton + placeholders)
- `phase3` — historical snapshot (earlier ME runtime experiments)

Commit guidance:
- Keep commits small and descriptive. Use `feat:`, `fix:`, `docs:`, `style:` prefixes.

## Key files and components (what to edit)

- `src/App.tsx` — root application flow
  - Controls landing state via `LandingPhase`: `idle`, `loading`, `transitioning`, `entered`, `error`.
  - Pressing Enter or clicking `[ ENTER ]` loads the desktop runtime if needed and then runs the GSAP CRT handoff.

- `src/components/Landing/` — landing page, motion timeline, and styles.
  - `Landing.tsx` owns the render surface.
  - `landingIntroMotion.ts` defines the GSAP intro timeline.

- `src/components/Panel/Panel.tsx` — small wrapper used for each panel (title + body).

- `src/components/Desktop/Desktop.tsx` — main grid layout where panels are mounted.

- `src/components/YOU/` + `src/you/` — `YOU.EXE` message board UI + service/provider runtime.

- `src/components/CONNECT/` + `src/connect/` — `CONNECT.EXE` Tron UI, deterministic engine, CPU logic, and Supabase Realtime runtime.

- `src/components/Cursor/` — custom cursor implementation (enabled on hover devices, respects reduced motion).

- `src/components/Scanlines/` — CRT scanline overlay (decorative, `aria-hidden`).

## Component Reference (short)

- Panel
  - `src/components/Panel/Panel.tsx`
  - Props: `title: string` and `children`

- YOU
  - `src/components/YOU/YOU.tsx`
  - Uses `YouProvider` + `YouApiClient` (no board data localStorage writes).
  - API contract: `GET/POST` to Supabase Edge Function root (via `VITE_YOU_API_BASE_URL`), or fallback `GET/POST /api/you`.
  - Panel mode shows recent feed preview; fullscreen mode shows full feed with older-page loading.
  - Backend schema/contract reference: `docs/you-api-v1.md`.
  - Supabase ops details: `docs/you-exe/SUPABASE-SETUP-AND-OPS.md`.

- CONNECT
  - `src/components/CONNECT/CONNECT.tsx`
  - Uses `ConnectProvider` plus pure logic modules in `src/connect/`.
  - Multiplayer contract uses Supabase Realtime presence/broadcast only (no DB schema for v1).
  - Runtime is now four-seat aware: seat modes are `local`, `online`, `cpu`, and `closed`.
  - Quick Match supports `2P` and `4P`; custom rooms support mixed local/online/CPU seat ownership with at most two human seats per browser.
  - Configure `VITE_CONNECT_SUPABASE_URL` and `VITE_CONNECT_SUPABASE_ANON_KEY` for quick match + hosted rooms; otherwise local/CPU flows still work.
  - Runtime contract reference: `docs/connect-exe/CONNECT-TRON-V1.md`.

- Cursor
  - `src/components/Cursor/Cursor.tsx`
  - Shows a monospace glyph, hides native cursor (adds `custom-cursor-enabled` to `body`).
  - Scales on interactive elements like links and buttons.

## Contributing Notes

- Respect `prefers-reduced-motion` in animations (check `src/styles/crt.module.scss` and JS checks in `Cursor.tsx`).
- Prefer adding small SCSS module rules scoped to components.
- Keep mobile/tablet changes breakpoint-scoped; preserve desktop behavior above tablet width.
- Keep `node_modules` out of git history (it is ignored via `.gitignore`).

## Responsive Baseline (2026-02-25)

Shared breakpoint tokens live in `src/styles/_variables.scss`:
- `$bp-tablet: 1024px`
- `$bp-compact: 760px`
- `$bp-phone: 560px`
- `$bp-narrow: 420px`

Primary responsive surfaces hardened in this baseline:
- `src/components/AppShell/AppShell.module.scss`
- `src/components/Desktop/Desktop.module.scss`
- `src/components/StatusBar/StatusBar.module.scss`
- `src/components/YOU/YOU.module.scss`
- `src/meos/shell/MeOsShell.module.scss`
- `src/meos/apps/fileman/FileManWindow.module.scss`
- `src/meos/apps/viewers/FileViewerWindow.module.scss`

Reference and validation matrix:
- `docs/responsive-mobile-tablet-baseline.md`

## Where to document design decisions

- `docs/adr/README.md` (architectural decisions and intent records)
- `docs/conversation-log.md` (running decision log)
- `docs/timeline.md` (curated chronological narrative)
- `docs/phase-2.md` (historical, text-heavy Phase 2 baseline)
- `docs/dev-quickstart.md` (this file) — quick reference for contributors
