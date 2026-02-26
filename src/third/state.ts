import type {
  ThirdAnimationPreset,
  ThirdCameraState,
  ThirdEditorMode,
  ThirdMaterialPreset,
  ThirdProjectionMode,
  ThirdPersistedSceneV1,
  ThirdPrimitiveType,
  ThirdRuntimeState,
  ThirdSceneObject,
  ThirdTransformMode,
  ThirdTransformPatch,
  ThirdVec3,
} from './types';

export const THIRD_STORAGE_VERSION = 1 as const;
export const THIRD_DEFAULT_SKYBOX_ID = 'default';
export const THIRD_DEFAULT_COLOR = '#00ff66';
export const THIRD_DEFAULT_MATERIAL_PRESET: ThirdMaterialPreset = 'matte';
export const THIRD_MAX_OBJECTS = 120;
export const THIRD_MAX_OBJECT_NAME_LENGTH = 48;

export const THIRD_DEFAULT_CAMERA_STATE: ThirdCameraState = {
  position: { x: 4.5, y: 4.2, z: 6.8 },
  target: { x: 0, y: 0.5, z: 0 },
  projectionMode: 'perspective',
};

const DUPLICATE_OFFSET = 0.6;

let idCounter = 0;

const uid = (): string => {
  idCounter += 1;
  return `third_${Date.now().toString(36)}_${idCounter.toString(36)}`;
};

const cloneVec3 = (value: ThirdVec3): ThirdVec3 => ({ x: value.x, y: value.y, z: value.z });

const isValidMaterialPreset = (value: unknown): value is ThirdMaterialPreset => (
  value === 'matte'
  || value === 'gloss'
  || value === 'glass'
  || value === 'neon'
);

const normalizeMaterialPreset = (value: unknown): ThirdMaterialPreset => (
  isValidMaterialPreset(value) ? value : THIRD_DEFAULT_MATERIAL_PRESET
);

const normalizeMaterialColor = (value: unknown): string => {
  if (typeof value !== 'string') return THIRD_DEFAULT_COLOR;
  const normalized = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : THIRD_DEFAULT_COLOR;
};

const normalizeProjectionMode = (value: unknown): ThirdProjectionMode => (
  value === 'orthographic' ? 'orthographic' : 'perspective'
);

const normalizeObjectName = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const compact = value.trim().replace(/\s+/g, ' ');
  if (!compact) return fallback;
  return compact.slice(0, THIRD_MAX_OBJECT_NAME_LENGTH);
};

const normalizeParentId = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

const wouldCreateParentCycle = (
  objects: ThirdSceneObject[],
  id: string,
  parentId: string
): boolean => {
  const objectById = new Map(objects.map((object) => [object.id, object]));
  let currentId: string | null = parentId;
  const visited = new Set<string>();

  while (currentId) {
    if (currentId === id) return true;
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = objectById.get(currentId)?.parentId ?? null;
  }

  return false;
};

const normalizeObjectHierarchy = (objects: ThirdSceneObject[]): ThirdSceneObject[] => {
  const validIds = new Set(objects.map((object) => object.id));
  const normalized = objects.map((object) => ({
    ...object,
    parentId: (
      object.parentId
      && validIds.has(object.parentId)
      && object.parentId !== object.id
    ) ? object.parentId : null,
  }));

  normalized.forEach((object) => {
    if (!object.parentId) return;
    if (wouldCreateParentCycle(normalized, object.id, object.parentId)) {
      object.parentId = null;
    }
  });

  return normalized;
};

const cloneObject = (value: ThirdSceneObject): ThirdSceneObject => ({
  ...value,
  name: normalizeObjectName(value.name, primitiveLabel(value.type)),
  parentId: normalizeParentId(value.parentId),
  transform: {
    position: cloneVec3(value.transform.position),
    rotation: cloneVec3(value.transform.rotation),
    scale: cloneVec3(value.transform.scale),
  },
  material: {
    color: normalizeMaterialColor(value.material.color),
    wireframe: Boolean(value.material.wireframe),
    preset: normalizeMaterialPreset(value.material.preset),
  },
  physicsEnabled: Boolean(value.physicsEnabled),
});

const primitiveLabel = (type: ThirdPrimitiveType): string => {
  switch (type) {
    case 'cube':
      return 'Cube';
    case 'sphere':
      return 'Sphere';
    case 'cylinder':
      return 'Cylinder';
    case 'plane':
      return 'Plane';
    default:
      return 'Object';
  }
};

