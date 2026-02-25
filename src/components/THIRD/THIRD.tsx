import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import styles from './THIRD.module.scss';
import {
  clampInspectorScale,
  degToRad,
  formatInspectorNumber,
  parseInspectorNumber,
  radToDeg,
} from './transformInspector';
import { useTheme } from '../../theme/ThemeProvider';
import { RUNTIME_THEME_PALETTE } from '../../theme/runtimePalette';
import type { ResolvedTheme } from '../../theme/types';
import { useThirdRuntime } from '../../third/ThirdProvider';
import type {
  ThirdAnimationPreset,
  ThirdMaterialPreset,
  ThirdPrimitiveType,
  ThirdSceneObject,
  ThirdTransformPatch,
  ThirdVec3,
} from '../../third/types';

const FIXED_TIMESTEP_SECONDS = 1 / 60;
const MAX_PHYSICS_SUBSTEPS = 3;
const PHYSICS_COMMIT_INTERVAL_SECONDS = 0.4;
const CAMERA_SAVE_DEBOUNCE_MS = 250;
const MATERIAL_PRESETS: ReadonlyArray<ThirdMaterialPreset> = ['matte', 'gloss', 'glass', 'neon'];
const MATERIAL_SWATCHES: ReadonlyArray<string> = [
  '#00ff66',
  '#0f8f63',
  '#66ffc2',
  '#4cd6ff',
  '#ffd166',
  '#ff7eb6',
];
const INSPECTOR_GROUPS = ['position', 'rotation', 'scale'] as const;
const INSPECTOR_AXES = ['x', 'y', 'z'] as const;

type InspectorGroup = typeof INSPECTOR_GROUPS[number];
type InspectorAxis = typeof INSPECTOR_AXES[number];
type InspectorFieldKey = `${InspectorGroup}.${InspectorAxis}`;
type InspectorDraft = Record<InspectorFieldKey, string>;

const toThreeHex = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeHexColor = (value: string, fallbackHex: number): string => {
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;
  return `#${fallbackHex.toString(16).padStart(6, '0')}`;
};

const applyMaterialParams = (
  material: THREE.MeshPhongMaterial,
  params: ThirdSceneObject['material'],
  fallbackHex: number
): void => {
  const colorHex = toThreeHex(normalizeHexColor(params.color, fallbackHex), fallbackHex);
  const color = new THREE.Color(colorHex);

  material.color.copy(color);
  material.wireframe = false;
  material.transparent = false;
  material.opacity = 1;
  material.depthWrite = true;
  material.emissive.setHex(0x000000);
  material.emissiveIntensity = 1;
  material.specular.setHex(0x101010);
  material.shininess = 12;

  switch (params.preset) {
    case 'gloss':
      material.specular.setHex(0x4d4d4d);
      material.shininess = 95;
      break;
    case 'glass':
      material.transparent = true;
      material.opacity = 0.38;
      material.depthWrite = false;
      material.specular.setHex(0xb8f5dd);
      material.shininess = 130;
      break;
    case 'neon':
      material.specular.setHex(0x333333);
      material.shininess = 80;
      material.emissive.copy(color.clone().multiplyScalar(0.45));
      material.emissiveIntensity = 0.95;
      break;
    case 'matte':
    default:
      material.specular.setHex(0x080808);
      material.shininess = 8;
      break;
  }

  material.needsUpdate = true;
};

const getThirdPalette = (theme: ResolvedTheme): { background: number; accent: number } => {
  const palette = RUNTIME_THEME_PALETTE[theme];
  return {
    background: toThreeHex(palette.background, 0x000000),
    accent: toThreeHex(palette.accent, 0x00ff66),
  };
};

const vec3FromThree = (value: THREE.Vector3): ThirdVec3 => ({
  x: value.x,
  y: value.y,
  z: value.z,
});

const vec3FromEuler = (value: THREE.Euler): ThirdVec3 => ({
  x: value.x,
  y: value.y,
  z: value.z,
});

const vec3ToCannon = (value: ThirdVec3): CANNON.Vec3 => (
  new CANNON.Vec3(value.x, value.y, value.z)
);

const createGeometry = (type: ThirdPrimitiveType): THREE.BufferGeometry => {
  switch (type) {
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 20, 16);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 16, 1);
    case 'plane':
      return new THREE.PlaneGeometry(1, 1, 1, 1);
    case 'cube':
    default:
      return new THREE.BoxGeometry(1, 1, 1);
  }
};

const createBodyShape = (object: ThirdSceneObject): CANNON.Shape => {
  const scale = object.transform.scale;
  switch (object.type) {
    case 'sphere': {
      const radius = Math.max(0.05, 0.5 * Math.max(scale.x, scale.y, scale.z));
      return new CANNON.Sphere(radius);
    }
    case 'cylinder': {
      const radius = Math.max(0.05, 0.5 * Math.max(scale.x, scale.z));
      const height = Math.max(0.05, scale.y);
      return new CANNON.Cylinder(radius, radius, height, 16);
    }
    case 'plane': {
      return new CANNON.Box(new CANNON.Vec3(
        Math.max(0.05, 0.5 * Math.abs(scale.x)),
        0.025,
        Math.max(0.05, 0.5 * Math.abs(scale.z))
      ));
    }
    case 'cube':
    default: {
      return new CANNON.Box(new CANNON.Vec3(
        Math.max(0.05, 0.5 * Math.abs(scale.x)),
        Math.max(0.05, 0.5 * Math.abs(scale.y)),
        Math.max(0.05, 0.5 * Math.abs(scale.z))
      ));
    }
  }
};

const toShapeKey = (object: ThirdSceneObject): string => {
  const { type, transform } = object;
  const { scale } = transform;
  return `${type}:${scale.x.toFixed(3)}:${scale.y.toFixed(3)}:${scale.z.toFixed(3)}`;
};

