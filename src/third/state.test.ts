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
  setObjectPhysicsEnabled,
  setPhysicsEnabled,
  setSelection,
  togglePhysics,
} from './state';

describe('third state helpers', () => {
  it('creates deterministic default scene with one cube', () => {
    const state = createDefaultThirdRuntimeState();
    expect(state.objects).toHaveLength(1);
    expect(state.objects[0].type).toBe('cube');
    expect(state.objects[0].transform.position).toEqual({ x: 0, y: 0.5, z: 0 });
    expect(state.objects[0].physicsEnabled).toBe(false);
    expect(state.objects[0].material.wireframe).toBe(false);
    expect(state.objects[0].material.preset).toBe('matte');
    expect(state.mode).toBe('play');
    expect(state.physicsEnabled).toBe(false);
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
    expect(hydrated.physicsEnabled).toBe(false);
    expect(hydrated.snapEnabled).toBe(false);
    expect(hydrated.transformMode).toBe('translate');
  });

  it('toggles global and per-object physics state deterministically', () => {
    const seeded = createDefaultThirdRuntimeState();
    const firstId = seeded.objects[0].id;
    const globalOn = setPhysicsEnabled(seeded, true);
    expect(globalOn.physicsEnabled).toBe(true);

    const globalFlipped = togglePhysics(globalOn);
    expect(globalFlipped.physicsEnabled).toBe(false);

    const objectEnabled = setObjectPhysicsEnabled(globalFlipped, firstId, true);
    expect(objectEnabled.objects.find((item) => item.id === firstId)?.physicsEnabled).toBe(true);
  });

  it('serializes and hydrates global/per-object physics flags', () => {
    const seeded = createDefaultThirdRuntimeState();
    const firstId = seeded.objects[0].id;
    const globalOn = setPhysicsEnabled(seeded, true);
    const objectOn = setObjectPhysicsEnabled(globalOn, firstId, true);
    const moved = applyObjectTransforms(objectOn, [{
      id: firstId,
      position: { x: 1, y: 2, z: 3 },
    }]);

    const persisted = serializeStateForPersistence(moved);
    expect(persisted.physicsEnabled).toBe(true);
    expect(persisted.objects[0].physicsEnabled).toBe(true);

    const hydrated = hydrateStateFromPersistence(persisted);
    expect(hydrated.physicsEnabled).toBe(true);
    expect(hydrated.objects[0].physicsEnabled).toBe(true);
    expect(hydrated.objects[0].transform.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(hydrated.cameraState.projectionMode).toBe('perspective');
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
    const withOrtho = {
      ...wireframeOn,
      cameraState: {
        ...wireframeOn.cameraState,
        projectionMode: 'orthographic' as const,
      },
    };

    const persisted = serializeStateForPersistence(withOrtho);
    expect(persisted.cameraState?.projectionMode).toBe('orthographic');
    expect(persisted.objects[0].material.wireframe).toBe(true);

    const hydrated = hydrateStateFromPersistence(persisted);
    expect(hydrated.cameraState.projectionMode).toBe('orthographic');
    expect(hydrated.objects[0].material.wireframe).toBe(true);
  });
});
