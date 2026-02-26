import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  addPrimitive,
  applyObjectTransforms,
  createDefaultThirdRuntimeState,
  deleteSelected,
  duplicateSelected,
  hydrateStateFromPersistence,
  serializeStateForPersistence,
  setAnimationPreset,
  setCameraState,
  setEditorMode,
  setObjectMaterialColor,
  setObjectMaterialPreset,
  setObjectMaterialWireframe,
  setObjectName,
  setObjectParent,
  setObjectLocked,
  setObjectPhysicsEnabled,
  setShowAxes,
  setShowGrid,
  setSelection,
  setSkyboxId,
  setSnapEnabled,
  setTransformMode,
  toggleEditorMode,
  toggleShowAxes,
  toggleShowGrid,
  toggleSnap,
  updateObjectTransform,
} from './state';
import {
  applyThirdHistoryMutation,
  createThirdHistoryStore,
  redoThirdHistory,
  replaceThirdHistoryState,
  THIRD_TRANSFORM_COALESCE_MS,
  undoThirdHistory,
} from './history';
import {
  clearPersistedThirdScene,
  readPersistedThirdScene,
  writePersistedThirdScene,
} from './storage';
import type {
  ThirdAnimationPreset,
  ThirdCameraState,
  ThirdDisplayMode,
  ThirdEditorMode,
  ThirdMaterialPreset,
  ThirdPrimitiveType,
  ThirdRuntimeState,
  ThirdTransformMode,
  ThirdTransformPatch,
} from './types';

const AUTOSAVE_DELAY_MS = 300;
const TRANSFORM_HISTORY_KEY = 'transform';

type ThirdContextValue = {
  displayMode: ThirdDisplayMode;
  objects: ThirdRuntimeState['objects'];
  selectionId: string | null;
  mode: ThirdEditorMode;
  showGrid: boolean;
  showAxes: boolean;
  snapEnabled: boolean;
  skyboxId: string;
  cameraState: ThirdCameraState;
  transformMode: ThirdTransformMode;
  canUndo: boolean;
  canRedo: boolean;
  openFullscreen: () => void;
  closeFullscreen: () => void;
  setMode: (mode: ThirdEditorMode) => void;
  toggleMode: () => void;
  setShowGrid: (enabled: boolean) => void;
  toggleShowGrid: () => void;
  setShowAxes: (enabled: boolean) => void;
  toggleShowAxes: () => void;
  setObjectPhysicsEnabled: (id: string, enabled: boolean) => void;
  setObjectParent: (id: string, parentId: string | null) => void;
  setObjectLocked: (id: string, enabled: boolean) => void;
  setObjectName: (id: string, name: string) => void;
  setObjectMaterialPreset: (id: string, preset: ThirdMaterialPreset) => void;
  setObjectMaterialColor: (id: string, color: string) => void;
  setObjectMaterialWireframe: (id: string, enabled: boolean) => void;
  setTransformMode: (mode: ThirdTransformMode) => void;
  setSnapEnabled: (enabled: boolean) => void;
  toggleSnap: () => void;
  selectObject: (id: string | null) => void;
  addPrimitive: (type: ThirdPrimitiveType) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  updateObjectTransform: (patch: ThirdTransformPatch) => void;
  applyObjectTransforms: (patches: ThirdTransformPatch[]) => void;
  setObjectAnimationPreset: (id: string, preset: ThirdAnimationPreset) => void;
  setCameraState: (cameraState: ThirdCameraState) => void;
  setSkyboxId: (skyboxId: string) => void;
  undo: () => void;
  redo: () => void;
  resetScene: () => void;
  resetToSaved: () => void;
  forceSave: () => void;
};

const ThirdContext = createContext<ThirdContextValue | null>(null);

