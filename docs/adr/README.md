# ADR Index (Terminal-OS)

Last updated: 2026-03-02

This index is the single entry point for architectural decisions, constraints, and forward-looking intent records.

## How to read this

- ADRs with a concrete decision are marked **Accepted**.
- ADRs marked **Intent** are not implemented, but exist to prevent future drift.

## Phase 0: Foundations

### ADR-0001: Project Structure and Tech Stack (Accepted)

Summary:
- React + Vite + TypeScript
- SCSS modules with theme tokens
- OS metaphor (shell, apps, services)

Notes:
- All later ADRs assume this stack.
- No framework churn without a new ADR.

## Phase 1: Engine and Determinism

### ADR-0010: Deterministic Engines and Testability (Accepted)

Summary:
- Arcade-style engines must be deterministic.
- Use fixed timesteps and seeded randomness where applicable.

Downstream impact:
- Stateful systems should be testable and reproducible.
- Influences VFS and service testing boundaries.

## Phase 2: Shell, Windowing, and Stability

### ADR-0020: Shell / App / Service Separation (Accepted)

Summary:
- Shell manages windows and layout.
- Apps render content only.
- Services own state and persistence.

Downstream impact:
- VFS lives as a service.
- FileMan consumes VFS; it never owns VFS persistence.

### ADR-0021: Desktop Layering Model (Accepted)

Summary:
- HomeDashboard renders inside WindowManager, beneath windows.
- Prevents provider/layering errors.

Downstream impact:
- System apps behave as windows; nothing "owns the desktop" besides the shell.

### ADR-0022: Mobile Terminal Independence (Accepted)

Summary:
- Terminal.EXE on mobile is full-height.
- It is not dependent on WindowManager.

Downstream impact:
- System apps must tolerate multiple shell contexts.
- Subsystems cannot rely on desktop-only affordances.

### ADR-0023: DOM Guards and Defensive Rendering (Accepted)

Summary:
- Guard all DOM access.
- No assumptions about environment presence.

Downstream impact:
- Persistence/reset flows must not cause lifecycle crashes.

## Phase 3: File System, Persistence, Hardening

### ADR-0030: VFS Persistence and Schema Versioning (Accepted)

Summary:
- Introduces persistent VFS service.
- localStorage-backed, versioned schema.
- Deterministic seed overlay.

Related:
- `docs/phase-3.md`

### ADR-0031: Reset Semantics (Accepted)

Summary:
- Reset is destructive and first-class.
- Always restores seeded state.
- Requires explicit confirmation.

Related:
- `docs/phase-3.md`

### ADR-0032: FileMan.EXE Action Model (Accepted)

Summary:
- Create / rename / delete / reset.
- Inline rename, keyboard-friendly.
- FileMan is the reference VFS consumer.

Related:
- `docs/phase-3.md`

### ADR-0033: Testing Boundaries for Stateful Services (Accepted)

Summary:
- VFS: unit tests only.
- FileMan: integration tests.
- No snapshot or E2E testing as a default baseline.

Related:
- `docs/phase-3.md`

### ADR-0034: Live Embedded ME.OS Instance (Accepted)

Summary:
- `ME.EXE` and fullscreen `ME.OS` are the same running instance.
- Desktop panel displays a live miniature of `ME.OS`.
- Fullscreen expands/collapses without resetting `ME.OS` state.

Downstream impact:
- Requires shared state container for panel/fullscreen rendering modes.
- Prevents duplicate instances with divergent state.
- Needs mode-aware performance profile for panel rendering.

### ADR-0035: Context-Aware Global Menu (Accepted)

Summary:
- One global Start-like menu button in bottom status bar.
- Menu entries adapt to active scope (Desktop, `ME.OS`, other subsystem scopes).
- Core menu component remains shared across scopes.

Downstream impact:
- Prevents fragmented menu implementations.
- Supports subsystem-specific actions without changing global layout.
- Maintains consistent keyboard and accessibility behavior.

## Forward-Looking Intent Records (Important)

### ADR-0090: File System Evolution (Intent, not implemented)

Statement of intent:
- The Phase 3 VFS design is not final.
- The file system model is expected to change in a future phase.

Constraints:
- Phase 3 decisions must be replaceable and avoid leaking VFS internals into apps.
- Any future redesign should reference this intent record.

### ADR-0091: Subsystem Parity Expansion (Intent, not implemented)

Summary:
- Non-ME panels (`YOU`, `THIRD`, `CONNECT`) are intended to adopt the same shared panel + fullscreen instance model used by `ME.OS`.
- Each subsystem should preserve state between panel and fullscreen modes.
- Mode-aware performance remains required for panel previews.
