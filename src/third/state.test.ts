import { describe, expect, it } from 'vitest';
import {
  addPrimitive,
  createDefaultThirdRuntimeState,
  deleteSelected,
  duplicateSelected,
  hydrateStateFromPersistence,
  serializeStateForPersistence,
  setAnimationPreset,
  setSelection,
} from './state';

describe('third state helpers', () => {
  it('creates deterministic default scene with one cube', () => {
    const state = createDefaultThirdRuntimeState();
    expect(state.objects).toHaveLength(1);
    expect(state.objects[0].type).toBe('cube');
    expect(state.objects[0].transform.position).toEqual({ x: 0, y: 0.5, z: 0 });
    expect(state.mode).toBe('play');
    expect(state.snapEnabled).toBe(false);
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
    expect(hydrated.mode).toBe('play');
    expect(hydrated.snapEnabled).toBe(false);
    expect(hydrated.transformMode).toBe('translate');
  });
});
