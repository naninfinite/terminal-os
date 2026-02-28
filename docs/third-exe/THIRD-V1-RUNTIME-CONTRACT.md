# THIRD.EXE V1 Runtime Contract

Date: 2026-02-26  
Status: Implemented baseline (V1)

## 1) Scope

`THIRD.EXE` is a lightweight object-mode three.js playground with shared panel/fullscreen runtime state.

V1 includes:
- default scene bootstrapping,
- primitive spawn/select/delete/duplicate,
- `PLAY` and `EDIT` modes,
- edit gizmo with snap,
- per-object lock/freeze controls with edit/simulation safety gates,
- unified utility panel:
  - right-side utility window on desktop,
  - bottom drawer on phones,
  - shared tabs: `SCENE`, `TRANSFORM`, `MATERIAL`, `ANIMATION`, `PHYSICS`, `CAMERA`,
- top-left scene toolbar for mode/gizmo/snap/grid/axes plus camera quick actions,
- object hierarchy tree with drag/drop parenting, inline rename, explicit unparent, and context menus,
- hierarchy object-menu child spawn actions (`ADD CHILD CUBE/SPHERE/CYLINDER/PLANE`),
- right-click viewport menu with grouped quick actions,
- play-mode physics grab/drag,
- per-object physics opt-in controls,
- per-object material selector (`matte`, `gloss`, `glass`, `neon`) + color + wireframe,
- camera projection toggle (`perspective`/`orthographic`) + preset view actions (`top`/`front`/`right`) + reset,
- camera keyboard navigation hotkeys (`1`/`3`/`7`/`5`, `F`),
- local autosave persistence,
- preset object animations (`bounce`, `rotate`, `pulse`).
- history undo/redo for core object edits.

V1 excludes:
- mesh/face editing,
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
- `showGrid: boolean`
- `showAxes: boolean`
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
- `setShowGrid(enabled)` / `toggleShowGrid()`
- `setShowAxes(enabled)` / `toggleShowAxes()`
- `setObjectPhysicsEnabled(id, enabled)`
- `setObjectLocked(id, enabled)`
- `setObjectMaterialPreset(id, preset)`
- `setObjectMaterialColor(id, color)`
- `setObjectMaterialWireframe(id, enabled)`
- `setTransformMode(mode)` / `toggleSnap()`
- `applyObjectTransforms(patches)`
- `setCameraState(cameraState)`
- `resetScene()` / `resetToSaved()`

## 4) Scene Defaults

On first load / destructive reset:
- Grid helper is available but hidden by default.
- Axes helper is available but hidden by default.
- One default cube.
- Theme-aware helper styling (when grid is visible):
  - dark theme: green-accent grid + default material tone,
  - light theme: near-black (`#101010`) grid + default material tone.
- Solid materials by default (`wireframe=false`, default `matte` preset).
- Orbit camera control.

## 5) Interaction Contract

### EDIT mode

- Physics stepping is paused.
- `TransformControls` enabled for selected object.
- Utility controls live in one shared panel with tabs:
  - `SCENE`,
  - `TRANSFORM`,
  - `MATERIAL`,
  - `ANIMATION`,
  - `PHYSICS`,
  - `CAMERA`.
- `SCENE` tab contains hierarchy UX controls:
  - drag/drop reparenting,
  - root drop target for unparent-to-scene,
  - inline rename (`double-click` or `F2`),
  - hierarchy row context menu (`right-click` / `ContextMenu` key / `Shift+F10`) for `FOCUS`, `LOCK/UNLOCK`, `ADD CHILD CUBE/SPHERE/CYLINDER/PLANE`, `RENAME`, `DUPLICATE`, `DELETE`, `UNPARENT`,
  - scene/root context menu (`right-click` / `ContextMenu` key / `Shift+F10`) for primitive add (`CUBE`, `SPHERE`, `CYLINDER`, `PLANE`).
- `SCENE` tab is list-first and menu-driven:
  - no persistent `ADD`/`DUP`/`DEL` buttons in the list window.
  - hierarchy rows show lock affordance (`L`) for locked objects.
  - optional list filters/sort controls: `LOCKED` and `LOCK FIRST`.
- Top-left scene toolbar owns quick scene controls:
  - mode toggle,
  - gizmo mode (`MOVE`/`ROTATE`/`SCALE`),
  - snap toggle,
  - grid toggle,
  - axes toggle,
  - camera projection toggle,
  - camera preset views (`TOP`/`FRONT`/`RIGHT`),
  - camera reset.
  - items are grouped (`transform` / `scene` / `camera`) with visual separators and consistent tooltip format.
