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
  ThirdTransformMode,
  ThirdTransformPatch,
} from './types';

const AUTOSAVE_DELAY_MS = 300;

type ThirdContextValue = {
  displayMode: ThirdDisplayMode;
  objects: ReturnType<typeof createDefaultThirdRuntimeState>['objects'];
  selectionId: string | null;
  mode: ThirdEditorMode;
  showGrid: boolean;
  showAxes: boolean;
  snapEnabled: boolean;
  skyboxId: string;
  cameraState: ThirdCameraState;
  transformMode: ThirdTransformMode;
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
  resetScene: () => void;
  resetToSaved: () => void;
  forceSave: () => void;
};

const ThirdContext = createContext<ThirdContextValue | null>(null);

export const ThirdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [displayMode, setDisplayMode] = useState<ThirdDisplayMode>('panel');
  const [state, setState] = useState(() => hydrateStateFromPersistence(readPersistedThirdScene()));
  const sceneRef = useRef(state);
  const lastPersistedRef = useRef(serializeStateForPersistence(state));
  const autosaveTimerRef = useRef<number | null>(null);

  const persistState = useCallback((nextState: typeof state) => {
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
  const setMode = useCallback((mode: ThirdEditorMode) => {
    setState((prev) => setEditorMode(prev, mode));
  }, []);
  const toggleMode = useCallback(() => {
    setState((prev) => toggleEditorMode(prev));
  }, []);
  const setShowGridAction = useCallback((enabled: boolean) => {
    setState((prev) => setShowGrid(prev, enabled));
  }, []);
  const toggleShowGridAction = useCallback(() => {
    setState((prev) => toggleShowGrid(prev));
  }, []);
  const setShowAxesAction = useCallback((enabled: boolean) => {
    setState((prev) => setShowAxes(prev, enabled));
  }, []);
  const toggleShowAxesAction = useCallback(() => {
    setState((prev) => toggleShowAxes(prev));
  }, []);
  const setObjectPhysicsEnabledAction = useCallback((id: string, enabled: boolean) => {
    setState((prev) => setObjectPhysicsEnabled(prev, id, enabled));
  }, []);
  const setObjectParentAction = useCallback((id: string, parentId: string | null) => {
    setState((prev) => setObjectParent(prev, id, parentId));
  }, []);
  const setObjectNameAction = useCallback((id: string, name: string) => {
    setState((prev) => setObjectName(prev, id, name));
  }, []);
  const setObjectMaterialPresetAction = useCallback((id: string, preset: ThirdMaterialPreset) => {
    setState((prev) => setObjectMaterialPreset(prev, id, preset));
  }, []);
  const setObjectMaterialColorAction = useCallback((id: string, color: string) => {
    setState((prev) => setObjectMaterialColor(prev, id, color));
  }, []);
  const setObjectMaterialWireframeAction = useCallback((id: string, enabled: boolean) => {
    setState((prev) => setObjectMaterialWireframe(prev, id, enabled));
  }, []);
  const setTransformModeAction = useCallback((mode: ThirdTransformMode) => {
    setState((prev) => setTransformMode(prev, mode));
  }, []);
  const setSnapEnabledAction = useCallback((enabled: boolean) => {
    setState((prev) => setSnapEnabled(prev, enabled));
  }, []);
  const toggleSnapAction = useCallback(() => {
    setState((prev) => toggleSnap(prev));
  }, []);
  const selectObject = useCallback((id: string | null) => {
    setState((prev) => setSelection(prev, id));
  }, []);
  const addPrimitiveAction = useCallback((type: ThirdPrimitiveType) => {
    setState((prev) => addPrimitive(prev, type));
  }, []);
  const deleteSelectedAction = useCallback(() => {
    setState((prev) => deleteSelected(prev));
  }, []);
  const duplicateSelectedAction = useCallback(() => {
    setState((prev) => duplicateSelected(prev));
  }, []);
  const updateObjectTransformAction = useCallback((patch: ThirdTransformPatch) => {
    setState((prev) => updateObjectTransform(prev, patch));
  }, []);
  const applyObjectTransformsAction = useCallback((patches: ThirdTransformPatch[]) => {
    setState((prev) => applyObjectTransforms(prev, patches));
  }, []);
  const setObjectAnimationPreset = useCallback((id: string, preset: ThirdAnimationPreset) => {
    setState((prev) => setAnimationPreset(prev, id, preset));
  }, []);
  const setCameraStateAction = useCallback((cameraState: ThirdCameraState) => {
    setState((prev) => setCameraState(prev, cameraState));
  }, []);
  const setSkyboxIdAction = useCallback((skyboxId: string) => {
    setState((prev) => setSkyboxId(prev, skyboxId));
  }, []);

  const resetScene = useCallback(() => {
    clearPersistedThirdScene();
    const next = createDefaultThirdRuntimeState();
    lastPersistedRef.current = serializeStateForPersistence(next);
    setState(next);
  }, []);

  const resetToSaved = useCallback(() => {
    setState(hydrateStateFromPersistence(lastPersistedRef.current));
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
    selectObject,
    setCameraStateAction,
    setMode,
    setObjectMaterialColorAction,
    setObjectMaterialPresetAction,
    setObjectParentAction,
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
    toggleMode,
    toggleShowAxesAction,
    toggleShowGridAction,
    toggleSnapAction,
    updateObjectTransformAction,
  ]);

  return <ThirdContext.Provider value={value}>{children}</ThirdContext.Provider>;
};

export const useThirdRuntime = (): ThirdContextValue => {
  const ctx = useContext(ThirdContext);
  if (!ctx) throw new Error('useThirdRuntime must be used within <ThirdProvider>.');
  return ctx;
};
