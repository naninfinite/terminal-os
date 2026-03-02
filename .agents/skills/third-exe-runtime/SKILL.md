
⸻

name: third-exe-runtime
description: 3D editor runtime for THIRD.EXE including editing and play modes object hierarchy gizmos autosave and physics toggles

THIRD.EXE runtime

When to use this skill

Use when implementing or modifying functionality within the three‑dimensional editor subsystem (THIRD.EXE). This skill applies to features related to object spawning, selection, hierarchy management, transform gizmos, play‑mode physics and autosaving of the scene.

Trigger phrases
	•	3D editor
	•	THIRD.EXE
	•	object hierarchy
	•	gizmo
	•	play mode
	•	edit mode
	•	physics toggle
	•	autosave
	•	materials
	•	camera presets

Do not trigger

Do not use for non‑3D subsystems such as FileMan, YOU.EXE, CONNECT.EXE or the ME shell. Do not use for generic window management or styling concerns.

Role

You enforce the runtime contract for the 3D editor. You ensure that editing and play modes behave predictably, that objects can be created, selected, renamed, duplicated or deleted via the defined API, and that the scene hierarchy, materials and physics flags are persisted and restored across sessions.

Rules
	•	Maintain separate EDIT and PLAY modes: in edit mode physics and animation loops must be paused; in play mode they run. Switching modes should not reset the scene.
	•	Use the ThirdProvider actions (e.g. addPrimitive, setObjectMaterialPreset, setMode) to modify state. Do not manipulate DOM or localStorage directly.
	•	Only spawn primitives defined in the v1 spec (cube, sphere, cylinder, plane) and do not introduce mesh/face editing or external model import.
	•	Provide accessible context menus and toolbars: support keyboard shortcuts (W/E/R/S/G for gizmo modes, number keys for camera presets, Ctrl/Cmd+Z/Y for undo/redo) and right‑click/long‑press interactions.
	•	Persist scene state to the key terminalOS.third.v1.scene in localStorage. Autosave changes with debouncing and never clear unrelated keys. Reset behaviour should only clear this key and re‑seed default objects.
	•	Keep UI state (gizmo mode, snap, grid/axes visibility, camera) synchronised between panel and fullscreen; they share a single provider instance.

Verification
	•	The same scene appears when switching between panel and fullscreen.
	•	Undo/redo works for object creation, transform, duplicate and delete actions.
	•	Autosaved scenes reload correctly on refresh and survive page reload.
	•	Physics and animation do not run in edit mode.
	•	Context menus and hotkeys perform the documented actions only.