- Utility section tabs (`TRANSFORM`, `MATERIAL`, `ANIMATION`, `PHYSICS`, `CAMERA`) each render one section at a time.
- Default section expansion starts with all utility section tabs open.
- Section open/closed state is preserved while switching tabs.
- `TRANSFORM` includes a compact `LOCK` checkbox for the selected object.
- Rotation fields display degrees and convert to radians in runtime state.
- Valid numeric inspector edits apply live while typing.
- Hotkeys:
  - `W` move,
  - `R` rotate,
  - `S` scale,
  - `G` snap toggle.
- History hotkeys:
  - `Cmd/Ctrl + Z` undo,
  - `Cmd/Ctrl + Shift + Z` redo,
  - `Cmd/Ctrl + Y` redo.
- Camera hotkeys (when not typing in a control):
  - `1` front view,
  - `3` right view,
  - `7` top view,
  - `5` projection toggle (`perspective`/`orthographic`),
  - `F` focus selected object.
- Focus behavior re-frames the camera to the selected object:
  - target distance adapts by object bounds with a stable near minimum,
  - camera applies a slight vertical bias (`+2Y`) for readability,
  - orthographic mode also updates zoom to keep the object visible.
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
- Locked objects are view/focus-only:
  - transform/material/animation/physics edit controls are disabled until unlocked,
  - locked objects are excluded from drag/drop reparent and transform-gizmo attachment.

### PLAY mode

- Physics stepping/simulation is `PLAY`-only.
- Object simulation/grab eligibility uses per-object physics + lock state:
  - object `physicsEnabled === true` and `locked !== true`.
- Grab/drag uses raycast hit, fixed initial camera depth, and point-to-point constraint.
- Entering `EDIT` from `PLAY` releases active grab and freezes all bodies at current transforms.
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
  - `SCENE` (mode/snap),
  - `OBJECT` (duplicate/delete/object physics),
  - `PANEL` (show/hide).
- If right-click raycast hits an object, that object is selected before menu actions.
- Object-group actions are disabled when the selected object is locked.
- Utility `CAMERA` tab mirrors projection + preset actions for keyboard-first access.
- Utility `CAMERA` tab layout order:
  - first row: `TOP` / `FRONT` / `RIGHT`,
  - second row: `PERSPECTIVE`/`ORTHOGRAPHIC` toggle + `RESET`.

### Mobile utility layout

- Phone layout uses the same unified utility panel as desktop, rendered as one bottom sheet anchored to the bottom edge.
- Drawer tabs match desktop: `SCENE`, `TRANSFORM`, `MATERIAL`, `ANIMATION`, `PHYSICS`, `CAMERA`.
- Mobile tab strip scrolls horizontally instead of wrapping.
- First entry defaults to the panel hidden for all users; only the viewport/object is shown until `SHOW PANEL` is used.
- Default active tab is `SCENE`.
- Panel visibility and active tab are runtime-local only (not persisted).
- Same-page remount restores the last panel visibility and active tab from in-memory session state.
- Browser reload resets the panel to hidden with `SCENE` as the active tab.

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
  - each object includes `physicsEnabled` and `locked`,
- `showGrid`,
- `showAxes`,
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
- `RESET SCENE`

Subsystem right-click menu (`THIRD`):
- status rows include current mode,
- dynamic mode-switch action for discoverable edit entry,
- reset action.

## 9) Test Coverage

Added/updated tests:
- `src/third/state.test.ts`
- `src/third/storage.test.ts`
- `src/components/THIRD/transformInspector.test.ts`
- `src/components/THIRD/thirdCameraControls.test.ts`
- `src/components/THIRD/thirdInspectorCameraLayout.test.ts`
- `src/components/THIRD/thirdInspectorSections.test.ts`
- `src/components/THIRD/thirdViewportMenu.test.ts`
- `src/components/THIRD/thirdHierarchyMenu.test.ts`
- `src/components/THIRD/thirdSceneToolbar.test.ts`
- `src/third/history.test.ts`
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
- Inspector polish follow-up:
  - continue iconography upgrade from placeholder two-letter glyphs to SVG toolbar icons,
  - keep multi-object drag-box selection out of current scope,
  - schedule a dedicated broader inspector UI/UX cleanup pass later.
- Primitive catalog expansion follow-up:
  - evaluate adding additional primitives after inspector polish baseline is stable
  - initial candidates: `cone`, `torus`, `capsule`, `pyramid`, `icosphere`.
- Inspector ordering follow-up:
  - revisit section ordering after hierarchy/material/camera controls settle.
- Mobile long-press context follow-up:
  - reduce tap/selection highlight interference on THIRD interactive surfaces so long-press can act as right-click more reliably,
  - evaluate broader site-wide highlight behavior as a separate pass to avoid accidental text-selection regressions.
- Animation mode parity follow-up:
  - current contract evaluates presets in `EDIT` only,
  - target behavior: allow preset animations in both `EDIT` and `PLAY`,
  - keep physics simulation strictly `PLAY`-only while validating animation/physics coexistence rules.
