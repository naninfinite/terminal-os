import { getItemSafe, setItemSafe } from '../utils/storage';
import {
  THIRD_DEFAULT_COLOR,
  THIRD_DEFAULT_CAMERA_STATE,
  THIRD_DEFAULT_MATERIAL_PRESET,
  THIRD_DEFAULT_SKYBOX_ID,
  THIRD_MAX_OBJECTS,
  THIRD_STORAGE_VERSION,
} from './state';
import type { ThirdPersistedSceneV1, ThirdPrimitiveType, ThirdSceneObject, ThirdVec3 } from './types';

export const THIRD_SCENE_STORAGE_KEY = 'terminalOS.third.v1.scene';

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const sanitizeVec3 = (value: unknown, fallback: ThirdVec3): ThirdVec3 => {
  if (!value || typeof value !== 'object') return { ...fallback };
  const data = value as Record<string, unknown>;
  return {
    x: isFiniteNumber(data.x) ? data.x : fallback.x,
    y: isFiniteNumber(data.y) ? data.y : fallback.y,
    z: isFiniteNumber(data.z) ? data.z : fallback.z,
  };
};

const sanitizePrimitiveType = (value: unknown): ThirdPrimitiveType | null => {
  if (value === 'cube' || value === 'sphere' || value === 'cylinder' || value === 'plane') {
    return value;
  }
  return null;
};

const sanitizeMaterialPreset = (value: unknown): ThirdSceneObject['material']['preset'] => (
  value === 'matte' || value === 'gloss' || value === 'glass' || value === 'neon'
    ? value
    : THIRD_DEFAULT_MATERIAL_PRESET
);

const sanitizeMaterialColor = (value: unknown): string => (
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim())
    ? value.trim().toLowerCase()
    : THIRD_DEFAULT_COLOR
);

const sanitizeParentId = (value: unknown): string | null => (
  typeof value === 'string' && value.trim() ? value.trim() : null
);

const sanitizeSceneObject = (raw: unknown): ThirdSceneObject | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const id = typeof data.id === 'string' ? data.id.trim() : '';
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const type = sanitizePrimitiveType(data.type);
  if (!id || !name || !type) return null;

  const transformRaw = data.transform;
  if (!transformRaw || typeof transformRaw !== 'object') return null;
  const transformData = transformRaw as Record<string, unknown>;

  const materialRaw = data.material;
  const materialData = materialRaw && typeof materialRaw === 'object'
    ? materialRaw as Record<string, unknown>
    : {};

  const preset = data.animationPreset;
  const animationPreset = (
    preset === 'none'
    || preset === 'bounce'
    || preset === 'rotate'
    || preset === 'pulse'
  ) ? preset : 'none';

  return {
    id,
    name,
    type,
    parentId: sanitizeParentId(data.parentId),
    transform: {
      position: sanitizeVec3(transformData.position, { x: 0, y: 0.5, z: 0 }),
      rotation: sanitizeVec3(transformData.rotation, { x: 0, y: 0, z: 0 }),
      scale: sanitizeVec3(transformData.scale, { x: 1, y: 1, z: 1 }),
    },
    material: {
      color: sanitizeMaterialColor(materialData.color),
      wireframe: materialData.wireframe === true,
      preset: sanitizeMaterialPreset(materialData.preset),
    },
    physicsEnabled: data.physicsEnabled === true,
    locked: data.locked === true,
    animationPreset,
  };
};

const sanitizeCameraState = (raw: unknown): ThirdPersistedSceneV1['cameraState'] => {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  return {
    position: sanitizeVec3(data.position, { x: 4.5, y: 4.2, z: 6.8 }),
    target: sanitizeVec3(data.target, { x: 0, y: 0.5, z: 0 }),
    projectionMode: data.projectionMode === 'orthographic'
      ? 'orthographic'
      : THIRD_DEFAULT_CAMERA_STATE.projectionMode,
  };
};

export const sanitizePersistedThirdScene = (raw: unknown): ThirdPersistedSceneV1 | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (data.version !== THIRD_STORAGE_VERSION) return null;
  if (!Array.isArray(data.objects)) return null;

  const objects = data.objects
    .map(sanitizeSceneObject)
    .filter((item): item is ThirdSceneObject => item != null)
    .slice(0, THIRD_MAX_OBJECTS);
  if (objects.length === 0) return null;

  const skyboxId = typeof data.skyboxId === 'string' && data.skyboxId.trim()
    ? data.skyboxId
    : THIRD_DEFAULT_SKYBOX_ID;

  return {
    version: THIRD_STORAGE_VERSION,
    objects,
    showGrid: data.showGrid === true,
    showAxes: data.showAxes === true,
    skyboxId,
    cameraState: sanitizeCameraState(data.cameraState),
  };
};

export const readPersistedThirdScene = (): ThirdPersistedSceneV1 | null => (
  sanitizePersistedThirdScene(getItemSafe<unknown>(THIRD_SCENE_STORAGE_KEY, null))
);

export const writePersistedThirdScene = (scene: ThirdPersistedSceneV1): boolean => (
  setItemSafe(THIRD_SCENE_STORAGE_KEY, scene)
);

export const clearPersistedThirdScene = (): void => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(THIRD_SCENE_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
};
