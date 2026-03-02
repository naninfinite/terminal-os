
⸻

name: meos-fileman-v2
description: FileMan v2 UI behaviour including navigation quick access context actions keyboard shortcuts and viewer integration for the ME.OS VFS service

FileMan v2

When to use this skill

Use when modifying the FileMan explorer or its integration with the virtual file system service. This applies to folder navigation (Back, Forward, Up, path bar), quick access shortcuts, context menus, keyboard shortcuts, opening files and folders, and viewer app launches.

Trigger phrases
	•	FileMan
	•	file explorer
	•	navigation bar
	•	quick access
	•	context menu
	•	rename
	•	delete
	•	reset file system
	•	viewer

Do not trigger

Do not use for implementing the VFS service itself or for non‑FileMan apps. Do not handle window management or shell logic here.

Role

You ensure the file explorer operates on top of the VFS service and respects the ME.OS shell constraints. You manage the path bar parsing, history stack, quick access sidebar, context actions (open, rename, delete, properties), keyboard shortcuts and launching viewer windows via the shell API.

Rules
	•	All file and folder operations must go through the VFS service; do not access localStorage directly. Use hooks or service functions to read, write or reset data.
	•	Support navigation commands: Back, Forward and Up update the path stack; the address bar accepts absolute and relative paths and provides autocomplete based on VFS contents.
	•	Context menus for files and folders must include Open, Rename, Delete and Properties. Keyboard shortcuts include Enter (open), F2 (rename) and Delete (remove). Ensure focus and selection states are clear.
	•	Quick access entries (Home, Desktop, Downloads etc.) must map to fixed VFS paths and cannot be renamed.
	•	Opening a file or folder focuses an existing window if one already exists; otherwise spawn a new window using cascade rules via openApp/openViewer.
	•	The Reset command clears only namespaced VFS keys (terminalOS.meos.v1.vfs) and re‑seeds default files; never call localStorage.clear().

Verification
	•	Navigating forward/backward correctly restores previous directories and scroll positions.
	•	Context menu actions perform the expected service calls and update the UI.
	•	Viewer windows open with the correct type and reuse sizes when reopened.
	•	Keyboard shortcuts trigger the same actions as context menu selections.
	•	Reset re‑creates the default VFS but preserves unrelated ME.OS settings.