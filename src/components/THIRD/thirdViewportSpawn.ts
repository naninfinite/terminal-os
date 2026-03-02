import type { ThirdVec3 } from '../../third/types';

export type ResolveThirdViewportSpawnPositionArgs = {
  objectCount: number;
  rayOrigin: ThirdVec3;
  rayDirection: ThirdVec3;
  planeOrigin: ThirdVec3;
  planeNormal: ThirdVec3;
};

const ORIGIN: ThirdVec3 = { x: 0, y: 0, z: 0 };
const INTERSECTION_EPSILON = 0.000001;

const cloneVec3 = (value: ThirdVec3): ThirdVec3 => ({
  x: value.x,
  y: value.y,
  z: value.z,
});

const dot = (a: ThirdVec3, b: ThirdVec3): number => (
  a.x * b.x + a.y * b.y + a.z * b.z
);

export const resolveThirdViewportSpawnPosition = (
  args: ResolveThirdViewportSpawnPositionArgs
): ThirdVec3 => {
  if (args.objectCount <= 0) {
    return cloneVec3(ORIGIN);
  }

  const denominator = dot(args.rayDirection, args.planeNormal);
  if (Math.abs(denominator) <= INTERSECTION_EPSILON) {
    return cloneVec3(args.planeOrigin);
  }

  const offset = {
    x: args.planeOrigin.x - args.rayOrigin.x,
    y: args.planeOrigin.y - args.rayOrigin.y,
    z: args.planeOrigin.z - args.rayOrigin.z,
  };
  const distance = dot(offset, args.planeNormal) / denominator;
  if (!Number.isFinite(distance) || distance < 0) {
    return cloneVec3(args.planeOrigin);
  }

  return {
    x: args.rayOrigin.x + args.rayDirection.x * distance,
    y: args.rayOrigin.y + args.rayDirection.y * distance,
    z: args.rayOrigin.z + args.rayDirection.z * distance,
  };
};