const nextPrimitiveName = (objects: ThirdSceneObject[], type: ThirdPrimitiveType): string => {
  const label = primitiveLabel(type);
  const count = objects.reduce((total, object) => (
    object.type === type ? total + 1 : total
  ), 0);
  return `${label} ${count + 1}`;
};

const primitiveDefaultTransform = (type: ThirdPrimitiveType): ThirdSceneObject['transform'] => {
  switch (type) {
    case 'sphere':
      return {
        position: { x: 0, y: 0.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      };
    case 'cylinder':
      return {
        position: { x: 0, y: 0.6, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1.2, z: 1 },
      };
    case 'plane':
      return {
        position: { x: 0, y: 0.01, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 },
        scale: { x: 1.8, y: 1, z: 1.8 },
      };
    case 'cube':
    default:
      return {
        position: { x: 0, y: 0.5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
      };
  }
};

export const createSceneObject = (args: {
  type: ThirdPrimitiveType;
  objects: ThirdSceneObject[];
  transform?: ThirdSceneObject['transform'];
  animationPreset?: ThirdAnimationPreset;
}): ThirdSceneObject => {
  const transform = args.transform ?? primitiveDefaultTransform(args.type);
  return {
    id: uid(),
    name: nextPrimitiveName(args.objects, args.type),
    type: args.type,
    parentId: null,
    transform: {
      position: cloneVec3(transform.position),
      rotation: cloneVec3(transform.rotation),
      scale: cloneVec3(transform.scale),
    },
    material: {
      color: THIRD_DEFAULT_COLOR,
      wireframe: false,
      preset: THIRD_DEFAULT_MATERIAL_PRESET,
    },
    physicsEnabled: false,
    animationPreset: args.animationPreset ?? 'none',
  };
};

export const createDefaultThirdRuntimeState = (): ThirdRuntimeState => {
  const cube = createSceneObject({ type: 'cube', objects: [] });
  return {
    objects: [cube],
    selectionId: cube.id,
    mode: 'play',
    showGrid: false,
    showAxes: false,
    snapEnabled: false,
    skyboxId: THIRD_DEFAULT_SKYBOX_ID,
    cameraState: {
      position: cloneVec3(THIRD_DEFAULT_CAMERA_STATE.position),
      target: cloneVec3(THIRD_DEFAULT_CAMERA_STATE.target),
      projectionMode: normalizeProjectionMode(THIRD_DEFAULT_CAMERA_STATE.projectionMode),
    },
    transformMode: 'translate',
  };
};

export const cloneRuntimeState = (state: ThirdRuntimeState): ThirdRuntimeState => ({
  objects: state.objects.map(cloneObject),
  selectionId: state.selectionId,
  mode: state.mode,
  showGrid: state.showGrid === true,
  showAxes: state.showAxes === true,
  snapEnabled: state.snapEnabled === true,
  skyboxId: state.skyboxId || THIRD_DEFAULT_SKYBOX_ID,
  cameraState: {
    position: cloneVec3(state.cameraState.position),
    target: cloneVec3(state.cameraState.target),
    projectionMode: normalizeProjectionMode(state.cameraState.projectionMode),
  },
  transformMode: state.transformMode,
});

export const setEditorMode = (state: ThirdRuntimeState, mode: ThirdEditorMode): ThirdRuntimeState => ({
  ...state,
  mode,
});

export const setShowGrid = (state: ThirdRuntimeState, enabled: boolean): ThirdRuntimeState => ({
  ...state,
  showGrid: enabled,
});

export const toggleShowGrid = (state: ThirdRuntimeState): ThirdRuntimeState => ({
  ...state,
  showGrid: !state.showGrid,
});

export const setShowAxes = (state: ThirdRuntimeState, enabled: boolean): ThirdRuntimeState => ({
  ...state,
  showAxes: enabled,
});

export const toggleShowAxes = (state: ThirdRuntimeState): ThirdRuntimeState => ({
  ...state,
  showAxes: !state.showAxes,
});

export const toggleEditorMode = (state: ThirdRuntimeState): ThirdRuntimeState => (
  state.mode === 'play'
    ? setEditorMode(state, 'edit')
    : setEditorMode(state, 'play')
);

export const setTransformMode = (state: ThirdRuntimeState, transformMode: ThirdTransformMode): ThirdRuntimeState => ({
  ...state,
  transformMode,
});

export const setSnapEnabled = (state: ThirdRuntimeState, enabled: boolean): ThirdRuntimeState => ({
  ...state,
  snapEnabled: enabled,
});

export const toggleSnap = (state: ThirdRuntimeState): ThirdRuntimeState => ({
  ...state,
  snapEnabled: !state.snapEnabled,
});

export const setSelection = (state: ThirdRuntimeState, selectionId: string | null): ThirdRuntimeState => ({
  ...state,
  selectionId,
});

export const setObjectPhysicsEnabled = (
  state: ThirdRuntimeState,
  id: string,
  enabled: boolean
): ThirdRuntimeState => ({
  ...state,
  objects: state.objects.map((object) => (
    object.id === id ? { ...object, physicsEnabled: enabled } : object
  )),
});

export const setObjectParent = (
  state: ThirdRuntimeState,
  id: string,
  parentId: string | null
): ThirdRuntimeState => {
  const objectById = new Map(state.objects.map((object) => [object.id, object]));
  const current = objectById.get(id);
  if (!current) return state;

  const nextParentId = normalizeParentId(parentId);
  if (nextParentId === id) return state;
  if (nextParentId && !objectById.has(nextParentId)) return state;
  if (nextParentId && wouldCreateParentCycle(state.objects, id, nextParentId)) return state;
  if (current.parentId === nextParentId) return state;

  return {
    ...state,
    objects: state.objects.map((object) => (
      object.id === id
        ? {
          ...object,
          parentId: nextParentId,
        }
        : object
    )),
  };
};

export const setObjectName = (
  state: ThirdRuntimeState,
  id: string,
  name: string
): ThirdRuntimeState => {
  let changed = false;
  const nextObjects = state.objects.map((object) => {
    if (object.id !== id) return object;
    const nextName = normalizeObjectName(name, object.name);
    if (nextName === object.name) return object;
    changed = true;
    return {
      ...object,
      name: nextName,
    };
  });

  if (!changed) return state;
  return {
    ...state,
    objects: nextObjects,
  };
};

export const setObjectMaterialPreset = (
  state: ThirdRuntimeState,
  id: string,
  preset: ThirdMaterialPreset
): ThirdRuntimeState => ({
  ...state,
  objects: state.objects.map((object) => (
    object.id === id
      ? {
        ...object,
        material: {
          ...object.material,
          preset: normalizeMaterialPreset(preset),
        },
      }
      : object
  )),
});

export const setObjectMaterialColor = (
  state: ThirdRuntimeState,
  id: string,
  color: string
): ThirdRuntimeState => ({
  ...state,
  objects: state.objects.map((object) => (
    object.id === id
      ? {
        ...object,
        material: {
          ...object.material,
          color: normalizeMaterialColor(color),
        },
      }
      : object
  )),
});

export const setObjectMaterialWireframe = (
  state: ThirdRuntimeState,
  id: string,
  enabled: boolean
): ThirdRuntimeState => ({
  ...state,
  objects: state.objects.map((object) => (
    object.id === id
      ? {
        ...object,
        material: {
          ...object.material,
          wireframe: enabled,
        },
      }
      : object
  )),
});

export const setSkyboxId = (state: ThirdRuntimeState, skyboxId: string): ThirdRuntimeState => ({
  ...state,
  skyboxId: skyboxId.trim() || THIRD_DEFAULT_SKYBOX_ID,
});

export const setCameraState = (state: ThirdRuntimeState, cameraState: ThirdCameraState): ThirdRuntimeState => ({
  ...state,
  cameraState: {
    position: cloneVec3(cameraState.position),
    target: cloneVec3(cameraState.target),
    projectionMode: normalizeProjectionMode(cameraState.projectionMode),
  },
});

export const addPrimitive = (
  state: ThirdRuntimeState,
  type: ThirdPrimitiveType
): ThirdRuntimeState => {
  if (state.objects.length >= THIRD_MAX_OBJECTS) return state;
  const nextObject = createSceneObject({ type, objects: state.objects });
  return {
    ...state,
    objects: [...state.objects, nextObject],
    selectionId: nextObject.id,
  };
};

export const deleteSelected = (state: ThirdRuntimeState): ThirdRuntimeState => {
  if (!state.selectionId) return state;
  const selected = state.objects.find((object) => object.id === state.selectionId);
  const selectedParentId = selected?.parentId ?? null;
  const nextObjects = state.objects
    .filter((object) => object.id !== state.selectionId)
    .map((object) => (
      object.parentId === state.selectionId
        ? {
          ...object,
          parentId: selectedParentId,
        }
        : object
    ));
  if (nextObjects.length === state.objects.length) return state;
  return {
    ...state,
    objects: nextObjects,
    selectionId: nextObjects[nextObjects.length - 1]?.id ?? null,
  };
};

export const duplicateSelected = (state: ThirdRuntimeState): ThirdRuntimeState => {
  if (!state.selectionId || state.objects.length >= THIRD_MAX_OBJECTS) return state;
  const selected = state.objects.find((object) => object.id === state.selectionId);
  if (!selected) return state;

  const duplicate = createSceneObject({
    type: selected.type,
    objects: state.objects,
    transform: {
      position: {
        x: selected.transform.position.x + DUPLICATE_OFFSET,
        y: selected.transform.position.y,
        z: selected.transform.position.z + DUPLICATE_OFFSET,
      },
      rotation: cloneVec3(selected.transform.rotation),
      scale: cloneVec3(selected.transform.scale),
    },
    animationPreset: selected.animationPreset,
  });
  duplicate.material = { ...selected.material };
  duplicate.parentId = selected.parentId;

  return {
    ...state,
    objects: [...state.objects, duplicate],
    selectionId: duplicate.id,
  };
};

const mergeTransform = (object: ThirdSceneObject, patch: ThirdTransformPatch): ThirdSceneObject => ({
  ...object,
  transform: {
    position: patch.position ? cloneVec3(patch.position) : cloneVec3(object.transform.position),
    rotation: patch.rotation ? cloneVec3(patch.rotation) : cloneVec3(object.transform.rotation),
    scale: patch.scale ? cloneVec3(patch.scale) : cloneVec3(object.transform.scale),
  },
});

export const updateObjectTransform = (
  state: ThirdRuntimeState,
  patch: ThirdTransformPatch
): ThirdRuntimeState => ({
  ...state,
  objects: state.objects.map((object) => (
    object.id === patch.id ? mergeTransform(object, patch) : object
  )),
});

export const applyObjectTransforms = (
  state: ThirdRuntimeState,
  patches: ThirdTransformPatch[]
): ThirdRuntimeState => {
  if (patches.length === 0) return state;
  const patchById = new Map<string, ThirdTransformPatch>();
  patches.forEach((patch) => {
    patchById.set(patch.id, patch);
  });

  return {
    ...state,
    objects: state.objects.map((object) => {
      const patch = patchById.get(object.id);
      return patch ? mergeTransform(object, patch) : object;
    }),
  };
};

export const setAnimationPreset = (
  state: ThirdRuntimeState,
  id: string,
  preset: ThirdAnimationPreset
): ThirdRuntimeState => ({
  ...state,
  objects: state.objects.map((object) => (
    object.id === id ? { ...object, animationPreset: preset } : object
  )),
});

export const serializeStateForPersistence = (
  state: ThirdRuntimeState
): ThirdPersistedSceneV1 => ({
  version: THIRD_STORAGE_VERSION,
  objects: state.objects.map(cloneObject),
  showGrid: state.showGrid === true,
  showAxes: state.showAxes === true,
  skyboxId: state.skyboxId,
  cameraState: {
    position: cloneVec3(state.cameraState.position),
    target: cloneVec3(state.cameraState.target),
    projectionMode: normalizeProjectionMode(state.cameraState.projectionMode),
  },
});

export const hydrateStateFromPersistence = (
  persisted: ThirdPersistedSceneV1 | null
): ThirdRuntimeState => {
  if (!persisted || persisted.objects.length === 0) return createDefaultThirdRuntimeState();
  const hydratedObjects = normalizeObjectHierarchy(
    persisted.objects.map(cloneObject).slice(0, THIRD_MAX_OBJECTS)
  );

  return {
    objects: hydratedObjects,
    selectionId: hydratedObjects[0]?.id ?? null,
    mode: 'play',
    showGrid: persisted.showGrid === true,
    showAxes: persisted.showAxes === true,
    snapEnabled: false,
    skyboxId: persisted.skyboxId || THIRD_DEFAULT_SKYBOX_ID,
    cameraState: persisted.cameraState
      ? {
        position: cloneVec3(persisted.cameraState.position),
        target: cloneVec3(persisted.cameraState.target),
        projectionMode: normalizeProjectionMode(persisted.cameraState.projectionMode),
      }
      : {
        position: cloneVec3(THIRD_DEFAULT_CAMERA_STATE.position),
        target: cloneVec3(THIRD_DEFAULT_CAMERA_STATE.target),
        projectionMode: normalizeProjectionMode(THIRD_DEFAULT_CAMERA_STATE.projectionMode),
      },
    transformMode: 'translate',
  };
};
