import React, { useEffect, useMemo, useRef } from 'react';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import styles from './THIRD.module.scss';
import { useTheme } from '../../theme/ThemeProvider';
import { RUNTIME_THEME_PALETTE } from '../../theme/runtimePalette';
import type { ResolvedTheme } from '../../theme/types';
import { useThirdRuntime } from '../../third/ThirdProvider';
import type {
  ThirdAnimationPreset,
  ThirdPrimitiveType,
  ThirdSceneObject,
  ThirdTransformPatch,
  ThirdVec3,
} from '../../third/types';

const FIXED_TIMESTEP_SECONDS = 1 / 60;
const MAX_PHYSICS_SUBSTEPS = 3;
const PHYSICS_COMMIT_INTERVAL_SECONDS = 0.4;
const CAMERA_SAVE_DEBOUNCE_MS = 250;

const toThreeHex = (value: string, fallback: number): number => {
  const parsed = Number.parseInt(value.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getThirdPalette = (theme: ResolvedTheme): { background: number; wireframe: number } => {
  const palette = RUNTIME_THEME_PALETTE[theme];
  return {
    background: toThreeHex(palette.background, 0x000000),
    wireframe: toThreeHex(palette.text, 0x00ff66),
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

type ThirdProps = {
  mode?: 'panel' | 'fullscreen';
};

type RuntimeObjectEntry = {
  id: string;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  geometry: THREE.BufferGeometry;
  body: CANNON.Body;
  shapeKey: string;
  base: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  };
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
    snapEnabled,
    transformMode,
    cameraState,
    addPrimitive,
    selectObject,
    duplicateSelected,
    deleteSelected,
    setTransformMode,
    toggleSnap,
    setObjectAnimationPreset,
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
  const selectionIdRef = useRef(selectionId);
  const transformModeRef = useRef(transformMode);
  const snapEnabledRef = useRef(snapEnabled);
  const cameraSaveTimerRef = useRef<number | null>(null);
  const physicsCommitAccumulatorRef = useRef(0);
  const releaseGrabRef = useRef<(pointerId?: number) => void>(() => {});
  const commitRuntimeRef = useRef<(ids?: Set<string>) => void>(() => {});

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectionId) ?? null,
    [objects, selectionId]
  );

  useEffect(() => {
    modeRef.current = editorMode;
  }, [editorMode]);

  useEffect(() => {
    selectionIdRef.current = selectionId;
  }, [selectionId]);

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

    const grid = new THREE.GridHelper(48, 48, palette.wireframe, palette.wireframe);
    const initialGridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    initialGridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.45;
    });
    scene.add(grid);

    const axes = new THREE.AxesHelper(3);
    scene.add(axes);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.enablePan = false;
    orbit.target.set(cameraState.target.x, cameraState.target.y, cameraState.target.z);
    orbit.touches.ONE = THREE.TOUCH.PAN;
    orbit.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
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

    const pickObject = (clientX: number, clientY: number): { id: string; hitPoint: THREE.Vector3 } | null => {
      if (!toNdc(clientX, clientY)) return null;
      raycaster.setFromCamera(pointerNdc, camera);
      const meshes = [...engine.entries.values()].map((entry) => entry.mesh);
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

      const picked = pickObject(event.clientX, event.clientY);

      if (modeRef.current === 'edit') {
        if (picked) {
          selectObject(picked.id);
          selectionIdRef.current = picked.id;
          updateTransformAttachment();
        }
        return;
      }

      if (modeRef.current !== 'play') return;
      if (event.button !== 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
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
        physicsAccumulator += delta;
        while (physicsAccumulator >= FIXED_TIMESTEP_SECONDS) {
          engine.world.step(FIXED_TIMESTEP_SECONDS, FIXED_TIMESTEP_SECONDS, MAX_PHYSICS_SUBSTEPS);
          physicsAccumulator -= FIXED_TIMESTEP_SECONDS;
        }

        engine.entries.forEach((entry) => {
          syncBaseFromBody(entry);
        });

        physicsCommitAccumulatorRef.current += delta;
        if (physicsCommitAccumulatorRef.current >= PHYSICS_COMMIT_INTERVAL_SECONDS) {
          commitRuntimeTransforms();
          physicsCommitAccumulatorRef.current = 0;
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
      (material as THREE.Material & { color: THREE.Color }).color.setHex(palette.wireframe);
    });

    const axesMaterials = Array.isArray(engine.axes.material)
      ? engine.axes.material
      : [engine.axes.material];
    axesMaterials.forEach((material) => {
      if (!('color' in material)) return;
      (material as THREE.Material & { color: THREE.Color }).color.setHex(palette.wireframe);
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
        const material = new THREE.MeshBasicMaterial({
          color: object.material.color || palette.wireframe,
          wireframe: object.material.wireframe,
        });
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
          animationPreset: object.animationPreset,
        });
        return;
      }

      existing.animationPreset = object.animationPreset;
      existing.material.wireframe = object.material.wireframe;
      existing.material.color.set(object.material.color || palette.wireframe);

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

      if (modeRef.current !== 'play') {
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
  }, [objects, resolvedTheme]);

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

        <div className={styles.objectList} aria-label="THIRD objects">
          {objects.map((object) => (
            <button
              key={object.id}
              type="button"
              className={`${styles.objectItem} ${selectionId === object.id ? styles.objectItemActive : ''}`.trim()}
              onClick={() => selectObject(object.id)}
            >
              {object.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default THIRD;
