# THIRD.EXE V1 Runtime Contract

Date: 2026-02-25  
Status: Implemented baseline (V1)

## 1) Scope

`THIRD.EXE` is a lightweight object-mode three.js playground with shared panel/fullscreen runtime state.

V1 includes:
- default scene bootstrapping,
- primitive spawn/select/delete/duplicate,
- `PLAY` and `EDIT` modes,
- edit gizmo with snap,
- play-mode physics grab/drag,
- local autosave persistence,
- preset object animations (`bounce`, `rotate`, `pulse`).

V1 excludes:
- mesh/face editing,
- parenting/hierarchy UI,
- model import,
- deep inspector panels.

## 2) Panel/Fullscreen Behavior

- `THIRD` state is owned by `ThirdProvider`.
- Desktop panel and fullscreen layer read/write the same provider state.
- `displayMode` transitions do not reset scene objects.
- Fullscreen closes on `Escape` and yields to `ME.EXE` fullscreen scope.

## 3) Runtime State Shape

Provider path:
- `src/third/ThirdProvider.tsx`

Primary runtime fields:
- `objects: ThirdSceneObject[]`
- `selectionId: string | null`
- `mode: 'play' | 'edit'`
- `snapEnabled: boolean`
- `transformMode: 'translate' | 'rotate' | 'scale'`
- `skyboxId: string`
- `cameraState: { position, target }`
- `displayMode: 'panel' | 'fullscreen'`

Key provider actions:
- `addPrimitive(type)`
- `selectObject(id)`
- `deleteSelected()`
- `duplicateSelected()`
- `setObjectAnimationPreset(id, preset)`
- `setMode(mode)` / `toggleMode()`
- `setTransformMode(mode)` / `toggleSnap()`
- `applyObjectTransforms(patches)`
- `setCameraState(cameraState)`
- `resetScene()` / `resetToSaved()`

## 4) Scene Defaults

On first load / destructive reset:
- Grid helper on XZ plane (`y-up`).
- Axes helper at origin.
- One default cube.
- Wireframe material style.
- Orbit camera control.

## 5) Interaction Contract

### EDIT mode

- Physics stepping is paused.
- `TransformControls` enabled for selected object.
- Hotkeys:
  - `W` move,
  - `E` rotate,
  - `R` scale,
  - `G` snap toggle.
- Snap toggle applies:
  - translation: `0.5`,
  - rotation: `15deg`,
  - scale: `0.1`.
- Active `EDIT` badge is always shown while in edit mode.
- Preset animation buttons are enabled only in `EDIT`.

### PLAY mode

- Physics stepping enabled (`cannon-es`, fixed timestep loop).
- Grab/drag uses raycast hit, fixed initial camera depth, and point-to-point constraint.
- Orbit controls disabled while mouse grab is active.
- Touch behavior:
  - one-finger press on object grabs,
  - two-finger gesture enables camera manipulation while grab is active.

## 6) Preset Animations

Preset set in V1:
- `none`,
- `bounce`,
- `rotate`,
- `pulse`.

Rules:
- Applies to selected object when clicked.
- Stored as object metadata.
- Evaluated only in `EDIT` mode (to avoid physics conflicts in `PLAY`).

## 7) Persistence Contract

Storage key:
- `terminalOS.third.v1.scene`

Persisted payload:
- versioned JSON metadata only,
- `objects`,
- `skyboxId`,
- optional `cameraState`.

Not persisted:
- binary skybox assets/HDR files,
- runtime-only control state.

Persistence behavior:
- autosave debounce,
- survives refresh/reopen on same device/browser profile,
- cleared by site data reset,
- `resetScene()` clears persisted payload and reseeds defaults.

## 8) Menu/Context Integration

Start menu (`THIRD` scope):
- `FOCUS THIRD PANEL`
- mode toggle action (dynamic `EDIT`/`PLAY` label)
- `RESET SCENE`

Subsystem right-click menu (`THIRD`):
- status rows include current mode,
- dynamic mode-switch action for discoverable edit entry,
- reset action.

## 9) Test Coverage

Added/updated tests:
- `src/third/state.test.ts`
- `src/third/storage.test.ts`
- `src/components/StatusBar/subsystemContextMenu.test.ts`
- `src/meos/menu/scopes.test.ts`

Validation baseline:
- `npm run build`
- `npm test`
