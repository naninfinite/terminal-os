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
- Unity-style transform inspector sections (scene/camera/objects/transform/animation/physics/material),
- right-click viewport menu with grouped quick actions,
- play-mode physics grab/drag,
- global + per-object physics opt-in controls,
- per-object material selector (`matte`, `gloss`, `glass`, `neon`) + color + wireframe,
- camera projection toggle (`perspective`/`orthographic`) + preset view actions (`top`/`front`/`right`) + reset,
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
- `physicsEnabled: boolean` (global master toggle)
- `snapEnabled: boolean`
- `transformMode: 'translate' | 'rotate' | 'scale'`
- `skyboxId: string`
- `cameraState: { position, target, projectionMode }`
- `displayMode: 'panel' | 'fullscreen'`

Key provider actions:
- `addPrimitive(type)`
- `selectObject(id)`
- `deleteSelected()`
- `duplicateSelected()`
- `setObjectAnimationPreset(id, preset)`
- `setMode(mode)` / `toggleMode()`
- `setPhysicsEnabled(enabled)` / `togglePhysics()`
- `setObjectPhysicsEnabled(id, enabled)`
- `setObjectMaterialPreset(id, preset)`
- `setObjectMaterialColor(id, color)`
- `setObjectMaterialWireframe(id, enabled)`
- `setTransformMode(mode)` / `toggleSnap()`
- `applyObjectTransforms(patches)`
- `setCameraState(cameraState)`
- `resetScene()` / `resetToSaved()`

## 4) Scene Defaults

On first load / destructive reset:
- Grid helper on XZ plane (`y-up`).
- Axes helper at origin.
- One default cube.
- Theme-aware baseline styling:
  - dark theme: green-accent grid + default material tone,
  - light theme: near-black (`#101010`) grid + default material tone.
- Solid materials by default (`wireframe=false`, default `matte` preset).
- Orbit camera control.

## 5) Interaction Contract

### EDIT mode

- Physics stepping is paused.
- `TransformControls` enabled for selected object.
- Right-docked inspector is visible by default, hideable, and section-collapsible.
- Full edit workflow lives inside inspector sections:
  - `SCENE`, `CAMERA`, `OBJECTS`, `TRANSFORM`, `ANIMATION`, `PHYSICS`, `MATERIAL`.
- Default inspector expansion opens:
  - `SCENE`, `CAMERA`, `OBJECTS`, `TRANSFORM`.
- Default inspector expansion collapses:
  - `ANIMATION`, `PHYSICS`, `MATERIAL`.
- Rotation fields display degrees and convert to radians in runtime state.
- Valid numeric inspector edits apply live while typing.
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
- Material controls are enabled only in `EDIT` for the selected object:
  - preset buttons (`MATTE` / `GLOSS` / `GLASS` / `NEON`),
  - swatch buttons + color picker,
  - wireframe toggle.

### PLAY mode

- Physics stepping runs only when global `physicsEnabled` is `ON`.
- Object simulation/grab eligibility requires strict AND:
  - global `physicsEnabled === true`,
  - object `physicsEnabled === true`.
- Grab/drag uses raycast hit, fixed initial camera depth, and point-to-point constraint.
- Disabling global physics during play releases active grab and freezes bodies at current transforms.
- Orbit controls disabled while mouse grab is active.
- Orbit panning is enabled in standard controls when not actively grabbing.
- Touch behavior:
  - one-finger press on object grabs,
  - two-finger gesture enables dolly/pan camera manipulation.

### Viewport right-click menu

- Right-click opens a local viewport menu at cursor position.
- Right-drag continues camera pan and does not open the menu (movement tolerance guard).
- Menu groups:
  - `ADD` (cube/sphere/cylinder/plane),
  - `CAMERA` (projection toggle, top/front/right, reset),
  - `SCENE` (mode/snap/physics),
  - `OBJECT` (duplicate/delete/object physics),
  - `INSPECTOR` (show/hide/collapse all/expand all).
- If right-click raycast hits an object, that object is selected before menu actions.
- Inspector `CAMERA` section mirrors projection + preset actions for keyboard-first access.

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
  - each object includes material metadata (`color`, `preset`, `wireframe`),
- global `physicsEnabled`,
- per-object `physicsEnabled`,
- `skyboxId`,
- optional `cameraState` (`position`, `target`, `projectionMode`).

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
- physics toggle action (`PHYSICS: ON/OFF`)
- `RESET SCENE`

Subsystem right-click menu (`THIRD`):
- status rows include current mode + physics state,
- dynamic mode-switch action for discoverable edit entry,
- dynamic physics toggle action,
- reset action.

## 9) Test Coverage

Added/updated tests:
- `src/third/state.test.ts`
- `src/third/storage.test.ts`
- `src/components/THIRD/transformInspector.test.ts`
- `src/components/THIRD/thirdViewportMenu.test.ts`
- `src/components/StatusBar/subsystemContextMenu.test.ts`
- `src/meos/menu/scopes.test.ts`

Validation baseline:
- `npm run build`
- `npm test`

## 10) Deferred TODOs / Future Notes

- Spawn material policy follow-up:
  - baseline now treats the legacy default material color as theme-semantic at render time:
    - dark resolves to green-accent (`#00ff66`),
    - light resolves to near-black (`#101010`),
  - custom non-default material colors remain user-defined and unchanged across themes,
  - future palette tuning (swatches/preset defaults) can still be layered if needed.
