import { describe, expect, it } from 'vitest';
import { sanitizePersistedThirdScene } from './storage';

describe('third storage sanitization', () => {
  it('accepts valid persisted scene payload', () => {
    const scene = sanitizePersistedThirdScene({
      version: 1,
      skyboxId: 'default',
      physicsEnabled: true,
      objects: [
        {
          id: 'cube_1',
          name: 'Cube 1',
          type: 'cube',
          parentId: null,
          transform: {
            position: { x: 0, y: 0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          material: {
            color: '#00ff66',
            wireframe: true,
            preset: 'neon',
          },
          physicsEnabled: true,
          animationPreset: 'bounce',
        },
      ],
      cameraState: {
        position: { x: 4, y: 4, z: 6 },
        target: { x: 0, y: 0.5, z: 0 },
        projectionMode: 'orthographic',
      },
    });

    expect(scene).not.toBeNull();
    if (!scene) return;
    expect(scene.version).toBe(1);
    expect(scene.physicsEnabled).toBe(true);
    expect(scene.objects).toHaveLength(1);
    expect(scene.objects[0].animationPreset).toBe('bounce');
    expect(scene.objects[0].physicsEnabled).toBe(true);
    expect(scene.objects[0].material.wireframe).toBe(true);
    expect(scene.objects[0].material.preset).toBe('neon');
    expect(scene.objects[0].parentId).toBeNull();
    expect(scene.cameraState?.projectionMode).toBe('orthographic');
  });

  it('drops invalid payloads', () => {
    expect(sanitizePersistedThirdScene(null)).toBeNull();
    expect(sanitizePersistedThirdScene({ version: 2, objects: [] })).toBeNull();
    expect(sanitizePersistedThirdScene({
      version: 1,
      objects: [{ bad: true }],
      skyboxId: 'default',
    })).toBeNull();
  });

  it('sanitizes unknown animation presets back to none', () => {
    const scene = sanitizePersistedThirdScene({
      version: 1,
      skyboxId: 'default',
      physicsEnabled: false,
      objects: [
        {
          id: 'obj_1',
          name: 'Sphere 1',
          type: 'sphere',
          transform: {
            position: { x: 1, y: 1, z: 1 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          physicsEnabled: false,
          animationPreset: 'spinny',
        },
      ],
    });

    expect(scene).not.toBeNull();
    if (!scene) return;
    expect(scene.objects[0].animationPreset).toBe('none');
  });

  it('defaults missing legacy physics fields to false', () => {
    const scene = sanitizePersistedThirdScene({
      version: 1,
      skyboxId: 'default',
      objects: [
        {
          id: 'obj_legacy',
          name: 'Legacy Cube',
          type: 'cube',
          transform: {
            position: { x: 0, y: 0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
        },
      ],
    });

    expect(scene).not.toBeNull();
    if (!scene) return;
    expect(scene.physicsEnabled).toBe(false);
    expect(scene.objects[0].physicsEnabled).toBe(false);
    expect(scene.objects[0].material.preset).toBe('matte');
    expect(scene.objects[0].material.wireframe).toBe(false);
    expect(scene.objects[0].parentId).toBeNull();
  });

  it('round-trips persisted global and object physics flags through JSON payload', () => {
    const rawPayload = {
      version: 1,
      skyboxId: 'default',
      physicsEnabled: true,
      objects: [
        {
          id: 'obj_rt',
          name: 'Roundtrip Cube',
          type: 'cube',
          parentId: 'obj_parent',
          transform: {
            position: { x: 0, y: 0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          material: {
            color: '#00ff66',
            wireframe: false,
            preset: 'glass',
          },
          physicsEnabled: true,
          animationPreset: 'none',
        },
      ],
      cameraState: {
        position: { x: 4, y: 4, z: 6 },
        target: { x: 0, y: 0.5, z: 0 },
        projectionMode: 'perspective',
      },
    };
    const restored = sanitizePersistedThirdScene(JSON.parse(JSON.stringify(rawPayload)));
    expect(restored).not.toBeNull();
    if (!restored) return;
    expect(restored.physicsEnabled).toBe(true);
    expect(restored.objects[0].physicsEnabled).toBe(true);
    expect(restored.objects[0].material.preset).toBe('glass');
    expect(restored.objects[0].material.wireframe).toBe(false);
    expect(restored.objects[0].parentId).toBe('obj_parent');
    expect(restored.cameraState?.projectionMode).toBe('perspective');
  });

  it('defaults missing legacy projection mode to perspective', () => {
    const scene = sanitizePersistedThirdScene({
      version: 1,
      skyboxId: 'default',
      physicsEnabled: false,
      objects: [
        {
          id: 'obj_cam',
          name: 'Camera Legacy Cube',
          type: 'cube',
          transform: {
            position: { x: 0, y: 0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          material: {
            color: '#00ff66',
            wireframe: false,
            preset: 'matte',
          },
          physicsEnabled: false,
          animationPreset: 'none',
        },
      ],
      cameraState: {
        position: { x: 3, y: 3, z: 3 },
        target: { x: 0, y: 0.5, z: 0 },
      },
    });

    expect(scene).not.toBeNull();
    if (!scene) return;
    expect(scene.cameraState?.projectionMode).toBe('perspective');
  });
});