export const ThirdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [displayMode, setDisplayMode] = useState<ThirdDisplayMode>('panel');
  const [store, setStore] = useState(() => createThirdHistoryStore(
    hydrateStateFromPersistence(readPersistedThirdScene())
  ));
  const state = store.present;
  const sceneRef = useRef(state);
  const lastPersistedRef = useRef(serializeStateForPersistence(store.present));
  const autosaveTimerRef = useRef<number | null>(null);

  const persistState = useCallback((nextState: ThirdRuntimeState) => {
    const payload = serializeStateForPersistence(nextState);
    writePersistedThirdScene(payload);
    lastPersistedRef.current = payload;
  }, []);

  useEffect(() => {
    sceneRef.current = state;
  }, [state]);

  useEffect(() => {
    if (autosaveTimerRef.current != null) {
      window.clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      persistState(sceneRef.current);
      autosaveTimerRef.current = null;
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current != null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [persistState, state]);

  useEffect(() => {
    const flushOnExit = () => {
      persistState(sceneRef.current);
    };
    window.addEventListener('beforeunload', flushOnExit);
    return () => {
      window.removeEventListener('beforeunload', flushOnExit);
      flushOnExit();
    };
  }, [persistState]);

  const openFullscreen = useCallback(() => setDisplayMode('fullscreen'), []);
  const closeFullscreen = useCallback(() => setDisplayMode('panel'), []);
  const mutateStore = useCallback((args: {
    mutate: (state: ThirdRuntimeState) => ThirdRuntimeState;
    track?: boolean;
    coalesceKey?: string;
    coalesceWindowMs?: number;
  }) => {
    setStore((prev) => applyThirdHistoryMutation(prev, {
      mutate: args.mutate,
      track: args.track,
      coalesceKey: args.coalesceKey,
      coalesceWindowMs: args.coalesceWindowMs,
      nowMs: args.coalesceKey ? Date.now() : undefined,
    }));
  }, []);

  const setMode = useCallback((mode: ThirdEditorMode) => {
    mutateStore({
      mutate: (prev) => setEditorMode(prev, mode),
      track: false,
    });
  }, [mutateStore]);
  const toggleMode = useCallback(() => {
    mutateStore({
      mutate: (prev) => toggleEditorMode(prev),
      track: false,
    });
  }, [mutateStore]);
  const setShowGridAction = useCallback((enabled: boolean) => {
    mutateStore({
      mutate: (prev) => setShowGrid(prev, enabled),
      track: false,
    });
  }, [mutateStore]);
  const toggleShowGridAction = useCallback(() => {
    mutateStore({
      mutate: (prev) => toggleShowGrid(prev),
      track: false,
    });
  }, [mutateStore]);
  const setShowAxesAction = useCallback((enabled: boolean) => {
    mutateStore({
      mutate: (prev) => setShowAxes(prev, enabled),
      track: false,
    });
  }, [mutateStore]);
  const toggleShowAxesAction = useCallback(() => {
    mutateStore({
      mutate: (prev) => toggleShowAxes(prev),
      track: false,
    });
  }, [mutateStore]);
  const setObjectPhysicsEnabledAction = useCallback((id: string, enabled: boolean) => {
    mutateStore({
      mutate: (prev) => setObjectPhysicsEnabled(prev, id, enabled),
      track: true,
    });
  }, [mutateStore]);
  const setObjectParentAction = useCallback((id: string, parentId: string | null) => {
    mutateStore({
      mutate: (prev) => setObjectParent(prev, id, parentId),
      track: true,
    });
  }, [mutateStore]);
  const setObjectLockedAction = useCallback((id: string, enabled: boolean) => {
    mutateStore({
      mutate: (prev) => setObjectLocked(prev, id, enabled),
      track: true,
    });
  }, [mutateStore]);
  const setObjectNameAction = useCallback((id: string, name: string) => {
    mutateStore({
      mutate: (prev) => setObjectName(prev, id, name),
      track: true,
    });
  }, [mutateStore]);
  const setObjectMaterialPresetAction = useCallback((id: string, preset: ThirdMaterialPreset) => {
    mutateStore({
      mutate: (prev) => setObjectMaterialPreset(prev, id, preset),
      track: true,
    });
  }, [mutateStore]);
  const setObjectMaterialColorAction = useCallback((id: string, color: string) => {
    mutateStore({
      mutate: (prev) => setObjectMaterialColor(prev, id, color),
      track: true,
    });
  }, [mutateStore]);
  const setObjectMaterialWireframeAction = useCallback((id: string, enabled: boolean) => {
    mutateStore({
      mutate: (prev) => setObjectMaterialWireframe(prev, id, enabled),
      track: true,
    });
  }, [mutateStore]);
  const setTransformModeAction = useCallback((mode: ThirdTransformMode) => {
    mutateStore({
      mutate: (prev) => setTransformMode(prev, mode),
      track: false,
    });
  }, [mutateStore]);
  const setSnapEnabledAction = useCallback((enabled: boolean) => {
    mutateStore({
      mutate: (prev) => setSnapEnabled(prev, enabled),
      track: false,
    });
  }, [mutateStore]);
  const toggleSnapAction = useCallback(() => {
    mutateStore({
      mutate: (prev) => toggleSnap(prev),
      track: false,
    });
  }, [mutateStore]);
  const selectObject = useCallback((id: string | null) => {
    mutateStore({
      mutate: (prev) => setSelection(prev, id),
      track: false,
    });
  }, [mutateStore]);
  const addPrimitiveAction = useCallback((type: ThirdPrimitiveType) => {
    mutateStore({
      mutate: (prev) => addPrimitive(prev, type),
      track: true,
    });
  }, [mutateStore]);
  const deleteSelectedAction = useCallback(() => {
    mutateStore({
      mutate: (prev) => deleteSelected(prev),
      track: true,
    });
  }, [mutateStore]);
  const duplicateSelectedAction = useCallback(() => {
    mutateStore({
      mutate: (prev) => duplicateSelected(prev),
      track: true,
    });
  }, [mutateStore]);
  const updateObjectTransformAction = useCallback((patch: ThirdTransformPatch) => {
    mutateStore({
      mutate: (prev) => updateObjectTransform(prev, patch),
      track: true,
      coalesceKey: TRANSFORM_HISTORY_KEY,
      coalesceWindowMs: THIRD_TRANSFORM_COALESCE_MS,
    });
  }, [mutateStore]);
  const applyObjectTransformsAction = useCallback((patches: ThirdTransformPatch[]) => {
    mutateStore({
      mutate: (prev) => applyObjectTransforms(prev, patches),
      track: false,
    });
  }, [mutateStore]);
  const setObjectAnimationPreset = useCallback((id: string, preset: ThirdAnimationPreset) => {
    mutateStore({
      mutate: (prev) => setAnimationPreset(prev, id, preset),
      track: true,
    });
  }, [mutateStore]);
  const setCameraStateAction = useCallback((cameraState: ThirdCameraState) => {
    mutateStore({
      mutate: (prev) => setCameraState(prev, cameraState),
      track: false,
    });
  }, [mutateStore]);
  const setSkyboxIdAction = useCallback((skyboxId: string) => {
    mutateStore({
      mutate: (prev) => setSkyboxId(prev, skyboxId),
      track: true,
    });
  }, [mutateStore]);

  const undo = useCallback(() => {
    setStore((prev) => undoThirdHistory(prev));
  }, []);

  const redo = useCallback(() => {
    setStore((prev) => redoThirdHistory(prev));
  }, []);

  const resetScene = useCallback(() => {
    clearPersistedThirdScene();
    const next = createDefaultThirdRuntimeState();
    lastPersistedRef.current = serializeStateForPersistence(next);
    setStore((prev) => replaceThirdHistoryState(prev, {
      next,
      clearHistory: true,
    }));
  }, []);

  const resetToSaved = useCallback(() => {
    const next = hydrateStateFromPersistence(lastPersistedRef.current);
    setStore((prev) => replaceThirdHistoryState(prev, {
      next,
      clearHistory: true,
    }));
  }, []);

  const forceSave = useCallback(() => {
    persistState(sceneRef.current);
  }, [persistState]);

  useEffect(() => {
    const onResetScene = () => resetScene();
    const onSetMode = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: unknown }>).detail;
      const mode = detail?.mode;
      if (mode === 'play' || mode === 'edit') {
        setMode(mode);
      }
    };
    const onToggleMode = () => toggleMode();

    window.addEventListener('terminalos:third:reset-scene', onResetScene as EventListener);
    window.addEventListener('terminalos:third:set-mode', onSetMode as EventListener);
    window.addEventListener('terminalos:third:toggle-mode', onToggleMode as EventListener);

    return () => {
      window.removeEventListener('terminalos:third:reset-scene', onResetScene as EventListener);
      window.removeEventListener('terminalos:third:set-mode', onSetMode as EventListener);
      window.removeEventListener('terminalos:third:toggle-mode', onToggleMode as EventListener);
    };
  }, [resetScene, setMode, toggleMode]);

  const value = useMemo<ThirdContextValue>(() => ({
    displayMode,
    objects: state.objects,
    selectionId: state.selectionId,
    mode: state.mode,
    showGrid: state.showGrid,
    showAxes: state.showAxes,
    snapEnabled: state.snapEnabled,
    skyboxId: state.skyboxId,
    cameraState: state.cameraState,
    transformMode: state.transformMode,
    canUndo: store.undoStack.length > 0,
    canRedo: store.redoStack.length > 0,
    openFullscreen,
    closeFullscreen,
    setMode,
    toggleMode,
    setShowGrid: setShowGridAction,
    toggleShowGrid: toggleShowGridAction,
    setShowAxes: setShowAxesAction,
    toggleShowAxes: toggleShowAxesAction,
    setObjectPhysicsEnabled: setObjectPhysicsEnabledAction,
    setObjectParent: setObjectParentAction,
    setObjectLocked: setObjectLockedAction,
    setObjectName: setObjectNameAction,
    setObjectMaterialPreset: setObjectMaterialPresetAction,
    setObjectMaterialColor: setObjectMaterialColorAction,
    setObjectMaterialWireframe: setObjectMaterialWireframeAction,
    setTransformMode: setTransformModeAction,
    setSnapEnabled: setSnapEnabledAction,
    toggleSnap: toggleSnapAction,
    selectObject,
    addPrimitive: addPrimitiveAction,
    deleteSelected: deleteSelectedAction,
    duplicateSelected: duplicateSelectedAction,
    updateObjectTransform: updateObjectTransformAction,
    applyObjectTransforms: applyObjectTransformsAction,
    setObjectAnimationPreset,
    setCameraState: setCameraStateAction,
    setSkyboxId: setSkyboxIdAction,
    undo,
    redo,
    resetScene,
    resetToSaved,
    forceSave,
  }), [
    addPrimitiveAction,
    applyObjectTransformsAction,
    closeFullscreen,
    deleteSelectedAction,
    displayMode,
    duplicateSelectedAction,
    forceSave,
    openFullscreen,
    resetScene,
    resetToSaved,
    redo,
    selectObject,
    setCameraStateAction,
    setMode,
    setObjectMaterialColorAction,
    setObjectMaterialPresetAction,
    setObjectParentAction,
    setObjectLockedAction,
    setObjectNameAction,
    setObjectMaterialWireframeAction,
    setObjectPhysicsEnabledAction,
    setShowAxesAction,
    setShowGridAction,
    setObjectAnimationPreset,
    setSkyboxIdAction,
    setSnapEnabledAction,
    setTransformModeAction,
    state.cameraState,
    state.mode,
    state.objects,
    state.showAxes,
    state.showGrid,
    state.selectionId,
    state.skyboxId,
    state.snapEnabled,
    state.transformMode,
    store.redoStack.length,
    store.undoStack.length,
    toggleMode,
    toggleShowAxesAction,
    toggleShowGridAction,
    toggleSnapAction,
    undo,
    updateObjectTransformAction,
  ]);

  return <ThirdContext.Provider value={value}>{children}</ThirdContext.Provider>;
};

export const useThirdRuntime = (): ThirdContextValue => {
  const ctx = useContext(ThirdContext);
  if (!ctx) throw new Error('useThirdRuntime must be used within <ThirdProvider>.');
  return ctx;
};
