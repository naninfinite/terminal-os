# Phase 3 (ME.OS) ADR Pack

Status: Accepted (baseline implemented)

Date accepted: 2026-02-08  
Last updated: 2026-03-02

This file records the Phase 3 decisions that locked persistence boundaries, reset semantics, and testing scope.

Primary references:
- ADR index: `docs/adr/README.md`
- VFS implementation: `src/meos/vfs/service.ts` (`VFS_STORAGE_KEY`, `VFS_VERSION`)
- VFS seed: `src/meos/vfs/seed.ts`
- Finder Reset UX contract: `docs/me-exe-finder-reset-spec.md`
- Historical ME architecture notes: `docs/fileman-v2-build-spec.md`

---

## ADR-0030: VFS Persistence and Schema Versioning

### Context

Earlier phases used in-memory or seeded structures to prove UI and windowing.
Phase 3 required a persistent virtual file system (VFS) that survives reloads and behaves like OS infrastructure, not UI state.

### Decision

Introduce a versioned, persistent VFS service backed by browser storage (localStorage when available).

Key contract:
- Storage key is namespaced and versioned: `terminalOS.meos.v1.vfs`
- Snapshot version is explicit (`VFS_VERSION` in code).
- Stored shape is a single snapshot object (not scattered keys):
  - `version: number`
  - `rootId: string`
  - `nodes: Record<string, VfsNode>`
  - `children: Record<string, string[]>`
- The VFS service is the sole owner of file/folder persistence.
- UI components and apps must not read/write localStorage directly for filesystem state.

### Consequences

Positive:
- Reload restores ME.OS filesystem state deterministically.
- Migrations can be explicit and version-scoped.
- Tests can operate against a stable snapshot shape.

Negative:
- Adds complexity relative to pure in-memory state.
- Requires explicit storage isolation in tests to avoid cross-test coupling.

### Alternatives considered

- UI-owned file browser state: rejected (drifts, restores poorly, hard to test).
- Multiple storage keys per folder/app: rejected (harder migrations, inconsistent resets).

---

## ADR-0031: Reset Semantics

### Context

Before Phase 3, "reset" behavior was informal and mostly for development.
As ME.OS became persistent, reset needed to become a first-class, explicit system operation.

### Decision

Reset is defined as a destructive operation that clears the VFS snapshot key and re-seeds defaults.

Rules:
- Reset requires explicit confirmation in UI surfaces that expose it.
- Reset clears only the ME.OS VFS namespace (not unrelated app data).
- Reset always restores the seed snapshot deterministically.
- Reset logic lives in the VFS service, not in apps.

### Consequences

Positive:
- Predictable recovery path for demos, tests, and users.
- Clear mental model: reset means "back to seed", not "maybe cleared something".

Negative:
- Apps must tolerate sudden state replacement without crashing.

### Alternatives considered

- Per-app reset buttons that mutate local state: rejected (inconsistent, leaky).
- `localStorage.clear()`: rejected (over-destructive).

---

## ADR-0032: FileMan.EXE Action Model (Reference Consumer)

### Context

FileMan started as a scaffold for windowing/navigation.
In Phase 3 it became the reference consumer of the VFS service and the place where file operations were proven end-to-end.

### Decision

The reference file action set (as implemented during Phase 3) is:
- Create folder
- Create file
- Inline rename
- Delete (recursive)
- Reset filesystem (confirmation required)

Interaction rules:
- Rename via `F2` or context menu.
- Rename commits on `Enter` or blur.
- `Escape` cancels rename.
- Delete operates via VFS only (no UI-owned state mutation).
- Reset always requires confirmation.

Non-goals:
- Drag and drop.
- Permissions/users.
- Cloud sync.
- File content editing.

Note:
- The Finder Reset ME UX removed visible authoring controls from the default ME desktop, but the underlying VFS action semantics remain the reference baseline.

### Consequences

Positive:
- Established a canonical action model other apps can copy.
- Proved the VFS service boundary under realistic UI workflows.

Negative:
- More advanced file interactions are deferred.

### Alternatives considered

- Implement everything (drag/drop, trash, permissions) in Phase 3: rejected (over-scoped, higher regression risk).

---

## ADR-0033: Testing Boundaries for Stateful Services

### Context

Persistent state increases risk of flaky/order-dependent tests.
Phase 3 needed explicit boundaries so the test suite stayed deterministic.

### Decision

Define testing boundaries:
- Unit tests:
  - VFS service (pure logic, storage isolation per test)
  - no UI/DOM assumptions
- Integration tests:
  - VFS consumer flows where warranted (historically FileMan)
  - action flows (rename/delete/reset) and rendering correctness

Explicit exclusions (baseline):
- No visual snapshot testing by default.
- No full E2E browser automation by default.

### Consequences

Positive:
- Fast, reliable suite.
- Failures are local and diagnosable.

Negative:
- Some visual regressions require manual review unless specifically tested.

### Alternatives considered

- Broad E2E coverage early: rejected (time cost + flakiness risk for a fast-moving UI).

---

## Phase 3 Direction Update (captured 2026-02-08)

Phase 3 prioritized a FileMan v2 path aligned with a live `ME.OS` experience:
- `ME.EXE` panel hosts a live miniature `ME.OS` instance.
- Opening `ME.EXE` expands the same instance to fullscreen (no duplicate app state).
- Returning to desktop preserves in-session windows/files in the panel preview.

Architecture constraints:
- Persistence remains service-owned (VFS/service layer only).
- UI apps do not write directly to localStorage for core state.
- Window restore must rehydrate real app content, not placeholders.
- Mode-aware performance is required (panel lightweight; fullscreen full fidelity).

Menu model:
- One global Start-like menu button in the bottom status bar.
- Menu entries are scope-aware (Desktop, `ME.OS`, future subsystems).
