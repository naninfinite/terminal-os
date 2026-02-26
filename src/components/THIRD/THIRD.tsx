import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import styles from './THIRD.module.scss';
import {
  buildThirdViewportMenu,
  isCameraPresetId,
  resolveCameraPresetPosition,
  type ThirdCameraPresetId,
  type ThirdViewportMenuActionId,
  type ThirdViewportMenuGroupId,
} from './thirdViewportMenu';
import {
  buildThirdHierarchyMenu,
  type ThirdHierarchyMenuContext,
  type ThirdHierarchyMenuActionId,
} from './thirdHierarchyMenu';
import {
  buildThirdSceneToolbar,
  type ThirdSceneToolbarActionId,
} from './thirdSceneToolbar';
import {
  resolveFocusCameraDistance,
  resolveThirdCameraHotkey,
  THIRD_FOCUS_CAMERA_Y_OFFSET,
} from './thirdCameraControls';
import {
  clampInspectorScale,
  degToRad,
  formatInspectorNumber,
  parseInspectorNumber,
  radToDeg,
} from './transformInspector';
import { useTheme } from '../../theme/ThemeProvider';
import {
  getThirdThemePalette,
  resolveThirdMaterialColorHex,
} from './thirdTheme';
import { useThirdRuntime } from '../../third/ThirdProvider';
import {
  THIRD_DEFAULT_CAMERA_STATE,
  THIRD_MAX_OBJECT_NAME_LENGTH,
} from '../../third/state';
import type {
  ThirdAnimationPreset,
  ThirdMaterialPreset,
  ThirdPrimitiveType,
  ThirdProjectionMode,
  ThirdSceneObject,
  ThirdTransformPatch,
  ThirdVec3,
} from '../../third/types';

const FIXED_TIMESTEP_SECONDS = 1 / 60;
const MAX_PHYSICS_SUBSTEPS = 3;
const PHYSICS_COMMIT_INTERVAL_SECONDS = 0.4;
const CAMERA_SAVE_DEBOUNCE_MS = 250;
const RIGHT_CLICK_OPEN_TOLERANCE_PX = 6;
const MIN_CAMERA_DISTANCE = 1.2;
const ORTHOGRAPHIC_FRUSTUM_HEIGHT = 11;
const HIERARCHY_ROOT_DROP_TARGET = '__root__' as const;
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
const INSPECTOR_SECTION_IDS = ['camera', 'transform', 'animation', 'physics', 'material'] as const;

type InspectorGroup = typeof INSPECTOR_GROUPS[number];
type InspectorAxis = typeof INSPECTOR_AXES[number];
type InspectorFieldKey = `${InspectorGroup}.${InspectorAxis}`;
type InspectorDraft = Record<InspectorFieldKey, string>;
type InspectorSectionId = typeof INSPECTOR_SECTION_IDS[number];
type InspectorSectionState = Record<InspectorSectionId, boolean>;

type ViewportMenuState = {
  x: number;
  y: number;
  openGroupId: ThirdViewportMenuGroupId | null;
};

type HierarchyMenuState = {
  x: number;
  y: number;
  context: ThirdHierarchyMenuContext;
  objectId: string | null;
};

