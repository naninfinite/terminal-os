import { describe, expect, it } from 'vitest';
import {
  addPrimitive,
  createDefaultThirdRuntimeState,
  setObjectMaterialColor,
  updateObjectTransform,
} from './state';
import {
  applyThirdHistoryMutation,
  createThirdHistoryStore,
  redoThirdHistory,
  THIRD_TRANSFORM_COALESCE_MS,
  undoThirdHistory,
} from './history';

describe('third history store', () => {
  it('tracks mutations and supports undo/redo', () => {
    const seed = createDefaultThirdRuntimeState();
    const withHistory = applyThirdHistoryMutation(createThirdHistoryStore(seed), {
      mutate: (state) => addPrimitive(state, 'sphere'),
      track: true,
    });

    expect(withHistory.present.objects).toHaveLength(2);
    expect(withHistory.undoStack).toHaveLength(1);

    const undone = undoThirdHistory(withHistory);
    expect(undone.present.objects).toHaveLength(1);
    expect(undone.redoStack).toHaveLength(1);

    const redone = redoThirdHistory(undone);
    expect(redone.present.objects).toHaveLength(2);
    expect(redone.undoStack).toHaveLength(1);
  });

  it('does not track untracked runtime mutations', () => {
    const seed = createDefaultThirdRuntimeState();
    const next = applyThirdHistoryMutation(createThirdHistoryStore(seed), {
      mutate: (state) => ({
        ...state,
        mode: 'edit',
      }),
      track: false,
    });

    expect(next.present.mode).toBe('edit');
    expect(next.undoStack).toHaveLength(0);
  });

  it('coalesces sequential transform updates into one undo snapshot', () => {
    const seed = createDefaultThirdRuntimeState();
    const id = seed.objects[0].id;
    const initial = createThirdHistoryStore(seed);

    const stepA = applyThirdHistoryMutation(initial, {
      mutate: (state) => updateObjectTransform(state, {
        id,
        position: { x: 1, y: 0.5, z: 0 },
      }),
      track: true,
      coalesceKey: 'transform',
      coalesceWindowMs: THIRD_TRANSFORM_COALESCE_MS,
      nowMs: 1000,
    });
    const stepB = applyThirdHistoryMutation(stepA, {
      mutate: (state) => updateObjectTransform(state, {
        id,
        position: { x: 2, y: 0.5, z: 0 },
      }),
      track: true,
      coalesceKey: 'transform',
      coalesceWindowMs: THIRD_TRANSFORM_COALESCE_MS,
      nowMs: 1200,
    });

    expect(stepB.undoStack).toHaveLength(1);

    const undone = undoThirdHistory(stepB);
    expect(undone.present.objects[0].transform.position.x).toBe(0);
  });

  it('starts a new transform history frame after coalesce window expires', () => {
    const seed = createDefaultThirdRuntimeState();
    const id = seed.objects[0].id;
    const initial = createThirdHistoryStore(seed);

    const stepA = applyThirdHistoryMutation(initial, {
      mutate: (state) => updateObjectTransform(state, {
        id,
        position: { x: 1, y: 0.5, z: 0 },
      }),
      track: true,
      coalesceKey: 'transform',
      coalesceWindowMs: THIRD_TRANSFORM_COALESCE_MS,
      nowMs: 1000,
    });
    const stepB = applyThirdHistoryMutation(stepA, {
      mutate: (state) => updateObjectTransform(state, {
        id,
        position: { x: 2, y: 0.5, z: 0 },
      }),
      track: true,
      coalesceKey: 'transform',
      coalesceWindowMs: THIRD_TRANSFORM_COALESCE_MS,
      nowMs: 1700,
    });

    expect(stepB.undoStack).toHaveLength(2);
  });

  it('clears redo stack after a new tracked edit', () => {
    const seed = createDefaultThirdRuntimeState();
    const first = applyThirdHistoryMutation(createThirdHistoryStore(seed), {
      mutate: (state) => addPrimitive(state, 'sphere'),
      track: true,
    });
    const undone = undoThirdHistory(first);
    expect(undone.redoStack).toHaveLength(1);

    const edited = applyThirdHistoryMutation(undone, {
      mutate: (state) => setObjectMaterialColor(state, state.objects[0].id, '#4cd6ff'),
      track: true,
    });

    expect(edited.redoStack).toHaveLength(0);
  });
});
