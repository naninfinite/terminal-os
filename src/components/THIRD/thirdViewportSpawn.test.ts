import { describe, expect, it } from 'vitest';
import { resolveThirdViewportSpawnPosition } from './thirdViewportSpawn';

describe('thirdViewportSpawn', () => {
  it('returns the world origin when the scene is empty', () => {
    expect(resolveThirdViewportSpawnPosition({
      objectCount: 0,
      rayOrigin: { x: 10, y: 8, z: 6 },
      rayDirection: { x: 0, y: 0, z: -1 },
      planeOrigin: { x: 3, y: 2, z: 1 },
      planeNormal: { x: 0, y: 0, z: 1 },
    })).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('projects the cursor ray onto the spawn plane when objects already exist', () => {
    expect(resolveThirdViewportSpawnPosition({
      objectCount: 1,
      rayOrigin: { x: 0, y: 0, z: 10 },
      rayDirection: { x: 0, y: 0, z: -1 },
      planeOrigin: { x: 2, y: 3, z: 4 },
      planeNormal: { x: 0, y: 0, z: 1 },
    })).toEqual({ x: 0, y: 0, z: 4 });
  });

  it('falls back to the plane anchor when the cursor ray is parallel to the plane', () => {
    expect(resolveThirdViewportSpawnPosition({
      objectCount: 2,
      rayOrigin: { x: 1, y: 2, z: 3 },
      rayDirection: { x: 1, y: 0, z: 0 },
      planeOrigin: { x: 4, y: 5, z: 6 },
      planeNormal: { x: 0, y: 1, z: 0 },
    })).toEqual({ x: 4, y: 5, z: 6 });
  });
});
