ADR-00XX — VFS Persistence & Schema Versioning

Status: Accepted
Phase: 3
Date: YYYY-MM-DD
Related: Phase 2 deterministic tests, FileMan scaffold

Context

During Phases 0–2, FileMan.EXE operated on in-memory or seeded structures suitable for UI scaffolding.
Phase 3 requires a persistent, deterministic virtual file system (VFS) that survives reloads and behaves like OS infrastructure rather than UI state.

Previous Phase 2 work established:
	•	Deterministic state handling
	•	DOM guards and strict test isolation
	•	Clear separation between shell, apps, and services

The VFS must follow these constraints.

Decision

Introduce a versioned, persistent VFS service backed by localStorage.
	•	Storage key is namespaced and versioned:

terminalOS.vfs@v1


	•	Stored shape:

{
  version: 1,
  tree: VfsNode[]
}


	•	The VFS is the sole owner of file/folder state.
	•	UI components and apps must never access localStorage directly.

Persistence rules
	•	Writes are atomic (write → swap → cleanup)
	•	Legacy keys (Phase 2 or earlier) are migrated once
	•	IDs are stable and never regenerated on reload
	•	Seed data is immutable and overlaid deterministically

Consequences

Positive
	•	Reloading restores OS state exactly
	•	Tests can rely on stable storage semantics
	•	Future migrations are explicit and controlled

Negative
	•	Slightly more complexity than in-memory state
	•	Requires explicit test cleanup per run

Related phases
	•	Phase 2: Deterministic tests & DOM guards
	•	Phase 3: FileMan.EXE promotion to core system app

⸻

ADR-00XX — Reset Semantics

Status: Accepted
Phase: 3
Date: YYYY-MM-DD
Related: VFS persistence ADR, Phase 2 lifecycle fixes

Context

In earlier phases, “reset” functionality was informal and primarily used during development.
As website-os evolves into an OS metaphor, reset must be treated as a first-class system operation.

Reset must not leave orphaned state, stale UI, or corrupted persistence.

Decision

Reset is defined as a destructive, explicit operation that restores the system to its seeded file system state.

Rules:
	•	Reset always restores the original seed exactly
	•	Reset requires user confirmation
	•	Reset clears persisted VFS data before reseeding
	•	All open views must reconcile cleanly after reset
	•	No in-memory state may survive reset implicitly

Reset logic lives in the VFS service, not in apps.

Consequences

Positive
	•	Predictable recovery path
	•	Safe testing and demos
	•	Clear mental model for users and developers

Negative
	•	Requires explicit UI affordances (confirm dialogs)
	•	Apps must tolerate sudden state replacement

Related phases
	•	Phase 2: lifecycle & provider stability
	•	Phase 3: persistence hardening

⸻

ADR-00XX — FileMan.EXE Action Model

Status: Accepted
Phase: 3
Date: YYYY-MM-DD
Related: FileMan scaffold (Phase 2)

Context

FileMan.EXE was introduced as a scaffold in Phase 2 to validate windowing, navigation, and layout.
Phase 3 promotes FileMan.EXE into a core reference system app.

Its action model must be explicit, predictable, and keyboard-friendly.

Decision

FileMan.EXE supports the following actions in Phase 3:

Core actions
	•	Create folder
	•	Create file
	•	Inline rename
	•	Delete (recursive)
	•	Reset file system (confirm)

Interaction rules
	•	Rename via F2 or context menu
	•	Rename commits on Enter or blur
	•	Escape cancels rename
	•	Delete operates via VFS only (no UI state mutation)
	•	Reset always requires confirmation

Non-goals
	•	Drag and drop
	•	Permissions or users
	•	Cloud sync
	•	File content editing

Consequences

Positive
	•	FileMan becomes a canonical VFS consumer
	•	Other apps can copy its interaction patterns
	•	Predictable keyboard and action semantics

Negative
	•	Advanced file interactions deferred to later phases

Related phases
	•	Phase 2: FileMan scaffold
	•	Phase 3: VFS hardening and persistence

⸻

ADR-00XX — Testing Boundaries for Stateful Services

Status: Accepted
Phase: 3
Date: YYYY-MM-DD
Related: Phase 2 deterministic engine tests

Context

Phase 2 established strict deterministic testing:
	•	DOM guards
	•	No implicit globals
	•	Stable timing and state

Phase 3 introduces persistent state, which increases the risk of flaky or order-dependent tests.

Decision

Define explicit testing boundaries:

Unit tests
	•	VFS service
	•	Pure logic
	•	Storage isolation per test
	•	No UI or DOM assumptions

Integration tests
	•	FileMan.EXE consuming VFS
	•	Rendering correctness
	•	Action flows (rename, delete, reset)

Explicit exclusions
	•	No visual snapshot testing
	•	No full E2E browser automation

Consequences

Positive
	•	Fast, reliable test suite
	•	Failures are local and diagnosable
	•	CI remains deterministic

Negative
	•	Some visual regressions rely on manual review

Related phases
	•	Phase 1–2: engine and test hardening
	•	Phase 3: persistent OS state

⸻
