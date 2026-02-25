import { describe, expect, it } from 'vitest';
import { sanitizePersistedThirdScene } from './storage';

describe('third storage sanitization', () => {
  it('accepts valid persisted scene payload', () => {
    const scene = sanitizePersistedThirdScene({
      version: 1,
      skyboxId: 'default',
      objects: [
        {
          id: 'cube_1',
          name: 'Cube 1',
          type: 'cube',
          transform: {
            position: { x: 0, y: 0.5, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
          },
          material: {
            color: '#00ff66',
            wireframe: true,
          },
          animationPreset: 'bounce',
        },
      ],
      cameraState: {
        position: { x: 4, y: 4, z: 6 },
        target: { x: 0, y: 0.5, z: 0 },
      },
    });

    expect(scene).not.toBeNull();
    if (!scene) return;
    expect(scene.version).toBe(1);
    expect(scene.objects).toHaveLength(1);
    expect(scene.objects[0].animationPreset).toBe('bounce');
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
          animationPreset: 'spinny',
        },
      ],
    });

    expect(scene).not.toBeNull();
    if (!scene) return;
    expect(scene.objects[0].animationPreset).toBe('none');
  });
});
