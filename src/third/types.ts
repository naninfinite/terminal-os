export type ThirdDisplayMode = 'panel' | 'fullscreen';
export type ThirdEditorMode = 'play' | 'edit';
export type ThirdTransformMode = 'translate' | 'rotate' | 'scale';
export type ThirdPrimitiveType = 'cube' | 'sphere' | 'cylinder' | 'plane';
export type ThirdAnimationPreset = 'none' | 'bounce' | 'rotate' | 'pulse';
export type ThirdMaterialPreset = 'matte' | 'gloss' | 'glass' | 'neon';

export type ThirdVec3 = {
  x: number;
  y: number;
  z: number;
};

export type ThirdCameraState = {
  position: ThirdVec3;
  target: ThirdVec3;
};

export type ThirdMaterialParams = {
  color: string;
  wireframe: boolean;
  preset: ThirdMaterialPreset;
};

export type ThirdObjectTransform = {
  position: ThirdVec3;
  rotation: ThirdVec3;
  scale: ThirdVec3;
};

export type ThirdSceneObject = {
  id: string;
  name: string;
  type: ThirdPrimitiveType;
  transform: ThirdObjectTransform;
  material: ThirdMaterialParams;
  physicsEnabled: boolean;
  animationPreset: ThirdAnimationPreset;
};

export type ThirdRuntimeState = {
  objects: ThirdSceneObject[];
  selectionId: string | null;
  mode: ThirdEditorMode;
  physicsEnabled: boolean;
  snapEnabled: boolean;
  skyboxId: string;
  cameraState: ThirdCameraState;
  transformMode: ThirdTransformMode;
};

export type ThirdPersistedSceneV1 = {
  version: 1;
  objects: ThirdSceneObject[];
  physicsEnabled: boolean;
  skyboxId: string;
  cameraState?: ThirdCameraState;
};

export type ThirdTransformPatch = {
  id: string;
  position?: ThirdVec3;
  rotation?: ThirdVec3;
  scale?: ThirdVec3;
};