type RightClickCandidate = {
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

type HierarchyTreeNode = {
  object: ThirdSceneObject;
  children: HierarchyTreeNode[];
};

type HierarchyDropTarget = string | typeof HIERARCHY_ROOT_DROP_TARGET | null;
type MobileUtilityPanel = 'scene' | 'inspector';

const applyMaterialParams = (
  material: THREE.MeshPhongMaterial,
  params: ThirdSceneObject['material'],
  fallbackHex: number
): void => {
  const colorHex = resolveThirdMaterialColorHex(params.color, fallbackHex);
  const color = new THREE.Color(colorHex);

  material.color.copy(color);
  material.wireframe = params.wireframe === true;
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
  // TODO(THIRD animation): Evaluate replacing preset math animations with GSAP timelines.
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

const createInspectorSectionState = (expanded = true): InspectorSectionState => (
  INSPECTOR_SECTION_IDS.reduce((acc, section) => {
    acc[section] = expanded;
    return acc;
  }, {} as InspectorSectionState)
);

const createInitialInspectorSectionState = (): InspectorSectionState => ({
  ...createInspectorSectionState(false),
});

const projectionLabel = (mode: ThirdProjectionMode): string => (
  mode === 'orthographic' ? 'ORTHOGRAPHIC' : 'PERSPECTIVE'
);

const updateOrthographicBounds = (
  camera: THREE.OrthographicCamera,
  width: number,
  height: number
): void => {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const aspect = safeWidth / safeHeight;
  const halfHeight = ORTHOGRAPHIC_FRUSTUM_HEIGHT / 2;
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.updateProjectionMatrix();
};

const copyCameraPose = (
  source: THREE.Camera,
  target: THREE.Camera
): void => {
  target.position.copy(source.position);
  target.quaternion.copy(source.quaternion);
};

const withClampedDistance = (distance: number): number => (
  Number.isFinite(distance) ? Math.max(MIN_CAMERA_DISTANCE, distance) : MIN_CAMERA_DISTANCE
);

const buildHierarchyTree = (objects: ThirdSceneObject[]): HierarchyTreeNode[] => {
  const validIds = new Set(objects.map((object) => object.id));
  const childrenByParent = new Map<string | null, ThirdSceneObject[]>();

  objects.forEach((object) => {
    const parentId = object.parentId && validIds.has(object.parentId) ? object.parentId : null;
    const bucket = childrenByParent.get(parentId);
    if (bucket) {
      bucket.push(object);
      return;
    }
    childrenByParent.set(parentId, [object]);
  });

  const buildNodes = (parentId: string | null, ancestry: Set<string>): HierarchyTreeNode[] => {
    const children = childrenByParent.get(parentId) ?? [];
    return children.map((object) => {
      if (ancestry.has(object.id)) {
        return { object, children: [] };
      }
      const nextAncestry = new Set(ancestry);
      nextAncestry.add(object.id);
      return {
        object,
        children: buildNodes(object.id, nextAncestry),
      };
    });
  };

  const roots = buildNodes(null, new Set());
  const visited = new Set<string>();
  const markVisited = (nodes: HierarchyTreeNode[]) => {
    nodes.forEach((node) => {
      visited.add(node.object.id);
      markVisited(node.children);
    });
  };
  markVisited(roots);

  const remaining = objects
    .filter((object) => !visited.has(object.id))
    .map((object) => ({ object, children: [] as HierarchyTreeNode[] }));

  return [...roots, ...remaining];
};

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
  animationPreset: ThirdAnimationPreset;
};

type RuntimeEngine = {
  scene: THREE.Scene;
  perspectiveCamera: THREE.PerspectiveCamera;
  orthographicCamera: THREE.OrthographicCamera;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  projectionMode: ThirdProjectionMode;
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
    showGrid,
    showAxes,
    snapEnabled,
    transformMode,
    cameraState,
    addPrimitive,
    selectObject,
    duplicateSelected,
    deleteSelected,
    toggleMode,
    setTransformMode,
    toggleSnap,
    toggleShowGrid,
    toggleShowAxes,
    setObjectPhysicsEnabled,
    setObjectParent,
    setObjectName,
    setObjectMaterialPreset,
    setObjectMaterialColor,
    setObjectMaterialWireframe,
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
  const rightClickCandidateRef = useRef<RightClickCandidate | null>(null);
  const viewportMenuRef = useRef<HTMLDivElement | null>(null);
  const hierarchyMenuRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const projectionModeRef = useRef<ThirdProjectionMode>(cameraState.projectionMode);

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectionId) ?? null,
    [objects, selectionId]
  );
  const [inspectorDraft, setInspectorDraft] = useState<InspectorDraft>(() => createInspectorDraft(selectedObject));
  const [inspectorSections, setInspectorSections] = useState<InspectorSectionState>(
    () => createInitialInspectorSectionState()
  );
  const [sceneWindowVisible, setSceneWindowVisible] = useState(true);
  const [inspectorWindowVisible, setInspectorWindowVisible] = useState(true);
  const [mobileUtilityPanel, setMobileUtilityPanel] = useState<MobileUtilityPanel>('scene');
  const [viewportMenu, setViewportMenu] = useState<ViewportMenuState | null>(null);
  const [hierarchyMenu, setHierarchyMenu] = useState<HierarchyMenuState | null>(null);
  const [hierarchyExpanded, setHierarchyExpanded] = useState(true);
  const [hierarchyCollapsedIds, setHierarchyCollapsedIds] = useState<Set<string>>(() => new Set());
  const [hierarchyDragObjectId, setHierarchyDragObjectId] = useState<string | null>(null);
  const [hierarchyDropTargetId, setHierarchyDropTargetId] = useState<HierarchyDropTarget>(null);
  const [renamingObjectId, setRenamingObjectId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const hierarchyTree = useMemo(() => buildHierarchyTree(objects), [objects]);
  const isEditMode = editorMode === 'edit';
  const viewportMenuGroups = useMemo(() => buildThirdViewportMenu({
    mode: editorMode,
    snapEnabled,
    projectionMode: cameraState.projectionMode,
    inspectorVisible: inspectorWindowVisible,
    hasSelection: selectedObject != null,
    selectedObjectPhysicsEnabled: selectedObject?.physicsEnabled ?? false,
  }), [
    cameraState.projectionMode,
    editorMode,
    inspectorWindowVisible,
    selectedObject,
    snapEnabled,
  ]);
  const sceneToolbarItems = useMemo(() => buildThirdSceneToolbar({
    mode: editorMode,
    transformMode,
    projectionMode: cameraState.projectionMode,
    snapEnabled,
    showGrid,
    showAxes,
  }), [
    cameraState.projectionMode,
    editorMode,
    showAxes,
    showGrid,
    snapEnabled,
    transformMode,
  ]);
  const hierarchyMenuObject = useMemo(() => {
    if (!hierarchyMenu || hierarchyMenu.context !== 'object' || !hierarchyMenu.objectId) {
      return null;
    }
    return objects.find((object) => object.id === hierarchyMenu.objectId) ?? null;
  }, [hierarchyMenu, objects]);
  const hierarchyMenuItems = useMemo(() => {
    const context: ThirdHierarchyMenuContext = hierarchyMenu?.context ?? 'object';
    const hasSelection = context === 'object' && hierarchyMenuObject != null;
    return buildThirdHierarchyMenu({
      context,
      mode: editorMode,
      hasSelection,
      selectedObjectHasParent: hierarchyMenuObject?.parentId != null,
      isRenaming: hasSelection && renamingObjectId === hierarchyMenuObject?.id,
    });
  }, [editorMode, hierarchyMenu, hierarchyMenuObject, renamingObjectId]);

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

  const toggleInspectorSection = useCallback((section: InspectorSectionId) => {
    setInspectorSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const setAllInspectorSections = useCallback((expanded: boolean) => {
    setInspectorSections(createInspectorSectionState(expanded));
  }, []);

  const toggleHierarchyNode = useCallback((id: string) => {
    setHierarchyCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const canSetHierarchyParent = useCallback((childId: string, parentId: string | null): boolean => {
    const objectById = new Map(objects.map((object) => [object.id, object]));
    const child = objectById.get(childId);
    if (!child) return false;
    if (parentId === childId) return false;
    if (child.parentId === parentId) return false;

    let currentId = parentId;
    const visited = new Set<string>();
    while (currentId) {
      if (currentId === childId) return false;
      if (visited.has(currentId)) return false;
      visited.add(currentId);
      currentId = objectById.get(currentId)?.parentId ?? null;
    }

    return true;
  }, [objects]);

  const clearHierarchyDragState = useCallback(() => {
    setHierarchyDragObjectId(null);
    setHierarchyDropTargetId(null);
  }, []);

  const dropHierarchyParent = useCallback((parentId: string | null) => {
    if (!hierarchyDragObjectId) return;
    if (!canSetHierarchyParent(hierarchyDragObjectId, parentId)) return;
    setObjectParent(hierarchyDragObjectId, parentId);
    selectObject(hierarchyDragObjectId);
  }, [canSetHierarchyParent, hierarchyDragObjectId, selectObject, setObjectParent]);

  const closeHierarchyMenu = useCallback(() => {
    setHierarchyMenu(null);
  }, []);

  const openHierarchyMenuForObject = useCallback((args: {
    objectId: string;
    clientX: number;
    clientY: number;
  }) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const localX = args.clientX - rect.left;
    const localY = args.clientY - rect.top;
    const clampedX = Math.max(6, Math.min(rect.width - 6, localX));
    const clampedY = Math.max(6, Math.min(rect.height - 6, localY));

    selectObject(args.objectId);
    setHierarchyMenu({
      x: clampedX,
      y: clampedY,
      context: 'object',
      objectId: args.objectId,
    });
  }, [selectObject]);

  const openHierarchyMenuForScene = useCallback((args: {
    clientX: number;
    clientY: number;
  }) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const localX = args.clientX - rect.left;
    const localY = args.clientY - rect.top;
    const clampedX = Math.max(6, Math.min(rect.width - 6, localX));
    const clampedY = Math.max(6, Math.min(rect.height - 6, localY));

    setHierarchyMenu({
      x: clampedX,
      y: clampedY,
      context: 'scene',
      objectId: null,
    });
  }, []);

  const startRenameObject = useCallback((id: string) => {
    const target = objects.find((object) => object.id === id);
    if (!target) return;
    selectObject(id);
    setRenamingObjectId(id);
    setRenameDraft(target.name);
  }, [objects, selectObject]);

  const cancelRenameObject = useCallback(() => {
    setRenamingObjectId(null);
    setRenameDraft('');
  }, []);

  const commitRenameObject = useCallback(() => {
    if (!renamingObjectId) return;
    const target = objects.find((object) => object.id === renamingObjectId);
    if (!target) {
      cancelRenameObject();
      return;
    }

    const nextName = renameDraft.trim();
    if (nextName) {
      setObjectName(renamingObjectId, nextName);
    }
    cancelRenameObject();
  }, [cancelRenameObject, objects, renameDraft, renamingObjectId, setObjectName]);

  const closeViewportMenu = useCallback(() => {
    setViewportMenu(null);
  }, []);

  const toggleViewportGroup = useCallback((groupId: ThirdViewportMenuGroupId) => {
    setViewportMenu((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        openGroupId: prev.openGroupId === groupId ? null : groupId,
      };
    });
  }, []);

  const openViewportMenu = useCallback((clientX: number, clientY: number, openGroupId: ThirdViewportMenuGroupId = 'add') => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const clampedX = Math.max(6, Math.min(rect.width - 6, localX));
    const clampedY = Math.max(6, Math.min(rect.height - 6, localY));

    setViewportMenu({
      x: clampedX,
      y: clampedY,
      openGroupId,
    });
  }, []);

  const setProjectionMode = useCallback((projectionMode: ThirdProjectionMode) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.projectionMode === projectionMode) return;

    const previousCamera = engine.camera;
    const nextCamera = projectionMode === 'orthographic'
      ? engine.orthographicCamera
      : engine.perspectiveCamera;

    copyCameraPose(previousCamera, nextCamera);

    if (projectionMode === 'orthographic') {
      const distance = previousCamera.position.distanceTo(engine.orbit.target);
      const perspectiveFov = THREE.MathUtils.degToRad(engine.perspectiveCamera.fov);
      const visibleHeight = 2 * withClampedDistance(distance) * Math.tan(perspectiveFov / 2);
      const zoom = ORTHOGRAPHIC_FRUSTUM_HEIGHT / Math.max(visibleHeight, 0.0001);
      engine.orthographicCamera.zoom = THREE.MathUtils.clamp(zoom, 0.2, 8);
      engine.orthographicCamera.updateProjectionMatrix();
    }

    engine.camera = nextCamera;
    engine.projectionMode = projectionMode;
    projectionModeRef.current = projectionMode;
    (engine.orbit as OrbitControls & { object: THREE.Camera }).object = nextCamera;
    (engine.transform as TransformControls & { camera: THREE.Camera }).camera = nextCamera;
    engine.orbit.update();
  }, []);

  const saveCameraFromRuntime = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setCameraState({
      position: vec3FromThree(engine.camera.position),
      target: vec3FromThree(engine.orbit.target),
      projectionMode: engine.projectionMode,
    });
  }, [setCameraState]);

  const focusObjectInCamera = useCallback((objectId: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    const entry = engine.entries.get(objectId);
    if (!entry) return;

    const worldPosition = new THREE.Vector3();
    const bounds = new THREE.Box3();
    const boundsSize = new THREE.Vector3();
    entry.mesh.updateMatrixWorld(true);
    entry.mesh.getWorldPosition(worldPosition);
    bounds.setFromObject(entry.mesh);
    bounds.getSize(boundsSize);
    const objectRadius = Math.max(0.25, boundsSize.length() * 0.5);
    const desiredDistance = resolveFocusCameraDistance({
      objectRadius,
      minDistance: MIN_CAMERA_DISTANCE,
    });

    const cameraDirection = engine.camera.position.clone().sub(engine.orbit.target);
    if (cameraDirection.lengthSq() < 0.000001) {
      cameraDirection.set(0, 0.5, 1);
    }
    cameraDirection.normalize();

    engine.orbit.target.copy(worldPosition);
    engine.camera.position.copy(worldPosition).addScaledVector(cameraDirection, desiredDistance);
    engine.camera.position.y += THIRD_FOCUS_CAMERA_Y_OFFSET;

    if (engine.projectionMode === 'orthographic') {
      const framedHeight = Math.max(0.5, objectRadius * 4);
      engine.orthographicCamera.zoom = THREE.MathUtils.clamp(
        ORTHOGRAPHIC_FRUSTUM_HEIGHT / framedHeight,
        0.2,
        8
      );
      engine.orthographicCamera.updateProjectionMatrix();
    }

    engine.camera.lookAt(engine.orbit.target);
    engine.orbit.update();
    saveCameraFromRuntime();
  }, [saveCameraFromRuntime]);

  const applyCameraPreset = useCallback((preset: ThirdCameraPresetId) => {
    const engine = engineRef.current;
    if (!engine) return;

    const distance = withClampedDistance(
      engine.camera.position.distanceTo(engine.orbit.target)
    );
    const nextPosition = resolveCameraPresetPosition({
      preset,
      target: vec3FromThree(engine.orbit.target),
      distance,
    });

    engine.camera.position.set(nextPosition.x, nextPosition.y, nextPosition.z);
    if (preset === 'top') {
      engine.camera.up.set(0, 0, -1);
    } else {
      engine.camera.up.set(0, 1, 0);
    }
    engine.camera.lookAt(engine.orbit.target);
    engine.orbit.update();
    saveCameraFromRuntime();
  }, [saveCameraFromRuntime]);

  const resetCameraView = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.camera.position.set(
      THIRD_DEFAULT_CAMERA_STATE.position.x,
      THIRD_DEFAULT_CAMERA_STATE.position.y,
      THIRD_DEFAULT_CAMERA_STATE.position.z
    );
    engine.orbit.target.set(
      THIRD_DEFAULT_CAMERA_STATE.target.x,
      THIRD_DEFAULT_CAMERA_STATE.target.y,
      THIRD_DEFAULT_CAMERA_STATE.target.z
    );
    engine.camera.up.set(0, 1, 0);
    engine.orbit.update();
    saveCameraFromRuntime();
  }, [saveCameraFromRuntime]);

  const runHierarchyMenuAction = useCallback((actionId: ThirdHierarchyMenuActionId) => {
    if (
      actionId === 'hierarchy_add_cube'
      || actionId === 'hierarchy_add_sphere'
      || actionId === 'hierarchy_add_cylinder'
      || actionId === 'hierarchy_add_plane'
    ) {
      const primitiveType = actionId.replace('hierarchy_add_', '') as ThirdPrimitiveType;
      addPrimitive(primitiveType);
      closeHierarchyMenu();
      return;
    }

    const targetObject = hierarchyMenuObject;
    if (!targetObject) {
      closeHierarchyMenu();
      return;
    }

    const runOnTargetObject = (fn: () => void) => {
      if (selectionId === targetObject.id) {
        fn();
        return;
      }
      selectObject(targetObject.id);
      window.requestAnimationFrame(fn);
    };

    switch (actionId) {
      case 'hierarchy_focus':
        runOnTargetObject(() => focusObjectInCamera(targetObject.id));
        break;
      case 'hierarchy_rename':
        if (editorMode === 'edit') {
          startRenameObject(targetObject.id);
        }
        break;
      case 'hierarchy_duplicate':
        runOnTargetObject(() => duplicateSelected());
        break;
      case 'hierarchy_delete':
        runOnTargetObject(() => deleteSelected());
        break;
      case 'hierarchy_unparent':
        if (editorMode === 'edit' && targetObject.parentId) {
          setObjectParent(targetObject.id, null);
          selectObject(targetObject.id);
        }
        break;
      default:
        break;
    }

    closeHierarchyMenu();
  }, [
    addPrimitive,
    closeHierarchyMenu,
    deleteSelected,
    duplicateSelected,
    editorMode,
    focusObjectInCamera,
    hierarchyMenuObject,
    selectionId,
    selectObject,
    setObjectParent,
    startRenameObject,
  ]);

  const runSceneToolbarAction = useCallback((actionId: ThirdSceneToolbarActionId) => {
    switch (actionId) {
      case 'scene_toggle_mode':
        toggleMode();
        break;
      case 'transform_translate':
        if (editorMode === 'edit') {
          setTransformMode('translate');
        }
        break;
      case 'transform_rotate':
        if (editorMode === 'edit') {
          setTransformMode('rotate');
        }
        break;
      case 'transform_scale':
        if (editorMode === 'edit') {
          setTransformMode('scale');
        }
        break;
      case 'scene_toggle_snap':
        if (editorMode === 'edit') {
          toggleSnap();
        }
        break;
      case 'scene_toggle_grid':
        toggleShowGrid();
        break;
      case 'scene_toggle_axes':
        toggleShowAxes();
        break;
      case 'camera_toggle_projection': {
        const nextProjection = projectionModeRef.current === 'orthographic'
          ? 'perspective'
          : 'orthographic';
        setProjectionMode(nextProjection);
        saveCameraFromRuntime();
        break;
      }
      case 'camera_view_top':
        applyCameraPreset('top');
        break;
      case 'camera_view_front':
        applyCameraPreset('front');
        break;
      case 'camera_view_right':
        applyCameraPreset('right');
        break;
      case 'camera_reset':
        resetCameraView();
        break;
      default:
        break;
    }
  }, [
    applyCameraPreset,
    editorMode,
    resetCameraView,
    saveCameraFromRuntime,
    setProjectionMode,
    setTransformMode,
    toggleMode,
    toggleShowAxes,
    toggleShowGrid,
    toggleSnap,
  ]);

  const runViewportMenuAction = useCallback((actionId: ThirdViewportMenuActionId) => {
    switch (actionId) {
      case 'add_cube':
        addPrimitive('cube');
        break;
      case 'add_sphere':
        addPrimitive('sphere');
        break;
      case 'add_cylinder':
        addPrimitive('cylinder');
        break;
      case 'add_plane':
        addPrimitive('plane');
        break;
      case 'camera_toggle_projection': {
        const nextProjection = projectionModeRef.current === 'orthographic'
          ? 'perspective'
          : 'orthographic';
        setProjectionMode(nextProjection);
        saveCameraFromRuntime();
        break;
      }
      case 'camera_view_top':
      case 'camera_view_front':
      case 'camera_view_right': {
        const presetId = actionId.replace('camera_view_', '');
        if (isCameraPresetId(presetId)) {
          applyCameraPreset(presetId);
        }
        break;
      }
      case 'camera_reset':
        resetCameraView();
        break;
      case 'scene_toggle_mode':
        toggleMode();
        break;
      case 'scene_toggle_snap':
        toggleSnap();
        break;
      case 'object_duplicate':
        duplicateSelected();
        break;
      case 'object_delete':
        deleteSelected();
        break;
      case 'object_toggle_physics':
        if (selectedObject) {
          setObjectPhysicsEnabled(selectedObject.id, !selectedObject.physicsEnabled);
        }
        break;
      case 'inspector_toggle_visibility':
        setInspectorWindowVisible((prev) => !prev);
        break;
      case 'inspector_collapse_all':
        setAllInspectorSections(false);
        break;
      case 'inspector_expand_all':
        setAllInspectorSections(true);
        break;
      default:
        break;
    }
    closeViewportMenu();
  }, [
    addPrimitive,
    applyCameraPreset,
    closeViewportMenu,
    deleteSelected,
    duplicateSelected,
    resetCameraView,
    saveCameraFromRuntime,
    selectedObject,
    setAllInspectorSections,
    setObjectPhysicsEnabled,
    setProjectionMode,
    toggleMode,
    toggleSnap,
  ]);

  const syncEntryBodyFromMeshWorld = useCallback((entry: RuntimeObjectEntry) => {
    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    entry.mesh.updateMatrixWorld(true);
    entry.mesh.getWorldPosition(worldPosition);
    entry.mesh.getWorldQuaternion(worldQuaternion);
    entry.body.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
    entry.body.quaternion.set(worldQuaternion.x, worldQuaternion.y, worldQuaternion.z, worldQuaternion.w);
    entry.body.velocity.set(0, 0, 0);
    entry.body.angularVelocity.set(0, 0, 0);
  }, []);

  const syncEntryBaseFromBodyWorld = useCallback((entry: RuntimeObjectEntry) => {
    const worldPosition = new THREE.Vector3(
      entry.body.position.x,
      entry.body.position.y,
      entry.body.position.z
    );
    const worldQuaternion = new THREE.Quaternion(
      entry.body.quaternion.x,
      entry.body.quaternion.y,
      entry.body.quaternion.z,
      entry.body.quaternion.w
    );
    const parentQuaternion = new THREE.Quaternion();
    const localQuaternion = new THREE.Quaternion();

    const meshParent = entry.mesh.parent;
    if (meshParent) {
      meshParent.updateMatrixWorld(true);
      entry.mesh.position.copy(worldPosition);
      meshParent.worldToLocal(entry.mesh.position);
      meshParent.getWorldQuaternion(parentQuaternion);
      localQuaternion.copy(parentQuaternion).invert();
      localQuaternion.multiply(worldQuaternion);
      entry.mesh.quaternion.copy(localQuaternion);
    } else {
      entry.mesh.position.copy(worldPosition);
      entry.mesh.quaternion.copy(worldQuaternion);
    }

    entry.base.position.copy(entry.mesh.position);
    entry.base.rotation.set(entry.mesh.rotation.x, entry.mesh.rotation.y, entry.mesh.rotation.z);
    entry.mesh.scale.copy(entry.base.scale);
  }, []);

  useEffect(() => {
    modeRef.current = editorMode;
  }, [editorMode]);

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);

  useEffect(() => {
    projectionModeRef.current = cameraState.projectionMode;
  }, [cameraState.projectionMode]);

  useEffect(() => {
    objectPhysicsRef.current = new Map(objects.map((object) => [object.id, object.physicsEnabled]));
  }, [objects]);

  useEffect(() => {
    setHierarchyCollapsedIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(objects.map((object) => object.id));
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (validIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [objects]);

  useEffect(() => {
    if (!hierarchyDragObjectId) return;
    if (objects.some((object) => object.id === hierarchyDragObjectId)) return;
    clearHierarchyDragState();
  }, [clearHierarchyDragState, hierarchyDragObjectId, objects]);

  useEffect(() => {
    if (hierarchyDragObjectId || hierarchyDropTargetId == null) return;
    setHierarchyDropTargetId(null);
  }, [hierarchyDragObjectId, hierarchyDropTargetId]);

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
    const engine = engineRef.current;
    if (!engine) return;
    engine.grid.visible = showGrid;
    engine.axes.visible = showAxes;
    engine.renderer.render(engine.scene, engine.camera);
  }, [showAxes, showGrid]);

  useEffect(() => {
    const mount = canvasHostRef.current;
    const container = rootRef.current;
    if (!mount || !container) return;

    const palette = getThirdThemePalette(resolvedTheme);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(palette.background);

    const perspectiveCamera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);
    perspectiveCamera.position.set(
      cameraState.position.x,
      cameraState.position.y,
      cameraState.position.z
    );

    const orthographicCamera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 400);
    orthographicCamera.position.set(
      cameraState.position.x,
      cameraState.position.y,
      cameraState.position.z
    );
    orthographicCamera.zoom = 1;
    updateOrthographicBounds(orthographicCamera, container.clientWidth, container.clientHeight);

    const initialProjectionMode: ThirdProjectionMode = cameraState.projectionMode === 'orthographic'
      ? 'orthographic'
      : 'perspective';
    projectionModeRef.current = initialProjectionMode;
    const initialCamera = initialProjectionMode === 'orthographic'
      ? orthographicCamera
      : perspectiveCamera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = styles.canvas;
    renderer.domElement.style.touchAction = 'none';
    mount.appendChild(renderer.domElement);

    const grid = new THREE.GridHelper(48, 48, palette.grid, palette.grid);
    const initialGridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    initialGridMaterials.forEach((material) => {
      material.transparent = true;
      material.opacity = palette.gridOpacity;
    });
    grid.visible = showGrid;
    scene.add(grid);

    const axes = new THREE.AxesHelper(3);
    axes.visible = showAxes;
    scene.add(axes);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.62);
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.58);
    keyLight.position.set(4.5, 6.2, 3.4);
    scene.add(ambientLight);
    scene.add(keyLight);

    const orbit = new OrbitControls(initialCamera, renderer.domElement);
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

    const transform = new TransformControls(initialCamera, renderer.domElement);
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
      perspectiveCamera,
      orthographicCamera,
      camera: initialCamera,
      projectionMode: initialProjectionMode,
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
    const meshWorldPosition = new THREE.Vector3();
    const meshWorldQuaternion = new THREE.Quaternion();
    const bodyWorldQuaternion = new THREE.Quaternion();
    const parentWorldQuaternion = new THREE.Quaternion();
    const localQuaternion = new THREE.Quaternion();
    let physicsAccumulator = 0;
    let elapsedSeconds = 0;

    const syncMeshFromBase = (entry: RuntimeObjectEntry) => {
      entry.mesh.position.copy(entry.base.position);
      entry.mesh.rotation.set(entry.base.rotation.x, entry.base.rotation.y, entry.base.rotation.z);
      entry.mesh.scale.copy(entry.base.scale);
    };

    const syncBodyFromMeshWorld = (entry: RuntimeObjectEntry) => {
      entry.mesh.updateMatrixWorld(true);
      entry.mesh.getWorldPosition(meshWorldPosition);
      entry.mesh.getWorldQuaternion(meshWorldQuaternion);
      entry.body.position.set(meshWorldPosition.x, meshWorldPosition.y, meshWorldPosition.z);
      entry.body.quaternion.set(
        meshWorldQuaternion.x,
        meshWorldQuaternion.y,
        meshWorldQuaternion.z,
        meshWorldQuaternion.w
      );
      entry.body.velocity.set(0, 0, 0);
      entry.body.angularVelocity.set(0, 0, 0);
    };

    const syncBaseFromMesh = (entry: RuntimeObjectEntry) => {
      entry.base.position.copy(entry.mesh.position);
      entry.base.rotation.set(entry.mesh.rotation.x, entry.mesh.rotation.y, entry.mesh.rotation.z);
      entry.base.scale.copy(entry.mesh.scale);
      syncBodyFromMeshWorld(entry);
    };

    const syncBaseFromBody = (entry: RuntimeObjectEntry) => {
      meshWorldPosition.set(entry.body.position.x, entry.body.position.y, entry.body.position.z);
      bodyWorldQuaternion.set(
        entry.body.quaternion.x,
        entry.body.quaternion.y,
        entry.body.quaternion.z,
        entry.body.quaternion.w
      );

      const meshParent = entry.mesh.parent;
      if (meshParent && meshParent !== scene) {
        meshParent.updateMatrixWorld(true);
        entry.mesh.position.copy(meshWorldPosition);
        meshParent.worldToLocal(entry.mesh.position);
        meshParent.getWorldQuaternion(parentWorldQuaternion);
        localQuaternion.copy(parentWorldQuaternion).invert();
        localQuaternion.multiply(bodyWorldQuaternion);
        entry.mesh.quaternion.copy(localQuaternion);
      } else {
        entry.mesh.position.copy(meshWorldPosition);
        entry.mesh.quaternion.copy(bodyWorldQuaternion);
      }

      entry.base.position.copy(entry.mesh.position);
      entry.base.rotation.set(entry.mesh.rotation.x, entry.mesh.rotation.y, entry.mesh.rotation.z);
      entry.mesh.rotation.set(entry.base.rotation.x, entry.base.rotation.y, entry.base.rotation.z);
      entry.mesh.scale.copy(entry.base.scale);
    };

    const shouldObjectSimulate = (id: string): boolean => (
      modeRef.current === 'play'
      && (objectPhysicsRef.current.get(id) ?? false)
    );

    const applyBodySimulationMode = (entry: RuntimeObjectEntry) => {
      if (shouldObjectSimulate(entry.id)) {
        if (entry.body.type !== CANNON.Body.DYNAMIC) {
          syncMeshFromBase(entry);
          syncBodyFromMeshWorld(entry);
          entry.body.type = CANNON.Body.DYNAMIC;
          entry.body.mass = 1;
          entry.body.updateMassProperties();
          entry.body.wakeUp();
        }
        return;
      }
      syncMeshFromBase(entry);
      if (entry.body.type !== CANNON.Body.STATIC) {
        entry.body.type = CANNON.Body.STATIC;
        entry.body.mass = 0;
        entry.body.updateMassProperties();
      }
      syncBodyFromMeshWorld(entry);
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
      raycaster.setFromCamera(pointerNdc, engine.camera);
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
      raycaster.setFromCamera(pointerNdc, engine.camera);
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
        depth: engine.camera.position.distanceTo(args.hitPoint),
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
          position: vec3FromThree(engine.camera.position),
          target: vec3FromThree(orbit.target),
          projectionMode: engine.projectionMode,
        });
        cameraSaveTimerRef.current = null;
      }, CAMERA_SAVE_DEBOUNCE_MS);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        engine.touchPointers.add(event.pointerId);
      }

      if (event.button === 2 && event.pointerType !== 'touch') {
        rightClickCandidateRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
        };
      }

      if (modeRef.current === 'edit') {
        if (event.button === 2 && event.pointerType !== 'touch') return;
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
      const rightClickCandidate = rightClickCandidateRef.current;
      if (rightClickCandidate && rightClickCandidate.pointerId === event.pointerId) {
        const distance = Math.hypot(
          event.clientX - rightClickCandidate.startX,
          event.clientY - rightClickCandidate.startY
        );
        if (distance > RIGHT_CLICK_OPEN_TOLERANCE_PX) {
          rightClickCandidate.moved = true;
        }
      }

      const activeGrab = engine.activeGrab;
      if (!activeGrab || activeGrab.pointerId !== event.pointerId) return;
      moveGrabTarget(event.clientX, event.clientY);
    };

    const onPointerUpOrCancel = (event: PointerEvent) => {
      const rightClickCandidate = rightClickCandidateRef.current;
      if (rightClickCandidate && rightClickCandidate.pointerId === event.pointerId) {
        rightClickCandidateRef.current = null;
        if (event.pointerType !== 'touch' && event.button === 2 && !rightClickCandidate.moved) {
          const picked = pickObject(event.clientX, event.clientY);
          if (picked) {
            selectObject(picked.id);
            selectionIdRef.current = picked.id;
            updateTransformAttachment();
          }
          openViewportMenu(event.clientX, event.clientY);
        }
      }

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

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (width <= 0 || height <= 0) return;
      engine.perspectiveCamera.aspect = width / height;
      engine.perspectiveCamera.updateProjectionMatrix();
      updateOrthographicBounds(engine.orthographicCamera, width, height);
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
    renderer.domElement.addEventListener('contextmenu', onContextMenu);

    const animate = () => {
      rafRef.current = window.requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      elapsedSeconds += delta;
      engine.orbit.update();

      if (modeRef.current === 'play') {
        engine.entries.forEach((entry) => applyBodySimulationMode(entry));
        physicsAccumulator += delta;
        while (physicsAccumulator >= FIXED_TIMESTEP_SECONDS) {
          engine.world.step(FIXED_TIMESTEP_SECONDS, FIXED_TIMESTEP_SECONDS, MAX_PHYSICS_SUBSTEPS);
          physicsAccumulator -= FIXED_TIMESTEP_SECONDS;
        }

        const updatedIds = new Set<string>();
        engine.entries.forEach((entry) => {
          if (!shouldObjectSimulate(entry.id)) {
            syncMeshFromBase(entry);
            syncBodyFromMeshWorld(entry);
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
        engine.entries.forEach((entry) => {
          applyPresetAnimation(entry.animationPreset, elapsedSeconds, entry.mesh, entry.base);
        });
      }

      renderer.render(scene, engine.camera);
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
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);

      engine.entries.forEach((entry) => {
        engine.world.removeBody(entry.body);
        entry.geometry.dispose();
        entry.material.dispose();
        entry.mesh.removeFromParent();
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

    const palette = getThirdThemePalette(resolvedTheme);
    engine.scene.background = new THREE.Color(palette.background);
    const gridMaterials = Array.isArray(engine.grid.material)
      ? engine.grid.material
      : [engine.grid.material];
    gridMaterials.forEach((material) => {
      if (!('color' in material)) return;
      (material as THREE.Material & { color: THREE.Color }).color.setHex(palette.grid);
      material.transparent = true;
      material.opacity = palette.gridOpacity;
    });
    engine.renderer.render(engine.scene, engine.camera);
  }, [resolvedTheme]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const palette = getThirdThemePalette(resolvedTheme);
    const nextIds = new Set(objects.map((object) => object.id));
    const meshWorldPosition = new THREE.Vector3();
    const meshWorldQuaternion = new THREE.Quaternion();

    const syncMeshFromBase = (entry: RuntimeObjectEntry) => {
      entry.mesh.position.copy(entry.base.position);
      entry.mesh.rotation.set(entry.base.rotation.x, entry.base.rotation.y, entry.base.rotation.z);
      entry.mesh.scale.copy(entry.base.scale);
    };

    const syncBodyFromMeshWorld = (entry: RuntimeObjectEntry) => {
      entry.mesh.updateMatrixWorld(true);
      entry.mesh.getWorldPosition(meshWorldPosition);
      entry.mesh.getWorldQuaternion(meshWorldQuaternion);
      entry.body.position.set(meshWorldPosition.x, meshWorldPosition.y, meshWorldPosition.z);
      entry.body.quaternion.set(
        meshWorldQuaternion.x,
        meshWorldQuaternion.y,
        meshWorldQuaternion.z,
        meshWorldQuaternion.w
      );
      entry.body.velocity.set(0, 0, 0);
      entry.body.angularVelocity.set(0, 0, 0);
    };

    engine.entries.forEach((entry, id) => {
      if (nextIds.has(id)) return;
      if (engine.transform.object === entry.mesh) {
        engine.transform.detach();
      }
      engine.world.removeBody(entry.body);
      entry.mesh.removeFromParent();
      entry.geometry.dispose();
      entry.material.dispose();
      engine.entries.delete(id);
    });

    objects.forEach((object) => {
      const existing = engine.entries.get(object.id);
      const shapeKey = toShapeKey(object);
      if (!existing) {
        const geometry = createGeometry(object.type);
        const material = new THREE.MeshPhongMaterial();
        applyMaterialParams(material, object.material, palette.materialDefault);
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
      applyMaterialParams(existing.material, object.material, palette.materialDefault);

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
    });

    objects.forEach((object) => {
      const entry = engine.entries.get(object.id);
      if (!entry) return;
      const parentEntry = object.parentId ? engine.entries.get(object.parentId) : null;
      const desiredParent = parentEntry && parentEntry.id !== object.id
        ? parentEntry.mesh
        : engine.scene;
      if (entry.mesh.parent !== desiredParent) {
        desiredParent.add(entry.mesh);
      }
    });

    objects.forEach((object) => {
      const entry = engine.entries.get(object.id);
      if (!entry) return;
      const shouldSimulate = modeRef.current === 'play' && object.physicsEnabled;
      if (!shouldSimulate) {
        syncMeshFromBase(entry);
      }
    });
    engine.scene.updateMatrixWorld(true);

    objects.forEach((object) => {
      const entry = engine.entries.get(object.id);
      if (!entry) return;

      const shouldSimulate = modeRef.current === 'play' && object.physicsEnabled;
      if (shouldSimulate) {
        if (entry.body.type !== CANNON.Body.DYNAMIC) {
          syncMeshFromBase(entry);
          syncBodyFromMeshWorld(entry);
          entry.body.type = CANNON.Body.DYNAMIC;
          entry.body.mass = 1;
          entry.body.updateMassProperties();
          entry.body.wakeUp();
        }
        return;
      }

      if (entry.body.type !== CANNON.Body.STATIC) {
        entry.body.type = CANNON.Body.STATIC;
        entry.body.mass = 0;
        entry.body.updateMassProperties();
      }
      syncBodyFromMeshWorld(entry);
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
    if (editorMode !== 'edit') return;

    releaseGrabRef.current();
    const updatedIds = new Set<string>();
    engine.entries.forEach((entry) => {
      syncEntryBaseFromBodyWorld(entry);
      entry.body.type = CANNON.Body.STATIC;
      entry.body.mass = 0;
      entry.body.updateMassProperties();
      syncEntryBodyFromMeshWorld(entry);
      updatedIds.add(entry.id);
    });
    commitRuntimeRef.current(updatedIds);
    forceSave();
  }, [editorMode, forceSave, syncEntryBaseFromBodyWorld, syncEntryBodyFromMeshWorld]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (editorMode !== 'play') return;
    const activeGrab = engine.activeGrab;
    if (!activeGrab) return;

    const grabbedObject = objects.find((object) => object.id === activeGrab.objectId);
    if (grabbedObject?.physicsEnabled) return;

    releaseGrabRef.current(activeGrab.pointerId);
    const entry = engine.entries.get(activeGrab.objectId);
    if (entry) {
      syncEntryBaseFromBodyWorld(entry);
      entry.body.type = CANNON.Body.STATIC;
      entry.body.mass = 0;
      entry.body.updateMassProperties();
      syncEntryBodyFromMeshWorld(entry);
      commitRuntimeRef.current(new Set([activeGrab.objectId]));
      forceSave();
    }
  }, [editorMode, forceSave, objects, syncEntryBaseFromBodyWorld, syncEntryBodyFromMeshWorld]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const nextProjectionMode: ThirdProjectionMode = cameraState.projectionMode === 'orthographic'
      ? 'orthographic'
      : 'perspective';

    if (engine.projectionMode !== nextProjectionMode) {
      setProjectionMode(nextProjectionMode);
    }

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
    engine.perspectiveCamera.position.copy(engine.camera.position);
    engine.orthographicCamera.position.copy(engine.camera.position);
    engine.orbit.target.set(
      cameraState.target.x,
      cameraState.target.y,
      cameraState.target.z
    );
    engine.orbit.update();
  }, [cameraState, setProjectionMode]);

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
      if (key === 'f2') {
        if (selectionIdRef.current) {
          event.preventDefault();
          startRenameObject(selectionIdRef.current);
        }
        return;
      }
      if (key === 'w') setTransformMode('translate');
      if (key === 'r') setTransformMode('rotate');
      if (key === 's') setTransformMode('scale');
      if (key === 'g') toggleSnap();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editorMode, setTransformMode, startRenameObject, toggleSnap]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const actionId = resolveThirdCameraHotkey({
        code: event.code,
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        hasSelection: selectionIdRef.current != null,
        targetTagName: target?.tagName,
        targetIsContentEditable: target?.isContentEditable,
      });
      if (!actionId) return;

      event.preventDefault();
      switch (actionId) {
        case 'camera_focus_selected': {
          const selectedId = selectionIdRef.current;
          if (selectedId) {
            focusObjectInCamera(selectedId);
          }
          break;
        }
        case 'camera_view_front':
          applyCameraPreset('front');
          break;
        case 'camera_view_right':
          applyCameraPreset('right');
          break;
        case 'camera_view_top':
          applyCameraPreset('top');
          break;
        case 'camera_toggle_projection': {
          const nextProjectionMode: ThirdProjectionMode = projectionModeRef.current === 'orthographic'
            ? 'perspective'
            : 'orthographic';
          setProjectionMode(nextProjectionMode);
          saveCameraFromRuntime();
          break;
        }
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [applyCameraPreset, focusObjectInCamera, saveCameraFromRuntime, setProjectionMode]);

  useEffect(() => {
    if (!viewportMenu) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && viewportMenuRef.current?.contains(target)) return;
      closeViewportMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeViewportMenu();
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeViewportMenu, viewportMenu]);

  useEffect(() => {
    if (!hierarchyMenu) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && hierarchyMenuRef.current?.contains(target)) return;
      closeHierarchyMenu();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeHierarchyMenu();
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeHierarchyMenu, hierarchyMenu]);

  useEffect(() => {
    if (!hierarchyMenu) return;
    if (sceneWindowVisible) return;
    closeHierarchyMenu();
  }, [closeHierarchyMenu, hierarchyMenu, sceneWindowVisible]);

  useEffect(() => {
    if (!hierarchyMenu) return;
    if (hierarchyMenu.context !== 'object') return;
    if (hierarchyMenu.objectId && objects.some((object) => object.id === hierarchyMenu.objectId)) return;
    closeHierarchyMenu();
  }, [closeHierarchyMenu, hierarchyMenu, objects]);

  useEffect(() => {
    if (!renamingObjectId) return;
    if (objects.some((object) => object.id === renamingObjectId)) return;
    cancelRenameObject();
  }, [cancelRenameObject, objects, renamingObjectId]);

  useEffect(() => {
    if (isEditMode) return;
    if (!renamingObjectId) return;
    cancelRenameObject();
  }, [cancelRenameObject, isEditMode, renamingObjectId]);

  useEffect(() => {
    if (!renamingObjectId) return;
    if (sceneWindowVisible) return;
    cancelRenameObject();
  }, [cancelRenameObject, renamingObjectId, sceneWindowVisible]);

  useEffect(() => {
    if (mobileUtilityPanel === 'scene' && !sceneWindowVisible && inspectorWindowVisible) {
      setMobileUtilityPanel('inspector');
      return;
    }
    if (mobileUtilityPanel === 'inspector' && !inspectorWindowVisible && sceneWindowVisible) {
      setMobileUtilityPanel('scene');
    }
  }, [inspectorWindowVisible, mobileUtilityPanel, sceneWindowVisible]);

  useEffect(() => {
    if (!renamingObjectId) return;
    const rafId = window.requestAnimationFrame(() => {
      const input = renameInputRef.current;
      if (!input) return;
      input.focus();
      input.select();
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [renamingObjectId]);

  const renderHierarchyNodes = (nodes: HierarchyTreeNode[], depth: number): React.ReactNode => (
    nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      const nodeExpanded = !hierarchyCollapsedIds.has(node.object.id);
      const canDropHere = (
        isEditMode
        && hierarchyDragObjectId != null
        && canSetHierarchyParent(hierarchyDragObjectId, node.object.id)
      );
      const isDropTarget = hierarchyDropTargetId === node.object.id;
      const isRenaming = renamingObjectId === node.object.id;
      return (
        <React.Fragment key={node.object.id}>
          <div
            className={[
              styles.objectRow,
              canDropHere ? styles.objectRowDropHint : '',
              isDropTarget ? styles.objectRowDropTarget : '',
            ].join(' ').trim()}
            data-hierarchy-node="true"
            style={{ paddingLeft: `${depth * 12}px` }}
            onDragOver={(event) => {
              if (!isEditMode || !hierarchyDragObjectId || !canSetHierarchyParent(hierarchyDragObjectId, node.object.id)) {
                if (isDropTarget) {
                  setHierarchyDropTargetId(null);
                }
                return;
              }
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setHierarchyDropTargetId(node.object.id);
            }}
            onDragLeave={() => {
              if (isDropTarget) {
                setHierarchyDropTargetId(null);
              }
            }}
            onDrop={(event) => {
              if (!isEditMode || !hierarchyDragObjectId || !canSetHierarchyParent(hierarchyDragObjectId, node.object.id)) return;
              event.preventDefault();
              dropHierarchyParent(node.object.id);
              clearHierarchyDragState();
            }}
          >
            {hasChildren ? (
              <button
                type="button"
                className={styles.hierarchyNodeToggle}
                aria-label={`${nodeExpanded ? 'Collapse' : 'Expand'} ${node.object.name}`}
                onClick={() => toggleHierarchyNode(node.object.id)}
              >
                {nodeExpanded ? '▾' : '▸'}
              </button>
            ) : (
              <span className={styles.hierarchyNodeSpacer} aria-hidden="true" />
            )}
            {isRenaming ? (
              <input
                ref={renameInputRef}
                type="text"
                className={`${styles.objectItem} ${styles.hierarchyItem} ${styles.objectNameInput}`.trim()}
                value={renameDraft}
                maxLength={THIRD_MAX_OBJECT_NAME_LENGTH}
                onChange={(event) => setRenameDraft(event.target.value)}
                onBlur={commitRenameObject}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitRenameObject();
                    return;
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelRenameObject();
                  }
                }}
                aria-label={`Rename ${node.object.name}`}
              />
            ) : (
              <button
                type="button"
                className={`${styles.objectItem} ${styles.hierarchyItem} ${selectionId === node.object.id ? styles.objectItemActive : ''}`.trim()}
                onClick={() => {
                  selectObject(node.object.id);
                  closeHierarchyMenu();
                }}
                onDoubleClick={() => {
                  selectObject(node.object.id);
                  closeHierarchyMenu();
                  focusObjectInCamera(node.object.id);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  openHierarchyMenuForObject({
                    objectId: node.object.id,
                    clientX: event.clientX,
                    clientY: event.clientY,
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
                  event.preventDefault();
                  const rect = event.currentTarget.getBoundingClientRect();
                  openHierarchyMenuForObject({
                    objectId: node.object.id,
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                  });
                }}
                draggable={isEditMode && renamingObjectId == null}
                onDragStart={(event) => {
                  if (!isEditMode || renamingObjectId != null) return;
                  event.dataTransfer.effectAllowed = 'move';
                  event.dataTransfer.setData('text/plain', node.object.id);
                  setHierarchyDragObjectId(node.object.id);
                  setHierarchyDropTargetId(null);
                }}
                onDragEnd={clearHierarchyDragState}
              >
                {node.object.name}
              </button>
            )}
            <span className={styles.objectMeta}>
              {`${node.object.type.toUpperCase()} · ${node.object.physicsEnabled ? 'PHYS' : 'STATIC'}`}
            </span>
          </div>
          {hasChildren && nodeExpanded ? renderHierarchyNodes(node.children, depth + 1) : null}
        </React.Fragment>
      );
    })
  );

  const renderScenePanel = (options: { mobile?: boolean } = {}): React.ReactNode => (
    <section className={`${styles.utilityPanel} ${options.mobile ? styles.mobilePanel : ''}`.trim()}>
      <header className={styles.utilityHeader}>
        <div className={styles.utilityHeaderMeta}>
          <p className={styles.utilityTitle}>SCENE</p>
          <span className={styles.utilitySubtle}>{`${objects.length} OBJECTS`}</span>
        </div>
        <button
          type="button"
          className={styles.toolBtn}
          onClick={() => setSceneWindowVisible(false)}
        >
          HIDE
        </button>
      </header>
      <div className={styles.utilityBody}>
        <span className={styles.inlineStatus}>OBJECT ACTIONS VIA HIERARCHY CONTEXT MENU.</span>
        <div
          className={styles.objectList}
          aria-label="THIRD object hierarchy"
          tabIndex={0}
          onContextMenu={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-hierarchy-node="true"]')) return;
            event.preventDefault();
            event.stopPropagation();
            openHierarchyMenuForScene({
              clientX: event.clientX,
              clientY: event.clientY,
            });
          }}
          onKeyDown={(event) => {
            if (event.defaultPrevented) return;
            if (event.target !== event.currentTarget) return;
            if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            openHierarchyMenuForScene({
              clientX: rect.left + rect.width * 0.25,
              clientY: rect.top + 28,
            });
          }}
        >
          <button
            type="button"
            className={[
              styles.hierarchyRoot,
              (isEditMode && hierarchyDragObjectId && canSetHierarchyParent(hierarchyDragObjectId, null))
                ? styles.hierarchyRootDropHint
                : '',
              hierarchyDropTargetId === HIERARCHY_ROOT_DROP_TARGET ? styles.objectRowDropTarget : '',
            ].join(' ').trim()}
            aria-expanded={hierarchyExpanded}
            onClick={() => setHierarchyExpanded((prev) => !prev)}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openHierarchyMenuForScene({
                clientX: event.clientX,
                clientY: event.clientY,
              });
            }}
            onKeyDown={(event) => {
              if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              openHierarchyMenuForScene({
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
              });
            }}
            onDragOver={(event) => {
              if (!isEditMode || !hierarchyDragObjectId || !canSetHierarchyParent(hierarchyDragObjectId, null)) {
                if (hierarchyDropTargetId === HIERARCHY_ROOT_DROP_TARGET) {
                  setHierarchyDropTargetId(null);
                }
                return;
              }
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setHierarchyDropTargetId(HIERARCHY_ROOT_DROP_TARGET);
            }}
            onDragLeave={() => {
              if (hierarchyDropTargetId === HIERARCHY_ROOT_DROP_TARGET) {
                setHierarchyDropTargetId(null);
              }
            }}
            onDrop={(event) => {
              if (!isEditMode || !hierarchyDragObjectId || !canSetHierarchyParent(hierarchyDragObjectId, null)) return;
              event.preventDefault();
              dropHierarchyParent(null);
              clearHierarchyDragState();
            }}
          >
            SCENE ({objects.length})
          </button>
          {hierarchyExpanded ? (
            <div className={styles.hierarchyChildren}>
              {renderHierarchyNodes(hierarchyTree, 0)}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );

  const renderInspectorPanel = (options: { mobile?: boolean } = {}): React.ReactNode => (
    <section className={`${styles.utilityPanel} ${options.mobile ? styles.mobilePanel : ''}`.trim()}>
      <header className={styles.utilityHeader}>
        <div className={styles.utilityHeaderMeta}>
          <p className={styles.utilityTitle}>INSPECTOR</p>
          <span className={`${styles.editTag} ${isEditMode ? styles.editTagActive : ''}`.trim()}>
            {isEditMode ? 'EDIT' : 'PLAY'}
          </span>
          <span className={styles.inspectorObjectName}>{selectedObject?.name ?? 'NO SELECTION'}</span>
        </div>
        <div className={styles.utilityHeaderActions}>
          <button type="button" className={styles.toolBtn} onClick={() => setAllInspectorSections(false)}>
            COLLAPSE
          </button>
          <button type="button" className={styles.toolBtn} onClick={() => setAllInspectorSections(true)}>
            EXPAND
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => setInspectorWindowVisible(false)}
          >
            HIDE
          </button>
        </div>
      </header>

      <div className={styles.utilityBody}>
        <section className={styles.inspectorSection}>
          <button
            type="button"
            className={styles.inspectorSectionToggle}
            onClick={() => toggleInspectorSection('transform')}
            aria-expanded={inspectorSections.transform}
          >
            TRANSFORM
          </button>
          {inspectorSections.transform ? (
            selectedObject ? (
              isEditMode ? (
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
                <p className={styles.inspectorEmpty}>TRANSFORM FIELDS ARE READ-ONLY WHILE IN PLAY MODE.</p>
              )
            ) : (
              <p className={styles.inspectorEmpty}>SELECT AN OBJECT TO EDIT TRANSFORM.</p>
            )
          ) : null}
        </section>

        <section className={styles.inspectorSection}>
          <button
            type="button"
            className={styles.inspectorSectionToggle}
            onClick={() => toggleInspectorSection('camera')}
            aria-expanded={inspectorSections.camera}
          >
            CAMERA
          </button>
          {inspectorSections.camera ? (
            <div className={styles.inspectorSectionBody}>
              <div className={`${styles.toolRow} ${styles.toolRowThirds}`.trim()}>
                <button type="button" className={styles.toolBtn} onClick={() => applyCameraPreset('top')}>
                  TOP
                </button>
                <button type="button" className={styles.toolBtn} onClick={() => applyCameraPreset('front')}>
                  FRONT
                </button>
                <button type="button" className={styles.toolBtn} onClick={() => applyCameraPreset('right')}>
                  RIGHT
                </button>
              </div>
              <div className={styles.toolRow}>
                <button
                  type="button"
                  className={styles.toolBtn}
                  onClick={() => {
                    const nextMode: ThirdProjectionMode = cameraState.projectionMode === 'orthographic'
                      ? 'perspective'
                      : 'orthographic';
                    setProjectionMode(nextMode);
                    saveCameraFromRuntime();
                  }}
                >
                  {projectionLabel(cameraState.projectionMode)}
                </button>
                <button type="button" className={styles.toolBtn} onClick={resetCameraView}>
                  RESET
                </button>
              </div>
              <span className={styles.inlineStatus}>RMB VIEWPORT MENU HAS THE SAME CAMERA ACTIONS.</span>
            </div>
          ) : null}
        </section>

        <section className={styles.inspectorSection}>
          <button
            type="button"
            className={styles.inspectorSectionToggle}
            onClick={() => toggleInspectorSection('animation')}
            aria-expanded={inspectorSections.animation}
          >
            ANIMATION
          </button>
          {inspectorSections.animation ? (
            <div className={styles.inspectorSectionBody}>
              <div className={styles.toolRow}>
                <button
                  type="button"
                  className={`${styles.toolBtn} ${selectedObject?.animationPreset === 'none' ? styles.toolBtnActive : ''}`.trim()}
                  onClick={() => selectionId && setObjectAnimationPreset(selectionId, 'none')}
                  disabled={!selectionId || !isEditMode}
                >
                  NONE
                </button>
                <button
                  type="button"
                  className={`${styles.toolBtn} ${selectedObject?.animationPreset === 'bounce' ? styles.toolBtnActive : ''}`.trim()}
                  onClick={() => selectionId && setObjectAnimationPreset(selectionId, 'bounce')}
                  disabled={!selectionId || !isEditMode}
                >
                  BOUNCE
                </button>
                <button
                  type="button"
                  className={`${styles.toolBtn} ${selectedObject?.animationPreset === 'rotate' ? styles.toolBtnActive : ''}`.trim()}
                  onClick={() => selectionId && setObjectAnimationPreset(selectionId, 'rotate')}
                  disabled={!selectionId || !isEditMode}
                >
                  ROTATE
                </button>
                <button
                  type="button"
                  className={`${styles.toolBtn} ${selectedObject?.animationPreset === 'pulse' ? styles.toolBtnActive : ''}`.trim()}
                  onClick={() => selectionId && setObjectAnimationPreset(selectionId, 'pulse')}
                  disabled={!selectionId || !isEditMode}
                >
                  PULSE
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className={styles.inspectorSection}>
          <button
            type="button"
            className={styles.inspectorSectionToggle}
            onClick={() => toggleInspectorSection('physics')}
            aria-expanded={inspectorSections.physics}
          >
            PHYSICS
          </button>
          {inspectorSections.physics ? (
            <div className={styles.inspectorSectionBody}>
              <button
                type="button"
                className={`${styles.objectPhysicsBtn} ${selectedObject?.physicsEnabled ? styles.objectPhysicsBtnActive : ''}`.trim()}
                onClick={() => selectedObject && setObjectPhysicsEnabled(selectedObject.id, !selectedObject.physicsEnabled)}
                disabled={!selectedObject}
              >
                {selectedObject?.physicsEnabled ? 'REMOVE PHYSICS' : 'ADD PHYSICS'}
              </button>
              <p className={styles.inspectorEmpty}>
                PLAY GRAB/SIM REQUIRES OBJECT PHYSICS ON.
              </p>
            </div>
          ) : null}
        </section>

        <section className={styles.inspectorSection}>
          <button
            type="button"
            className={styles.inspectorSectionToggle}
            onClick={() => toggleInspectorSection('material')}
            aria-expanded={inspectorSections.material}
          >
            MATERIAL
          </button>
          {inspectorSections.material ? (
            <div className={styles.inspectorSectionBody}>
              <div className={styles.toolRow}>
                {MATERIAL_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`${styles.toolBtn} ${selectedObject?.material.preset === preset ? styles.toolBtnActive : ''}`.trim()}
                    onClick={() => selectionId && setObjectMaterialPreset(selectionId, preset)}
                    disabled={!selectionId || !isEditMode}
                  >
                    {preset.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className={styles.materialSwatchRow} role="group" aria-label="Material color swatches">
                {MATERIAL_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    className={`${styles.materialSwatch} ${selectedObject?.material.color.toLowerCase() === swatch ? styles.materialSwatchActive : ''}`.trim()}
                    style={{ backgroundColor: swatch }}
                    onClick={() => selectionId && setObjectMaterialColor(selectionId, swatch)}
                    disabled={!selectionId || !isEditMode}
                    aria-label={`Set material color ${swatch}`}
                    title={swatch}
                  />
                ))}
              </div>
              <div className={styles.toolRow}>
                <label className={styles.materialColorLabel}>
                  COLOR
                  <input
                    type="color"
                    className={styles.materialColorInput}
                    value={selectedObject?.material.color ?? '#00ff66'}
                    onChange={(event) => selectionId && setObjectMaterialColor(selectionId, event.target.value)}
                    disabled={!selectionId || !isEditMode}
                    aria-label="Material custom color"
                  />
                </label>
                <button
                  type="button"
                  className={`${styles.toolBtn} ${selectedObject?.material.wireframe ? styles.toolBtnActive : ''}`.trim()}
                  onClick={() => selectedObject && setObjectMaterialWireframe(selectedObject.id, !selectedObject.material.wireframe)}
                  disabled={!selectedObject || !isEditMode}
                >
                  WIREFRAME: {selectedObject?.material.wireframe ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  );

  const anyUtilityWindowVisible = sceneWindowVisible || inspectorWindowVisible;

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${mode === 'fullscreen' ? styles.rootFullscreen : ''}`.trim()}
      data-context-ignore="true"
    >
      <div ref={canvasHostRef} className={styles.canvasHost} />

      {viewportMenu ? (
        <div
          ref={viewportMenuRef}
          className={styles.viewportMenu}
          style={{ left: `${viewportMenu.x}px`, top: `${viewportMenu.y}px` }}
          role="menu"
          aria-label="THIRD viewport menu"
        >
          {viewportMenuGroups.map((group) => {
            const open = viewportMenu.openGroupId === group.id;
            return (
              <div
                key={group.id}
                className={styles.viewportMenuGroup}
                onMouseEnter={() => setViewportMenu((prev) => (prev ? { ...prev, openGroupId: group.id } : prev))}
              >
                <button
                  type="button"
                  className={styles.viewportMenuGroupBtn}
                  onClick={() => toggleViewportGroup(group.id)}
                  aria-expanded={open}
                >
                  {group.label}
                </button>
                {open ? (
                  <div className={styles.viewportSubmenu} role="menu" aria-label={`${group.label} menu`}>
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.viewportMenuItem}
                        onClick={() => runViewportMenuAction(item.id)}
                        disabled={item.disabled}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {hierarchyMenu ? (
        <div
          ref={hierarchyMenuRef}
          className={styles.hierarchyMenu}
          style={{ left: `${hierarchyMenu.x}px`, top: `${hierarchyMenu.y}px` }}
          role="menu"
          aria-label="Hierarchy context menu"
        >
          {hierarchyMenuItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.hierarchyMenuItem}
              onClick={() => runHierarchyMenuAction(item.id)}
              disabled={item.disabled}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* TODO(THIRD mobile): Make top scene toolbar collapsible to recover viewport space on smaller screens. */}
      <div className={styles.sceneToolbar} role="toolbar" aria-label="THIRD scene toolbar">
        {sceneToolbarItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`${styles.sceneToolbarBtn} ${item.active ? styles.sceneToolbarBtnActive : ''}`.trim()}
            onClick={() => runSceneToolbarAction(item.id)}
            disabled={item.disabled}
            title={item.title}
            aria-label={item.title}
          >
            <span className={styles.sceneToolbarIcon}>{item.icon}</span>
          </button>
        ))}
      </div>

      {!sceneWindowVisible ? (
        <button
          type="button"
          className={`${styles.utilityRevealBtn} ${styles.sceneRevealBtn}`.trim()}
          onClick={() => {
            setSceneWindowVisible(true);
            setMobileUtilityPanel('scene');
          }}
        >
          SHOW SCENE
        </button>
      ) : null}

      {!inspectorWindowVisible ? (
        <button
          type="button"
          className={`${styles.utilityRevealBtn} ${styles.inspectorRevealBtn}`.trim()}
          onClick={() => {
            setInspectorWindowVisible(true);
            setMobileUtilityPanel('inspector');
          }}
        >
          SHOW INSPECTOR
        </button>
      ) : null}

      {sceneWindowVisible ? (
        <aside className={`${styles.sceneWindow} ${styles.desktopUtilityWindow}`.trim()} aria-label="THIRD scene window">
          {renderScenePanel()}
        </aside>
      ) : null}

      {inspectorWindowVisible ? (
        <aside className={`${styles.inspectorWindow} ${styles.desktopUtilityWindow}`.trim()} aria-label="THIRD inspector window">
          {renderInspectorPanel()}
        </aside>
      ) : null}

      {anyUtilityWindowVisible ? (
        <section className={styles.mobileUtilityDrawer} aria-label="THIRD mobile utility drawer">
          <div className={styles.mobileUtilityTabs} role="tablist" aria-label="THIRD utility panels">
            <button
              type="button"
              role="tab"
              aria-selected={mobileUtilityPanel === 'scene'}
              className={`${styles.mobileUtilityTab} ${mobileUtilityPanel === 'scene' ? styles.mobileUtilityTabActive : ''}`.trim()}
              onClick={() => setMobileUtilityPanel('scene')}
              disabled={!sceneWindowVisible}
            >
              SCENE
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mobileUtilityPanel === 'inspector'}
              className={`${styles.mobileUtilityTab} ${mobileUtilityPanel === 'inspector' ? styles.mobileUtilityTabActive : ''}`.trim()}
              onClick={() => setMobileUtilityPanel('inspector')}
              disabled={!inspectorWindowVisible}
            >
              INSPECTOR
            </button>
          </div>
          <div className={styles.mobileUtilityBody}>
            {mobileUtilityPanel === 'scene' && sceneWindowVisible ? renderScenePanel({ mobile: true }) : null}
            {mobileUtilityPanel === 'inspector' && inspectorWindowVisible ? renderInspectorPanel({ mobile: true }) : null}
          </div>
        </section>
      ) : (
        <button
          type="button"
          className={`${styles.utilityRevealBtn} ${styles.mobileRevealBtn}`.trim()}
          onClick={() => {
            setSceneWindowVisible(true);
            setInspectorWindowVisible(true);
            setMobileUtilityPanel('scene');
          }}
        >
          SHOW WINDOWS
        </button>
      )}
    </div>
  );
};

export default THIRD;