const applyPresetAnimation = (
  preset: ThirdAnimationPreset,
  elapsedSeconds: number,
  mesh: THREE.Mesh,
  base: RuntimeObjectEntry['base']
): void => {
  mesh.position.copy(base.position);
  mesh.rotation.set(base.rotation.x, base.rotation.y, base.rotation.z);
  mesh.scale.copy(base.scale);

  switch (preset) {
    case 'bounce': {
      mesh.position.y = base.position.y + Math.abs(Math.sin(elapsedSeconds * 2.4)) * 0.45;
      break;
    }
    case 'rotate': {
      mesh.rotation.y = base.rotation.y + elapsedSeconds * 1.4;
      break;
    }
    case 'pulse': {
      const amplitude = 1 + Math.sin(elapsedSeconds * 3.2) * 0.18;
      mesh.scale.set(
        Math.max(0.05, base.scale.x * amplitude),
        Math.max(0.05, base.scale.y * amplitude),
        Math.max(0.05, base.scale.z * amplitude)
      );
      break;
    }
    case 'none':
    default:
      break;
  }
};

const toInspectorFieldKey = (group: InspectorGroup, axis: InspectorAxis): InspectorFieldKey => (
  `${group}.${axis}` as InspectorFieldKey
);

const inspectorValueFromObject = (
  object: ThirdSceneObject,
  group: InspectorGroup,
  axis: InspectorAxis
): number => {
  switch (group) {
    case 'rotation':
      return radToDeg(object.transform.rotation[axis]);
    case 'scale':
      return object.transform.scale[axis];
    case 'position':
    default:
      return object.transform.position[axis];
  }
};

const createInspectorDraft = (object: ThirdSceneObject | null): InspectorDraft => {
  const draft = {} as InspectorDraft;
  INSPECTOR_GROUPS.forEach((group) => {
    INSPECTOR_AXES.forEach((axis) => {
      const key = toInspectorFieldKey(group, axis);
      draft[key] = object
        ? formatInspectorNumber(inspectorValueFromObject(object, group, axis))
        : '';
    });
  });
  return draft;
};

const inspectorStepByGroup = (group: InspectorGroup): string => {
  switch (group) {
    case 'rotation':
      return '1';
    case 'scale':
      return '0.1';
    case 'position':
    default:
      return '0.1';
  }
};

const inspectorGroupLabel = (group: InspectorGroup): string => {
  switch (group) {
    case 'rotation':
      return 'Rotation';
    case 'scale':
      return 'Scale';
    case 'position':
    default:
      return 'Position';
  }
};

const withAxisValue = (value: ThirdVec3, axis: InspectorAxis, next: number): ThirdVec3 => ({
  x: axis === 'x' ? next : value.x,
  y: axis === 'y' ? next : value.y,
  z: axis === 'z' ? next : value.z,
});

type ThirdProps = {
  mode?: 'panel' | 'fullscreen';
};

type RuntimeObjectEntry = {
  id: string;
  mesh: THREE.Mesh;
  material: THREE.MeshPhongMaterial;
  geometry: THREE.BufferGeometry;
  body: CANNON.Body;
  shapeKey: string;
  base: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  };
  physicsEnabled: boolean;
  animationPreset: ThirdAnimationPreset;
};

type RuntimeEngine = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  world: CANNON.World;
  grid: THREE.GridHelper;
  axes: THREE.AxesHelper;
  orbit: OrbitControls;
  transform: TransformControls;
  transformHelper: THREE.Object3D;
  entries: Map<string, RuntimeObjectEntry>;
  dragBody: CANNON.Body;
  activeGrab: GrabState | null;
  touchPointers: Set<number>;
};

type GrabState = {
  pointerId: number;
  pointerType: string;
  depth: number;
  objectId: string;
  constraint: CANNON.PointToPointConstraint;
  touchCameraOverride: boolean;
};

