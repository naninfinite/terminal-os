import { describe, expect, it } from 'vitest';
import {
  addPrimitive,
  applyObjectTransforms,
  createDefaultThirdRuntimeState,
  deleteSelected,
  duplicateSelected,
  hydrateStateFromPersistence,
  serializeStateForPersistence,
  setAnimationPreset,
  setObjectMaterialColor,
  setObjectMaterialPreset,
  setObjectMaterialWireframe,
  setObjectName,
  setObjectLocked,
  setObjectParent,
  setObjectPhysicsEnabled,
  setShowAxes,
  setShowGrid,
  setSelection,
  toggleSnap,
  toggleShowAxes,
  toggleShowGrid,
  updateObjectTransform,
} from './state';

describe('third state helpers', () => {
  it('creates deterministic default scene with one cube', () => {
    const state = createDefaultThirdRuntimeState();
    expect(state.objects).toHaveLength(1);
    expect(state.objects[0].type).toBe('cube');
    expect(state.objects[0].transform.position).toEqual({ x: 0, y: 0.5, z: 0 });
    expect(state.objects[0].parentId).toBeNull();
    expect(state.objects[0].physicsEnabled).toBe(false);
    expect(state.objects[0].locked).toBe(false);
    expect(state.objects[0].material.wireframe).toBe(false);
    expect(state.objects[0].material.preset).toBe('matte');
    expect(state.mode).toBe('play');
    expect(state.showGrid).toBe(false);
    expect(state.showAxes).toBe(false);
    expect(state.snapEnabled).toBe(false);
    expect(state.cameraState.projectionMode).toBe('perspective');
  });

  it('adds and duplicates primitives while keeping selection single-target', () => {
    const seeded = createDefaultThirdRuntimeState();
    const withSphere = addPrimitive(seeded, 'sphere');
    expect(withSphere.objects).toHaveLength(2);
    const selectedId = withSphere.selectionId;
    expect(selectedId).toBeTruthy();

    const duplicated = duplicateSelected(withSphere);
    expect(duplicated.objects).toHaveLength(3);
    const original = withSphere.objects.find((item) => item.id === selectedId);
    const copy = duplicated.objects.find((item) => item.id === duplicated.selectionId);
    expect(original).toBeTruthy();
    expect(copy).toBeTruthy();
    if (!original || !copy) return;
    expect(copy.transform.position.x).toBeCloseTo(original.transform.position.x + 0.6, 5);
    expect(copy.transform.position.z).toBeCloseTo(original.transform.position.z + 0.6, 5);
    expect(copy.parentId).toBe(original.parentId);
  });

  it('supports explicit spawn transforms when adding primitives', () => {
    const seeded = createDefaultThirdRuntimeState();
    const withPlane = addPrimitive(seeded, 'plane', {
      position: { x: 3, y: 2, z: 1 },
      rotation: { x: 0.25, y: 0.5, z: 0.75 },
      scale: { x: 2, y: 1, z: 4 },
    });

    const added = withPlane.objects.find((object) => object.id === withPlane.selectionId);
    expect(added).toBeTruthy();
    if (!added) return;

    expect(added.transform).toEqual({
      position: { x: 3, y: 2, z: 1 },
      rotation: { x: 0.25, y: 0.5, z: 0.75 },
      scale: { x: 2, y: 1, z: 4 },
    });
  });

  it('deletes selected object and updates selection safely', () => {
    const seeded = createDefaultThirdRuntimeState();
    const withSphere = addPrimitive(seeded, 'sphere');
    const selectedSphere = withSphere.selectionId;
    const withCubeSelected = setSelection(withSphere, seeded.objects[0].id);
    const afterDelete = deleteSelected(withCubeSelected);

    expect(afterDelete.objects).toHaveLength(1);
    expect(afterDelete.objects[0].id).toBe(selectedSphere);
    expect(afterDelete.selectionId).toBe(selectedSphere);
  });

  it('hydrates runtime state from persisted payload and resets runtime flags', () => {
    const seeded = createDefaultThirdRuntimeState();
    const selectedId = seeded.selectionId;
    expect(selectedId).toBeTruthy();
    if (!selectedId) return;
    const animated = setAnimationPreset(seeded, selectedId, 'pulse');
    const persisted = serializeStateForPersistence(animated);
    const hydrated = hydrateStateFromPersistence(persisted);

    expect(hydrated.objects).toHaveLength(1);
    expect(hydrated.objects[0].animationPreset).toBe('pulse');
    expect(hydrated.objects[0].physicsEnabled).toBe(false);
    expect(hydrated.mode).toBe('play');
    expect(hydrated.snapEnabled).toBe(false);
    expect(hydrated.transformMode).toBe('translate');
  });

  it('toggles per-object physics state deterministically', () => {
    const seeded = createDefaultThirdRuntimeState();
    const firstId = seeded.objects[0].id;
    const objectEnabled = setObjectPhysicsEnabled(seeded, firstId, true);
    expect(objectEnabled.objects.find((item) => item.id === firstId)?.physicsEnabled).toBe(true);
  });

  it('serializes and hydrates per-object physics flags', () => {
    const seeded = createDefaultThirdRuntimeState();
    const firstId = seeded.objects[0].id;
    const objectOn = setObjectPhysicsEnabled(seeded, firstId, true);
    const moved = applyObjectTransforms(objectOn, [{
      id: firstId,
      position: { x: 1, y: 2, z: 3 },
    }]);

    const persisted = serializeStateForPersistence(moved);
    expect(persisted.objects[0].physicsEnabled).toBe(true);

    const hydrated = hydrateStateFromPersistence(persisted);
    expect(hydrated.objects[0].physicsEnabled).toBe(true);
    expect(hydrated.objects[0].transform.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(hydrated.cameraState.projectionMode).toBe('perspective');
  });

  it('toggles and persists scene helper visibility flags', () => {
    const seeded = createDefaultThirdRuntimeState();
    const withGrid = setShowGrid(seeded, true);
    const withAxes = toggleShowAxes(withGrid);
    expect(withAxes.showGrid).toBe(true);
    expect(withAxes.showAxes).toBe(true);

    const flipped = toggleShowGrid(setShowAxes(withAxes, false));
    expect(flipped.showGrid).toBe(false);
    expect(flipped.showAxes).toBe(false);

    const persisted = serializeStateForPersistence(withAxes);
    expect(persisted.showGrid).toBe(true);
    expect(persisted.showAxes).toBe(true);

    const hydrated = hydrateStateFromPersistence(persisted);
    expect(hydrated.showGrid).toBe(true);
    expect(hydrated.showAxes).toBe(true);
  });

  it('keeps snap as runtime-only state across serialization and hydration', () => {
    const seeded = toggleSnap(createDefaultThirdRuntimeState());
    expect(seeded.snapEnabled).toBe(true);

    const persisted = serializeStateForPersistence(seeded);
    expect('snapEnabled' in persisted).toBe(false);

    const hydrated = hydrateStateFromPersistence(persisted);
    expect(hydrated.snapEnabled).toBe(false);
  });

  it('updates object material preset and color with sanitization', () => {
    const seeded = createDefaultThirdRuntimeState();
    const firstId = seeded.objects[0].id;
    const presetUpdated = setObjectMaterialPreset(seeded, firstId, 'glass');
    expect(presetUpdated.objects[0].material.preset).toBe('glass');

    const colorUpdated = setObjectMaterialColor(presetUpdated, firstId, '#4cd6ff');
    expect(colorUpdated.objects[0].material.color).toBe('#4cd6ff');

    const invalidColor = setObjectMaterialColor(colorUpdated, firstId, 'bad-color');
    expect(invalidColor.objects[0].material.color).toBe('#00ff66');
  });

  it('persists wireframe and projection mode in camera state serialization', () => {
    const seeded = createDefaultThirdRuntimeState();
    const firstId = seeded.objects[0].id;
    const wireframeOn = setObjectMaterialWireframe(seeded, firstId, true);
    const locked = setObjectLocked(wireframeOn, firstId, true);
    const withOrtho = {
      ...locked,
      cameraState: {
        ...locked.cameraState,
        projectionMode: 'orthographic' as const,
      },
    };

    const persisted = serializeStateForPersistence(withOrtho);
    expect(persisted.cameraState?.projectionMode).toBe('orthographic');
    expect(persisted.objects[0].material.wireframe).toBe(true);
    expect(persisted.objects[0].locked).toBe(true);

    const hydrated = hydrateStateFromPersistence(persisted);
    expect(hydrated.cameraState.projectionMode).toBe('orthographic');
    expect(hydrated.objects[0].material.wireframe).toBe(true);
    expect(hydrated.objects[0].locked).toBe(true);
    expect(hydrated.selectionId).toBeNull();
  });

  it('supports parent reparenting and blocks cyclic hierarchy links', () => {
    const seeded = createDefaultThirdRuntimeState();
    const withSphere = addPrimitive(seeded, 'sphere');
    const withCylinder = addPrimitive(withSphere, 'cylinder');
    const rootId = seeded.objects[0].id;
    const sphereId = withSphere.selectionId;
    const cylinderId = withCylinder.selectionId;

    expect(sphereId).toBeTruthy();
    expect(cylinderId).toBeTruthy();
    if (!sphereId || !cylinderId) return;

    const sphereChildOfRoot = setObjectParent(withCylinder, sphereId, rootId);
    const cylinderChildOfSphere = setObjectParent(sphereChildOfRoot, cylinderId, sphereId);
    expect(cylinderChildOfSphere.objects.find((item) => item.id === sphereId)?.parentId).toBe(rootId);
    expect(cylinderChildOfSphere.objects.find((item) => item.id === cylinderId)?.parentId).toBe(sphereId);

    const cycleAttempt = setObjectParent(cylinderChildOfSphere, rootId, cylinderId);
    expect(cycleAttempt.objects.find((item) => item.id === rootId)?.parentId).toBeNull();

    const withSphereSelected = setSelection(cylinderChildOfSphere, sphereId);
    const afterDelete = deleteSelected(withSphereSelected);
    expect(afterDelete.objects.find((item) => item.id === cylinderId)?.parentId).toBe(rootId);
  });

  it('supports object rename with trim and empty fallback', () => {
    const seeded = createDefaultThirdRuntimeState();
    const id = seeded.objects[0].id;
    const renamed = setObjectName(seeded, id, '   Hero Cube   ');
    expect(renamed.objects[0].name).toBe('Hero Cube');

    const emptyAttempt = setObjectName(renamed, id, '   ');
    expect(emptyAttempt.objects[0].name).toBe('Hero Cube');
  });

  it('locks object edits and prevents selecting locked objects', () => {
    const seeded = createDefaultThirdRuntimeState();
    const rootId = seeded.objects[0].id;
    const locked = setObjectLocked(seeded, rootId, true);
    const unlocked = setObjectLocked(locked, rootId, false);

    expect(locked.objects[0].locked).toBe(true);
    expect(locked.selectionId).toBeNull();
    expect(setSelection(locked, rootId).selectionId).toBeNull();

    const renamed = setObjectName(locked, rootId, 'Locked Name');
    expect(renamed.objects[0].name).toBe('Cube 1');

    const physicsOn = setObjectPhysicsEnabled(locked, rootId, true);
    expect(physicsOn.objects[0].physicsEnabled).toBe(false);

    const moved = updateObjectTransform(locked, {
      id: rootId,
      position: { x: 5, y: 5, z: 5 },
    });
    expect(moved.objects[0].transform.position).toEqual(seeded.objects[0].transform.position);

    const withSelected = setSelection(unlocked, rootId);
    const duplicateAttempt = duplicateSelected(setObjectLocked(withSelected, rootId, true));
    expect(duplicateAttempt.objects).toHaveLength(1);
    const deleteAttempt = deleteSelected(duplicateAttempt);
    expect(deleteAttempt.objects).toHaveLength(1);
  });

  it('moves selection to an unlocked object when locking current selection', () => {
    const seeded = createDefaultThirdRuntimeState();
    const withSphere = addPrimitive(seeded, 'sphere');
    const selectedId = withSphere.selectionId;
    expect(selectedId).toBeTruthy();
    if (!selectedId) return;

    const lockedSelected = setObjectLocked(withSphere, selectedId, true);
    expect(lockedSelected.selectionId).toBe(seeded.objects[0].id);
  });
});
