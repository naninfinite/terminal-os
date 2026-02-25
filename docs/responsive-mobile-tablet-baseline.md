# Responsive Mobile/Tablet Baseline

Status: implemented  
Date: 2026-02-25  
Owner: Terminal-OS

## 1) Intent

Lock a desktop-safe responsiveness baseline across shell and core app surfaces so mobile/tablet behavior does not regress as subsystem complexity increases.

## 2) Contract

1. Desktop behavior is preserved above tablet breakpoint.
2. Mobile/tablet changes are CSS-first and breakpoint/safe-area scoped.
3. No public API/type/context contract changes in this pass.
4. No feature redesigns; this is layout and usability hardening only.

## 3) Shared Breakpoints

Defined in `src/styles/_variables.scss`:

- `$bp-tablet: 1024px`
- `$bp-compact: 760px`
- `$bp-phone: 560px`
- `$bp-narrow: 420px`

## 4) Surfaces Hardened

- `src/components/AppShell/AppShell.module.scss`
- `src/components/Desktop/Desktop.module.scss`
- `src/components/Panel/Panel.module.scss`
- `src/components/StatusBar/StatusBar.module.scss`
- `src/components/YOU/YOU.module.scss`
- `src/components/CONNECT/CONNECT.module.scss`
- `src/meos/shell/MeOsShell.module.scss`
- `src/meos/apps/fileman/FileManWindow.module.scss`
- `src/meos/apps/viewers/FileViewerWindow.module.scss`

## 5) Safe-Area Policy

Safe-area insets are applied to fullscreen/status surfaces that anchor to viewport edges:

- bottom reservation for global status bar overlap prevention
- left/right inset padding for edge-safe content on notch devices

## 6) Validation Matrix

Automated:

1. `npm test`
2. `npm run build`

Manual viewport checks:

- Desktop: `1366x768`, `1440x900`
- Tablet: `1024x1366`, `834x1194`, `768x1024`
- Mobile: `430x932`, `390x844`, `360x800`, `320x568`

Manual acceptance:

1. No root horizontal scrolling.
2. Status bar/menu/task strip remain usable.
3. Panel content controls do not clip at mobile/tablet sizes.
4. ME shell window chrome stays reachable.
5. FileMan path/toolbar/list remain operable.
6. Viewer headers and video controls do not overflow.

## 7) Non-Goals

- No runtime interaction model changes.
- No subsystem feature expansion.
- No theme-system redesign.