const THIRD: React.FC<ThirdProps> = ({ mode = 'panel' }) => {
  const { resolvedTheme } = useTheme();
  const {
    objects,
    selectionId,
    mode: editorMode,
    physicsEnabled,
    snapEnabled,
    transformMode,
    cameraState,
    addPrimitive,
    selectObject,
    duplicateSelected,
    deleteSelected,
    setTransformMode,
    toggleSnap,
    togglePhysics,
    setObjectPhysicsEnabled,
    setObjectMaterialPreset,
    setObjectMaterialColor,
    setObjectAnimationPreset,
    updateObjectTransform,
    applyObjectTransforms,
    setCameraState,
    forceSave,
    resetToSaved,
  } = useThirdRuntime();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RuntimeEngine | null>(null);
  const rafRef = useRef(0);
  const modeRef = useRef(editorMode);
  const physicsEnabledRef = useRef(physicsEnabled);
  const objectPhysicsRef = useRef(new Map<string, boolean>());
  const selectionIdRef = useRef(selectionId);
  const transformModeRef = useRef(transformMode);
  const snapEnabledRef = useRef(snapEnabled);
  const cameraSaveTimerRef = useRef<number | null>(null);
  const physicsCommitAccumulatorRef = useRef(0);
  const releaseGrabRef = useRef<(pointerId?: number) => void>(() => {});
  const commitRuntimeRef = useRef<(ids?: Set<string>) => void>(() => {});
  const selectedObjectRef = useRef<ThirdSceneObject | null>(null);
  const transformSyncRafRef = useRef<number | null>(null);
  const pendingTransformPatchRef = useRef<ThirdTransformPatch | null>(null);
  const focusedInspectorFieldsRef = useRef(new Set<InspectorFieldKey>());

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectionId) ?? null,
    [objects, selectionId]
  );
  const [inspectorDraft, setInspectorDraft] = useState<InspectorDraft>(() => createInspectorDraft(selectedObject));

  const setInspectorFieldDraft = useCallback((key: InspectorFieldKey, value: string) => {
    setInspectorDraft((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const applyInspectorNumericValue = useCallback((
    group: InspectorGroup,
    axis: InspectorAxis,
    nextValue: number
  ) => {
    const selected = selectedObjectRef.current;
    if (!selected) return;

    if (group === 'position') {
      updateObjectTransform({
        id: selected.id,
        position: withAxisValue(selected.transform.position, axis, nextValue),
      });
      return;
    }

    if (group === 'rotation') {
      updateObjectTransform({
        id: selected.id,
        rotation: withAxisValue(selected.transform.rotation, axis, nextValue),
      });
      return;
    }

    updateObjectTransform({
      id: selected.id,
      scale: withAxisValue(selected.transform.scale, axis, clampInspectorScale(nextValue)),
    });
  }, [updateObjectTransform]);

  const onInspectorFieldChange = useCallback((
    group: InspectorGroup,
    axis: InspectorAxis,
    raw: string
  ) => {
    const key = toInspectorFieldKey(group, axis);
    setInspectorFieldDraft(key, raw);
    const parsed = parseInspectorNumber(raw);
    if (parsed == null) return;
    if (group === 'rotation') {
      applyInspectorNumericValue(group, axis, degToRad(parsed));
      return;
    }
    applyInspectorNumericValue(group, axis, parsed);
  }, [applyInspectorNumericValue, setInspectorFieldDraft]);

  const onInspectorFieldFocus = useCallback((group: InspectorGroup, axis: InspectorAxis) => {
    focusedInspectorFieldsRef.current.add(toInspectorFieldKey(group, axis));
  }, []);

  const onInspectorFieldBlur = useCallback((group: InspectorGroup, axis: InspectorAxis) => {
    const key = toInspectorFieldKey(group, axis);
    focusedInspectorFieldsRef.current.delete(key);

    const selected = selectedObjectRef.current;
    if (!selected) {
      setInspectorFieldDraft(key, '');
      return;
    }

    const raw = inspectorDraft[key] ?? '';
    const parsed = parseInspectorNumber(raw);
    if (parsed == null) {
      setInspectorFieldDraft(key, formatInspectorNumber(inspectorValueFromObject(selected, group, axis)));
      return;
    }

    const normalized = group === 'rotation'
      ? parsed
      : group === 'scale'
        ? clampInspectorScale(parsed)
        : parsed;

    setInspectorFieldDraft(key, formatInspectorNumber(normalized));

    if (group === 'rotation') {
      applyInspectorNumericValue(group, axis, degToRad(normalized));
      return;
    }
    applyInspectorNumericValue(group, axis, normalized);
  }, [applyInspectorNumericValue, inspectorDraft, setInspectorFieldDraft]);

  useEffect(() => {
    modeRef.current = editorMode;
  }, [editorMode]);

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);

  useEffect(() => {
    physicsEnabledRef.current = physicsEnabled;
  }, [physicsEnabled]);

  useEffect(() => {
    objectPhysicsRef.current = new Map(objects.map((object) => [object.id, object.physicsEnabled]));
  }, [objects]);

  useEffect(() => {
    selectionIdRef.current = selectionId;
  }, [selectionId]);

  useEffect(() => {
    const nextDraft = createInspectorDraft(selectedObject);
    setInspectorDraft((prev) => {
      let changed = false;
      const merged = { ...prev };

      INSPECTOR_GROUPS.forEach((group) => {
        INSPECTOR_AXES.forEach((axis) => {
          const key = toInspectorFieldKey(group, axis);
          if (selectedObject && focusedInspectorFieldsRef.current.has(key)) return;
          if (merged[key] === nextDraft[key]) return;
          merged[key] = nextDraft[key];
          changed = true;
        });
      });

      return changed ? merged : prev;
    });
  }, [selectedObject]);

  useEffect(() => {
    transformModeRef.current = transformMode;
  }, [transformMode]);

  useEffect(() => {
    snapEnabledRef.current = snapEnabled;
  }, [snapEnabled]);

  useEffect(() => {
    const mount = canvasHostRef.current;
    const container = rootRef.current;
    if (!mount || !container) return;

    const palette = getThirdPalette(resolvedTheme);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(palette.background);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
    camera.position.set(
      cameraState.position.x,
      cameraState.position.y,
      cameraState.position.z
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = styles.canvas;
    renderer.domElement.style.touchAction = 'none';
    mount.appendChild(renderer.domElement);

    const grid = new THREE.GridHelper(48, 48, palette.accent, palette.accent);
    const initialGridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    initialGridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.45;
    });
    scene.add(grid);

    const axes = new THREE.AxesHelper(3);
    scene.add(axes);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.62);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.58);
    keyLight.position.set(4.5, 6.2, 3.4);
    scene.add(ambientLight);
    scene.add(keyLight);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.enablePan = true;
    orbit.target.set(cameraState.target.x, cameraState.target.y, cameraState.target.z);
    orbit.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    orbit.mouseButtons.MIDDLE = THREE.MOUSE.DOLLY;
    orbit.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    orbit.touches.ONE = THREE.TOUCH.ROTATE;
    orbit.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    orbit.update();

    const transform = new TransformControls(camera, renderer.domElement);
    transform.setMode(transformModeRef.current);
    const transformHelper = transform.getHelper();
    scene.add(transformHelper);

    const world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });
    world.broadphase = new CANNON.NaiveBroadphase();
    (world.solver as CANNON.GSSolver).iterations = 8;
    world.defaultContactMaterial.friction = 0.4;
    world.defaultContactMaterial.restitution = 0.15;

    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      position: new CANNON.Vec3(0, 0, 0),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    const dragBody = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
      shape: new CANNON.Sphere(0.01),
      collisionFilterGroup: 0,
      collisionFilterMask: 0,
    });
    world.addBody(dragBody);

    const engine: RuntimeEngine = {
      scene,
      camera,
      renderer,
      world,
      grid,
      axes,
      orbit,
      transform,
      transformHelper,
      entries: new Map(),
      dragBody,
      activeGrab: null,
      touchPointers: new Set<number>(),
    };
    engineRef.current = engine;

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const clock = new THREE.Clock();
    let physicsAccumulator = 0;
    let elapsedSeconds = 0;

    const syncMeshFromBase = (entry: RuntimeObjectEntry) => {
      entry.mesh.position.copy(entry.base.position);
      entry.mesh.rotation.set(entry.base.rotation.x, entry.base.rotation.y, entry.base.rotation.z);
      entry.mesh.scale.copy(entry.base.scale);
    };

    const syncBodyFromBase = (entry: RuntimeObjectEntry) => {
      const { position, rotation } = entry.base;
      entry.body.position.set(position.x, position.y, position.z);
      entry.body.quaternion.setFromEuler(rotation.x, rotation.y, rotation.z, 'XYZ');
      entry.body.velocity.set(0, 0, 0);
      entry.body.angularVelocity.set(0, 0, 0);
    };

    const syncBaseFromMesh = (entry: RuntimeObjectEntry) => {
      entry.base.position.copy(entry.mesh.position);
      entry.base.rotation.set(entry.mesh.rotation.x, entry.mesh.rotation.y, entry.mesh.rotation.z);
      entry.base.scale.copy(entry.mesh.scale);
      syncBodyFromBase(entry);
    };

    const syncBaseFromBody = (entry: RuntimeObjectEntry) => {
      entry.base.position.set(entry.body.position.x, entry.body.position.y, entry.body.position.z);
      entry.base.rotation.setFromQuaternion(new THREE.Quaternion(
        entry.body.quaternion.x,
        entry.body.quaternion.y,
        entry.body.quaternion.z,
        entry.body.quaternion.w
      ), 'XYZ');
      entry.mesh.position.copy(entry.base.position);
      entry.mesh.rotation.set(entry.base.rotation.x, entry.base.rotation.y, entry.base.rotation.z);
      entry.mesh.scale.copy(entry.base.scale);
    };

    const shouldObjectSimulate = (id: string): boolean => (
      modeRef.current === 'play'
      && physicsEnabledRef.current
      && (objectPhysicsRef.current.get(id) ?? false)
    );

    const applyBodySimulationMode = (entry: RuntimeObjectEntry) => {
      if (shouldObjectSimulate(entry.id)) {
        entry.body.type = CANNON.Body.DYNAMIC;
        entry.body.mass = 1;
        entry.body.updateMassProperties();
        entry.body.wakeUp();
        return;
      }
      entry.body.type = CANNON.Body.STATIC;
      entry.body.mass = 0;
      entry.body.updateMassProperties();
      syncBodyFromBase(entry);
      syncMeshFromBase(entry);
    };

    const commitRuntimeTransforms = (ids?: Set<string>) => {
      const patches: ThirdTransformPatch[] = [];
      engine.entries.forEach((entry) => {
        if (ids && !ids.has(entry.id)) return;
        patches.push({
          id: entry.id,
          position: vec3FromThree(entry.base.position),
          rotation: vec3FromEuler(entry.base.rotation),
          scale: vec3FromThree(entry.base.scale),
        });
      });
      if (patches.length > 0) {
        applyObjectTransforms(patches);
      }
    };
    commitRuntimeRef.current = commitRuntimeTransforms;

    const releaseGrab = (pointerId?: number) => {
      const activeGrab = engine.activeGrab;
      if (!activeGrab) return;
      if (pointerId != null && pointerId !== activeGrab.pointerId) return;

      engine.world.removeConstraint(activeGrab.constraint);
      engine.activeGrab = null;
      if (modeRef.current === 'play') {
        engine.orbit.enabled = true;
      }
    };
    releaseGrabRef.current = releaseGrab;

    const toNdc = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      return true;
    };

    const pickObject = (
      clientX: number,
      clientY: number,
      requirePhysicsEligible = false
    ): { id: string; hitPoint: THREE.Vector3 } | null => {
      if (!toNdc(clientX, clientY)) return null;
      raycaster.setFromCamera(pointerNdc, camera);
      const meshes = [...engine.entries.values()]
        .filter((entry) => !requirePhysicsEligible || shouldObjectSimulate(entry.id))
        .map((entry) => entry.mesh);
      if (meshes.length === 0) return null;
      const hit = raycaster.intersectObjects(meshes, false)[0];
      if (!hit) return null;
      const id = (hit.object as THREE.Object3D).userData.thirdObjectId as string | undefined;
      if (!id) return null;
      return {
        id,
        hitPoint: hit.point.clone(),
      };
    };

    const moveGrabTarget = (clientX: number, clientY: number) => {
      const activeGrab = engine.activeGrab;
      if (!activeGrab || activeGrab.touchCameraOverride) return;
      if (!toNdc(clientX, clientY)) return;
      raycaster.setFromCamera(pointerNdc, camera);
      const target = raycaster.ray.origin.clone().addScaledVector(raycaster.ray.direction, activeGrab.depth);
      engine.dragBody.position.set(target.x, target.y, target.z);
      engine.dragBody.velocity.set(0, 0, 0);
      engine.dragBody.angularVelocity.set(0, 0, 0);
    };

    const startGrab = (args: {
      objectId: string;
      hitPoint: THREE.Vector3;
      pointerId: number;
      pointerType: string;
    }) => {
      const entry = engine.entries.get(args.objectId);
      if (!entry) return;

      releaseGrab();

      const worldPoint = new CANNON.Vec3(args.hitPoint.x, args.hitPoint.y, args.hitPoint.z);
      const localPivot = entry.body.pointToLocalFrame(worldPoint);
      engine.dragBody.position.set(args.hitPoint.x, args.hitPoint.y, args.hitPoint.z);
      engine.dragBody.velocity.set(0, 0, 0);
      engine.dragBody.angularVelocity.set(0, 0, 0);

      const constraint = new CANNON.PointToPointConstraint(
        entry.body,
        localPivot,
        engine.dragBody,
        new CANNON.Vec3(0, 0, 0)
      );
      engine.world.addConstraint(constraint);

      engine.activeGrab = {
        pointerId: args.pointerId,
        pointerType: args.pointerType,
        depth: camera.position.distanceTo(args.hitPoint),
        objectId: args.objectId,
        constraint,
        touchCameraOverride: false,
      };

      if (args.pointerType !== 'touch') {
        engine.orbit.enabled = false;
      } else if (engine.touchPointers.size < 2) {
        engine.orbit.enabled = false;
      }
    };

    const updateTransformAttachment = () => {
      const selectedId = selectionIdRef.current;
      if (modeRef.current !== 'edit' || !selectedId) {
        transform.detach();
        transform.enabled = false;
        return;
      }

      const selected = engine.entries.get(selectedId);
      if (!selected) {
        transform.detach();
        transform.enabled = false;
        return;
      }

      transform.enabled = true;
      transform.attach(selected.mesh);
      transform.setMode(transformModeRef.current);
      if (snapEnabledRef.current) {
        transform.setTranslationSnap(0.5);
        transform.setRotationSnap(Math.PI / 12);
        transform.setScaleSnap(0.1);
      } else {
        transform.setTranslationSnap(null);
        transform.setRotationSnap(null);
        transform.setScaleSnap(null);
      }
    };

    const onTransformDragToggle = (event: { value?: unknown }) => {
      const value = Boolean(event.value);
      if (modeRef.current !== 'edit') return;
      engine.orbit.enabled = !value;
    };

    const onTransformObjectChange = () => {
      const selectedId = selectionIdRef.current;
      if (!selectedId) return;
      const selected = engine.entries.get(selectedId);
      if (!selected) return;
      syncBaseFromMesh(selected);
      pendingTransformPatchRef.current = {
        id: selected.id,
        position: vec3FromThree(selected.base.position),
        rotation: vec3FromEuler(selected.base.rotation),
        scale: vec3FromThree(selected.base.scale),
      };

      if (transformSyncRafRef.current != null) return;
      transformSyncRafRef.current = window.requestAnimationFrame(() => {
        transformSyncRafRef.current = null;
        const patch = pendingTransformPatchRef.current;
        pendingTransformPatchRef.current = null;
        if (patch) updateObjectTransform(patch);
      });
    };

    const onTransformMouseUp = () => {
      const selectedId = selectionIdRef.current;
      if (!selectedId) return;
      commitRuntimeTransforms(new Set([selectedId]));
      forceSave();
    };

    const onOrbitChange = () => {
      if (cameraSaveTimerRef.current != null) {
        window.clearTimeout(cameraSaveTimerRef.current);
      }
      cameraSaveTimerRef.current = window.setTimeout(() => {
        setCameraState({
          position: vec3FromThree(camera.position),
          target: vec3FromThree(orbit.target),
        });
        cameraSaveTimerRef.current = null;
      }, CAMERA_SAVE_DEBOUNCE_MS);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        engine.touchPointers.add(event.pointerId);
      }

      if (modeRef.current === 'edit') {
        const picked = pickObject(event.clientX, event.clientY);
        if (picked) {
          selectObject(picked.id);
          selectionIdRef.current = picked.id;
          updateTransformAttachment();
        }
        return;
      }

      if (modeRef.current !== 'play') return;
      if (event.button !== 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      if (!physicsEnabledRef.current) return;
      const picked = pickObject(event.clientX, event.clientY, true);
      if (!picked) return;

      renderer.domElement.setPointerCapture(event.pointerId);
      startGrab({
        objectId: picked.id,
        hitPoint: picked.hitPoint,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
      });

      if (event.pointerType === 'touch' && engine.touchPointers.size >= 2 && engine.activeGrab) {
        engine.activeGrab.touchCameraOverride = true;
        engine.orbit.enabled = true;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const activeGrab = engine.activeGrab;
      if (!activeGrab || activeGrab.pointerId !== event.pointerId) return;
      moveGrabTarget(event.clientX, event.clientY);
    };

    const onPointerUpOrCancel = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        engine.touchPointers.delete(event.pointerId);
      }

      const activeGrab = engine.activeGrab;
      if (activeGrab && activeGrab.pointerId === event.pointerId) {
        releaseGrab(event.pointerId);
        const entry = engine.entries.get(activeGrab.objectId);
        if (entry) {
          syncBaseFromBody(entry);
          commitRuntimeTransforms(new Set([activeGrab.objectId]));
        }
        forceSave();
      } else if (activeGrab && event.pointerType === 'touch' && engine.touchPointers.size < 2) {
        activeGrab.touchCameraOverride = false;
        engine.orbit.enabled = false;
      }
    };

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    transform.addEventListener('dragging-changed', onTransformDragToggle);
    transform.addEventListener('objectChange', onTransformObjectChange);
    transform.addEventListener('mouseUp', onTransformMouseUp);
    orbit.addEventListener('change', onOrbitChange);

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUpOrCancel);
    renderer.domElement.addEventListener('pointercancel', onPointerUpOrCancel);

    const animate = () => {
      rafRef.current = window.requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      elapsedSeconds += delta;
      engine.orbit.update();

      if (modeRef.current === 'play') {
        engine.entries.forEach((entry) => applyBodySimulationMode(entry));

        if (physicsEnabledRef.current) {
          physicsAccumulator += delta;
          while (physicsAccumulator >= FIXED_TIMESTEP_SECONDS) {
            engine.world.step(FIXED_TIMESTEP_SECONDS, FIXED_TIMESTEP_SECONDS, MAX_PHYSICS_SUBSTEPS);
            physicsAccumulator -= FIXED_TIMESTEP_SECONDS;
          }

          const updatedIds = new Set<string>();
          engine.entries.forEach((entry) => {
            if (!shouldObjectSimulate(entry.id)) {
              syncBodyFromBase(entry);
              syncMeshFromBase(entry);
              return;
            }
            syncBaseFromBody(entry);
            updatedIds.add(entry.id);
          });

          physicsCommitAccumulatorRef.current += delta;
          if (physicsCommitAccumulatorRef.current >= PHYSICS_COMMIT_INTERVAL_SECONDS) {
            commitRuntimeTransforms(updatedIds);
            physicsCommitAccumulatorRef.current = 0;
          }
        } else {
          physicsAccumulator = 0;
          physicsCommitAccumulatorRef.current = 0;
          engine.entries.forEach((entry) => {
            syncBodyFromBase(entry);
            syncMeshFromBase(entry);
          });
        }
      } else {
        engine.entries.forEach((entry) => {
          applyPresetAnimation(entry.animationPreset, elapsedSeconds, entry.mesh, entry.base);
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      releaseGrab();
      commitRuntimeTransforms();
      forceSave();
      window.cancelAnimationFrame(rafRef.current);
      observer.disconnect();

      if (cameraSaveTimerRef.current != null) {
        window.clearTimeout(cameraSaveTimerRef.current);
        cameraSaveTimerRef.current = null;
      }
      if (transformSyncRafRef.current != null) {
        window.cancelAnimationFrame(transformSyncRafRef.current);
        transformSyncRafRef.current = null;
      }
      pendingTransformPatchRef.current = null;

      transform.removeEventListener('dragging-changed', onTransformDragToggle);
      transform.removeEventListener('objectChange', onTransformObjectChange);
      transform.removeEventListener('mouseUp', onTransformMouseUp);
      orbit.removeEventListener('change', onOrbitChange);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUpOrCancel);
      renderer.domElement.removeEventListener('pointercancel', onPointerUpOrCancel);

      engine.entries.forEach((entry) => {
        engine.world.removeBody(entry.body);
        entry.geometry.dispose();
        entry.material.dispose();
        scene.remove(entry.mesh);
      });
      engine.entries.clear();

      scene.remove(transformHelper);
      transform.dispose();
      orbit.dispose();
      engine.world.removeBody(engine.dragBody);
      engine.world.removeBody(groundBody);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      engineRef.current = null;
    };
  // Camera/theme bootstrap should only run once on mount. Runtime sync effects handle updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const palette = getThirdPalette(resolvedTheme);
    engine.scene.background = new THREE.Color(palette.background);
    const gridMaterials = Array.isArray(engine.grid.material)
      ? engine.grid.material
      : [engine.grid.material];
    gridMaterials.forEach((material) => {
      if (!('color' in material)) return;
      (material as THREE.Material & { color: THREE.Color }).color.setHex(palette.accent);
    });
    engine.renderer.render(engine.scene, engine.camera);
  }, [resolvedTheme]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const palette = getThirdPalette(resolvedTheme);
    const nextIds = new Set(objects.map((object) => object.id));

    engine.entries.forEach((entry, id) => {
      if (nextIds.has(id)) return;
      if (engine.transform.object === entry.mesh) {
        engine.transform.detach();
      }
      engine.world.removeBody(entry.body);
      engine.scene.remove(entry.mesh);
      entry.geometry.dispose();
      entry.material.dispose();
      engine.entries.delete(id);
    });

    objects.forEach((object) => {
      const existing = engine.entries.get(object.id);
      const shapeKey = toShapeKey(object);
      if (!existing) {
        const geometry = createGeometry(object.type);
        const material = new THREE.MeshPhongMaterial({
          wireframe: false,
        });
        applyMaterialParams(material, object.material, palette.accent);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData.thirdObjectId = object.id;
        mesh.position.set(
          object.transform.position.x,
          object.transform.position.y,
          object.transform.position.z
        );
        mesh.rotation.set(
          object.transform.rotation.x,
          object.transform.rotation.y,
          object.transform.rotation.z
        );
        mesh.scale.set(
          object.transform.scale.x,
          object.transform.scale.y,
          object.transform.scale.z
        );

        const body = new CANNON.Body({
          mass: 1,
          shape: createBodyShape(object),
          position: vec3ToCannon(object.transform.position),
        });
        body.quaternion.setFromEuler(
          object.transform.rotation.x,
          object.transform.rotation.y,
          object.transform.rotation.z,
          'XYZ'
        );
        body.linearDamping = 0.25;
        body.angularDamping = 0.35;
        engine.world.addBody(body);
        engine.scene.add(mesh);

        engine.entries.set(object.id, {
          id: object.id,
          mesh,
          material,
          geometry,
          body,
          shapeKey,
          base: {
            position: mesh.position.clone(),
            rotation: mesh.rotation.clone(),
            scale: mesh.scale.clone(),
          },
          physicsEnabled: object.physicsEnabled,
          animationPreset: object.animationPreset,
        });
        return;
      }

      existing.physicsEnabled = object.physicsEnabled;
      existing.animationPreset = object.animationPreset;
      applyMaterialParams(existing.material, object.material, palette.accent);

      if (existing.shapeKey !== shapeKey) {
        engine.world.removeBody(existing.body);
        existing.geometry.dispose();
        existing.geometry = createGeometry(object.type);
        existing.mesh.geometry = existing.geometry;
        const body = new CANNON.Body({
          mass: 1,
          shape: createBodyShape(object),
          position: vec3ToCannon(object.transform.position),
        });
        body.quaternion.setFromEuler(
          object.transform.rotation.x,
          object.transform.rotation.y,
          object.transform.rotation.z,
          'XYZ'
        );
        body.linearDamping = 0.25;
        body.angularDamping = 0.35;
        engine.world.addBody(body);
        existing.body = body;
        existing.shapeKey = shapeKey;
      }

      existing.base.position.set(
        object.transform.position.x,
        object.transform.position.y,
        object.transform.position.z
      );
      existing.base.rotation.set(
        object.transform.rotation.x,
        object.transform.rotation.y,
        object.transform.rotation.z
      );
      existing.base.scale.set(
        object.transform.scale.x,
        object.transform.scale.y,
        object.transform.scale.z
      );

      const shouldSimulate = modeRef.current === 'play' && physicsEnabled && object.physicsEnabled;
      if (shouldSimulate) {
        existing.body.type = CANNON.Body.DYNAMIC;
        existing.body.mass = 1;
        existing.body.updateMassProperties();
        existing.body.wakeUp();
      } else {
        existing.body.type = CANNON.Body.STATIC;
        existing.body.mass = 0;
        existing.body.updateMassProperties();
        existing.mesh.position.copy(existing.base.position);
        existing.mesh.rotation.set(
          existing.base.rotation.x,
          existing.base.rotation.y,
          existing.base.rotation.z
        );
        existing.mesh.scale.copy(existing.base.scale);
        existing.body.position.set(
          existing.base.position.x,
          existing.base.position.y,
          existing.base.position.z
        );
        existing.body.quaternion.setFromEuler(
          existing.base.rotation.x,
          existing.base.rotation.y,
          existing.base.rotation.z,
          'XYZ'
        );
        existing.body.velocity.set(0, 0, 0);
        existing.body.angularVelocity.set(0, 0, 0);
      }
    });
  }, [objects, physicsEnabled, resolvedTheme]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const selectedId = selectionId;

    if (editorMode === 'edit') {
      releaseGrabRef.current();
      commitRuntimeRef.current();
      engine.orbit.enabled = true;
    }

    engine.transform.setMode(transformMode);
    if (snapEnabled) {
      engine.transform.setTranslationSnap(0.5);
      engine.transform.setRotationSnap(Math.PI / 12);
      engine.transform.setScaleSnap(0.1);
    } else {
      engine.transform.setTranslationSnap(null);
      engine.transform.setRotationSnap(null);
      engine.transform.setScaleSnap(null);
    }

    if (editorMode !== 'edit') {
      releaseGrabRef.current();
      engine.transform.detach();
      engine.transform.enabled = false;
      engine.orbit.enabled = true;
      return;
    }

    const selected = selectedId ? engine.entries.get(selectedId) : null;
    if (!selected) {
      engine.transform.detach();
      engine.transform.enabled = false;
      return;
    }

    engine.transform.enabled = true;
    engine.transform.attach(selected.mesh);
  }, [editorMode, selectionId, snapEnabled, transformMode]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (editorMode !== 'play' || physicsEnabled) return;

    releaseGrabRef.current();
    const updatedIds = new Set<string>();
    engine.entries.forEach((entry) => {
      entry.base.position.set(entry.body.position.x, entry.body.position.y, entry.body.position.z);
      entry.base.rotation.setFromQuaternion(new THREE.Quaternion(
        entry.body.quaternion.x,
        entry.body.quaternion.y,
        entry.body.quaternion.z,
        entry.body.quaternion.w
      ), 'XYZ');
      entry.mesh.position.copy(entry.base.position);
      entry.mesh.rotation.set(entry.base.rotation.x, entry.base.rotation.y, entry.base.rotation.z);
      entry.mesh.scale.copy(entry.base.scale);
      entry.body.type = CANNON.Body.STATIC;
      entry.body.mass = 0;
      entry.body.updateMassProperties();
      entry.body.position.set(entry.base.position.x, entry.base.position.y, entry.base.position.z);
      entry.body.quaternion.setFromEuler(entry.base.rotation.x, entry.base.rotation.y, entry.base.rotation.z, 'XYZ');
      entry.body.velocity.set(0, 0, 0);
      entry.body.angularVelocity.set(0, 0, 0);
      updatedIds.add(entry.id);
    });
    commitRuntimeRef.current(updatedIds);
    forceSave();
  }, [editorMode, forceSave, physicsEnabled]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (editorMode !== 'play') return;
    const activeGrab = engine.activeGrab;
    if (!activeGrab) return;

    const grabbedObject = objects.find((object) => object.id === activeGrab.objectId);
    if (physicsEnabled && grabbedObject?.physicsEnabled) return;

    releaseGrabRef.current(activeGrab.pointerId);
    const entry = engine.entries.get(activeGrab.objectId);
    if (entry) {
      entry.base.position.set(entry.body.position.x, entry.body.position.y, entry.body.position.z);
      entry.base.rotation.setFromQuaternion(new THREE.Quaternion(
        entry.body.quaternion.x,
        entry.body.quaternion.y,
        entry.body.quaternion.z,
        entry.body.quaternion.w
      ), 'XYZ');
      entry.mesh.position.copy(entry.base.position);
      entry.mesh.rotation.set(entry.base.rotation.x, entry.base.rotation.y, entry.base.rotation.z);
      entry.mesh.scale.copy(entry.base.scale);
      entry.body.type = CANNON.Body.STATIC;
      entry.body.mass = 0;
      entry.body.updateMassProperties();
      entry.body.position.set(entry.base.position.x, entry.base.position.y, entry.base.position.z);
      entry.body.quaternion.setFromEuler(entry.base.rotation.x, entry.base.rotation.y, entry.base.rotation.z, 'XYZ');
      entry.body.velocity.set(0, 0, 0);
      entry.body.angularVelocity.set(0, 0, 0);
      commitRuntimeRef.current(new Set([activeGrab.objectId]));
      forceSave();
    }
  }, [editorMode, forceSave, objects, physicsEnabled]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const cameraPos = engine.camera.position;
    const orbitTarget = engine.orbit.target;

    const posDelta = cameraPos.distanceTo(new THREE.Vector3(
      cameraState.position.x,
      cameraState.position.y,
      cameraState.position.z
    ));
    const targetDelta = orbitTarget.distanceTo(new THREE.Vector3(
      cameraState.target.x,
      cameraState.target.y,
      cameraState.target.z
    ));

    if (posDelta < 0.01 && targetDelta < 0.01) return;
    engine.camera.position.set(
      cameraState.position.x,
      cameraState.position.y,
      cameraState.position.z
    );
    engine.orbit.target.set(
      cameraState.target.x,
      cameraState.target.y,
      cameraState.target.z
    );
    engine.orbit.update();
  }, [cameraState]);

  useEffect(() => {
    const onReset = () => {
      resetToSaved();
      commitRuntimeRef.current();
      forceSave();
    };
    window.addEventListener('terminalos:third:reset-saved', onReset as EventListener);
    return () => window.removeEventListener('terminalos:third:reset-saved', onReset as EventListener);
  }, [forceSave, resetToSaved]);

  useEffect(() => {
    if (editorMode !== 'edit') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest?.('input, textarea, button, select')) return;
      const key = event.key.toLowerCase();
      if (key === 'w') setTransformMode('translate');
      if (key === 'e') setTransformMode('rotate');
      if (key === 'r') setTransformMode('scale');
      if (key === 'g') toggleSnap();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editorMode, setTransformMode, toggleSnap]);

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${mode === 'fullscreen' ? styles.rootFullscreen : ''}`.trim()}
    >
      <div ref={canvasHostRef} className={styles.canvasHost} />

      <div className={styles.hud} data-mode={editorMode}>
        {editorMode === 'edit' ? <span className={styles.editTag}>EDIT</span> : null}
        <div className={styles.toolbar}>
          <button type="button" className={styles.toolBtn} onClick={() => addPrimitive('cube')}>+ CUBE</button>
          <button type="button" className={styles.toolBtn} onClick={() => addPrimitive('sphere')}>+ SPHERE</button>
          <button type="button" className={styles.toolBtn} onClick={() => addPrimitive('cylinder')}>+ CYLINDER</button>
          <button type="button" className={styles.toolBtn} onClick={() => addPrimitive('plane')}>+ PLANE</button>
          <button type="button" className={styles.toolBtn} onClick={duplicateSelected} disabled={!selectionId}>DUP</button>
          <button type="button" className={styles.toolBtn} onClick={deleteSelected} disabled={!selectionId}>DEL</button>
          <button
            type="button"
            className={`${styles.toolBtn} ${physicsEnabled ? styles.toolBtnActive : ''}`.trim()}
            onClick={togglePhysics}
          >
            PHYSICS: {physicsEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {editorMode === 'edit' ? (
          <div className={styles.editTools}>
            <button
              type="button"
              className={`${styles.toolBtn} ${transformMode === 'translate' ? styles.toolBtnActive : ''}`.trim()}
              onClick={() => setTransformMode('translate')}
            >
              MOVE [W]
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${transformMode === 'rotate' ? styles.toolBtnActive : ''}`.trim()}
              onClick={() => setTransformMode('rotate')}
            >
              ROTATE [E]
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${transformMode === 'scale' ? styles.toolBtnActive : ''}`.trim()}
              onClick={() => setTransformMode('scale')}
            >
              SCALE [R]
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${snapEnabled ? styles.toolBtnActive : ''}`.trim()}
              onClick={toggleSnap}
            >
              SNAP [G]: {snapEnabled ? 'ON' : 'OFF'}
            </button>
          </div>
        ) : null}

        {editorMode === 'edit' ? (
          <div className={styles.animationTools}>
            <button
              type="button"
              className={`${styles.toolBtn} ${selectedObject?.animationPreset === 'none' ? styles.toolBtnActive : ''}`.trim()}
              onClick={() => selectionId && setObjectAnimationPreset(selectionId, 'none')}
              disabled={!selectionId}
            >
              ANIM: NONE
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${selectedObject?.animationPreset === 'bounce' ? styles.toolBtnActive : ''}`.trim()}
              onClick={() => selectionId && setObjectAnimationPreset(selectionId, 'bounce')}
              disabled={!selectionId}
            >
              BOUNCE
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${selectedObject?.animationPreset === 'rotate' ? styles.toolBtnActive : ''}`.trim()}
              onClick={() => selectionId && setObjectAnimationPreset(selectionId, 'rotate')}
              disabled={!selectionId}
            >
              ROTATE
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${selectedObject?.animationPreset === 'pulse' ? styles.toolBtnActive : ''}`.trim()}
              onClick={() => selectionId && setObjectAnimationPreset(selectionId, 'pulse')}
              disabled={!selectionId}
            >
              PULSE
            </button>
          </div>
        ) : null}

        {editorMode === 'edit' ? (
          <div className={styles.materialTools}>
            {MATERIAL_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`${styles.toolBtn} ${selectedObject?.material.preset === preset ? styles.toolBtnActive : ''}`.trim()}
                onClick={() => selectionId && setObjectMaterialPreset(selectionId, preset)}
                disabled={!selectionId}
              >
                {`MAT: ${preset.toUpperCase()}`}
              </button>
            ))}
            <div className={styles.materialSwatchRow} role="group" aria-label="Material color swatches">
              {MATERIAL_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className={`${styles.materialSwatch} ${selectedObject?.material.color.toLowerCase() === swatch ? styles.materialSwatchActive : ''}`.trim()}
                  style={{ backgroundColor: swatch }}
                  onClick={() => selectionId && setObjectMaterialColor(selectionId, swatch)}
                  disabled={!selectionId}
                  aria-label={`Set material color ${swatch}`}
                  title={swatch}
                />
              ))}
            </div>
            <label className={styles.materialColorLabel}>
              COLOR
              <input
                type="color"
                className={styles.materialColorInput}
                value={selectedObject?.material.color ?? '#00ff66'}
                onChange={(event) => selectionId && setObjectMaterialColor(selectionId, event.target.value)}
                disabled={!selectionId}
                aria-label="Material custom color"
              />
            </label>
          </div>
        ) : null}

        <div className={styles.objectList} aria-label="THIRD objects">
          {objects.map((object) => (
            <div key={object.id} className={styles.objectRow}>
              <button
                type="button"
                className={`${styles.objectItem} ${selectionId === object.id ? styles.objectItemActive : ''}`.trim()}
                onClick={() => selectObject(object.id)}
              >
                {object.name}
              </button>
              <button
                type="button"
                className={`${styles.objectPhysicsBtn} ${object.physicsEnabled ? styles.objectPhysicsBtnActive : ''}`.trim()}
                onClick={() => setObjectPhysicsEnabled(object.id, !object.physicsEnabled)}
              >
                {object.physicsEnabled ? 'REMOVE PHYSICS' : 'ADD PHYSICS'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {editorMode === 'edit' ? (
        <aside className={styles.inspector} aria-label="THIRD inspector">
          <header className={styles.inspectorHeader}>
            <p className={styles.inspectorTitle}>INSPECTOR</p>
            <p className={styles.inspectorObjectName}>{selectedObject?.name ?? 'NO SELECTION'}</p>
          </header>

          <section className={styles.inspectorSection} aria-labelledby="third-transform-heading">
            <h3 id="third-transform-heading" className={styles.inspectorSectionTitle}>TRANSFORM</h3>
            {selectedObject ? (
              <div className={styles.inspectorGrid}>
                {INSPECTOR_GROUPS.map((group) => (
                  <div key={group} className={styles.inspectorVectorRow}>
                    <span className={styles.inspectorVectorLabel}>{inspectorGroupLabel(group)}</span>
                    {INSPECTOR_AXES.map((axis) => {
                      const fieldKey = toInspectorFieldKey(group, axis);
                      return (
                        <label key={fieldKey} className={styles.inspectorAxisField}>
                          <span className={styles.inspectorAxisToken}>{axis.toUpperCase()}</span>
                          <input
                            type="number"
                            className={styles.inspectorInput}
                            step={inspectorStepByGroup(group)}
                            value={inspectorDraft[fieldKey] ?? ''}
                            inputMode="decimal"
                            onFocus={() => onInspectorFieldFocus(group, axis)}
                            onChange={(event) => onInspectorFieldChange(group, axis, event.target.value)}
                            onBlur={() => onInspectorFieldBlur(group, axis)}
                            aria-label={`${inspectorGroupLabel(group)} ${axis.toUpperCase()}`}
                          />
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.inspectorEmpty}>SELECT AN OBJECT TO EDIT TRANSFORM.</p>
            )}
          </section>
        </aside>
      ) : null}
    </div>
  );
};

export default THIRD;
