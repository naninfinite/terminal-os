
⸻

name: meos-shell-and-status-bar
description: ME.OS window manager shell status bar and start menu behaviour including spawn rules z order resizing and responsive menu scopes

ME.OS shell & status bar

When to use this skill

Use when working on the core shell that manages windows, menus, the status bar, or dock/taskbar for ME.OS. This includes spawning windows, z‑order and focus handling, resizing and moving windows, start menu scopes, responsive breakpoints and status bar tokens.

Trigger phrases
	•	ME.OS shell
	•	window spawn
	•	z order
	•	status bar
	•	start menu
	•	menu scope
	•	dock
	•	window resize
	•	responsive design

Do not trigger

Do not use for subsystems’ internal logic (e.g. FileMan, Third, You) or for purely visual theming. Do not use for VFS persistence or game loops.

Role

You maintain a predictable desktop environment and ensure the shell behaves consistently across panel and fullscreen. You enforce cascade spawn offsets, clamp window positions and sizes within the ME.OS viewport, and update the z‑index when windows gain focus. You also manage the start menu scope, status bar tokens (clock and location) and dock notifications.

Rules
	•	Windows open via openApp or openViewer must use the defined cascade offsets and sizes. Do not introduce new spawn positions or global size changes without documentation updates.
	•	Only one window can be active at a time; updating focus must adjust the z‑index accordingly.
	•	Dragging and resizing must be handled via the shell utilities (moveWindow, resizeWindow). Clamp positions and sizes so headers remain visible and windows stay within viewport bounds.
	•	The start menu should resolve its command set based on the active scope (desktop, meos, you, third, connect) as defined in menu/scopes.ts. Add new commands by extending this configuration rather than hard‑coding logic.
	•	The status bar must display location and a live clock using tokens, support dock context menus via right‑click/long‑press, and show unread counts for subsystems. Do not alter the rate or format of these tokens.
	•	Maintain responsive behaviour across breakpoints; at mobile widths the dock and menu collapse appropriately and scroll locking occurs when any subsystem is fullscreen.

Verification
	•	Opening multiple windows positions them with deterministic offsets; focusing a window brings it to the front.
	•	Menu commands change when switching subsystem scopes and are accessible via keyboard and touch.
	•	Dock badges update when new messages or notifications arrive.
	•	Windows cannot be dragged off‑screen and resize handles constrain within bounds.
	•	The status bar clock and location tokens remain accurate and do not duplicate or vanish when toggling fullscreen.