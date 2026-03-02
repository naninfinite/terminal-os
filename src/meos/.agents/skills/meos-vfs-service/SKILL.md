
⸻

name: meos-vfs-service
description: Virtual file system service semantics including persistence versioning atomic writes and error handling for ME.OS

ME.OS VFS service

When to use this skill

Use when working on the underlying virtual file system service that powers FileMan and other subsystems. This includes persisting files and folders, versioning, atomic operations, reset semantics and error handling.

Trigger phrases
	•	virtual file system
	•	VFS
	•	persistence
	•	atomic write
	•	versioned storage
	•	reset
	•	error handling

Do not trigger

Do not use for UI concerns such as FileMan or viewer behaviour. Do not manage shell or window interactions here.

Role

You are responsible for the internal data model of ME.OS files and folders. You ensure atomic operations and versioned persistence, enforce invariants (no duplicate names in a directory, valid path segments) and expose a clean API to UI consumers. You manage resets and migrations across versions.

Rules
	•	Persist all data under the key terminalOS.meos.v1.vfs (or subsequent version keys when upgrading). Do not scatter data across multiple top‑level keys.
	•	Provide atomic operations: create, rename, move, delete and reset. If any part of an operation fails, roll back to the previous consistent state.
	•	Validate inputs: file and folder names must be non‑empty strings without path separators; reject operations that would produce cycles or invalid structures.
	•	When upgrading the schema, migrate data to a new version key and keep backward‑compatibility code until it is no longer needed. Document the migration in ADR and changelog.
	•	The reset operation should remove only the current VFS namespace and then re‑seed default files and folders.
	•	All errors should be explicit and typed (e.g., NotFoundError, AlreadyExistsError, InvalidNameError) so UI layers can display meaningful messages.

Verification
	•	After any operation, reading back the VFS returns a consistent tree with no orphan nodes or duplicate names.
	•	Partial failures roll back without side effects.
	•	Data persists across sessions and page reloads.
	•	Reset re‑creates the expected default structure and does not remove other ME.OS data.