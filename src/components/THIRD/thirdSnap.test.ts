import { describe, expect, it } from 'vitest';
import {
  THIRD_OBJECT_SNAP_THRESHOLD,
  resolveActiveSnapAxes,
  resolveBoundsSnapDelta,
  type ThirdSnapBounds,
} from './thirdSnap';

const createBounds = (args: {
  min: [number, number, number];
  max: [number, number, number];
}): ThirdSnapBounds => ({
  min: {
    x: args.min[0],
    y: args.min[1],
    z: args.min[2],
  },
  max: {
    x: args.max[0],
    y: args.max[1],
    z: args.max[2],
  },
});

describe('thirdSnap axis resolution', () => {
  it('parses active transform axes deterministically', () => {
    expect(resolveActiveSnapAxes('XZ')).toEqual(['x', 'z']);
    expect(resolveActiveSnapAxes('XYZ')).toEqual(['x', 'y', 'z']);
    expect(resolveActiveSnapAxes('E')).toEqual([]);
    expect(resolveActiveSnapAxes(null)).toEqual([]);
  });
});

describe('thirdSnap bounds snapping', () => {
  const subjectBounds = createBounds({
    min: [0, 0, 0],
    max: [1, 1, 1],
  });

  it('chooses the nearest face gap on a single active axis', () => {
    const delta = resolveBoundsSnapDelta({
      activeAxes: ['x'],
      subjectBounds,
      candidates: [
        {
          id: 'left-near',
          bounds: createBounds({
            min: [-1.2, 0, 0],
            max: [-0.2, 1, 1],
          }),
        },
        {
          id: 'right-far',
          bounds: createBounds({
            min: [1.4, 0, 0],
            max: [2.4, 1, 1],
          }),
        },
      ],
    });

    expect(delta).toEqual({ x: -0.2 });
  });

  it('snaps across multiple active axes independently', () => {
    const delta = resolveBoundsSnapDelta({
      activeAxes: ['x', 'y'],
      subjectBounds,
      candidates: [
        {
          id: 'right-near',
          bounds: createBounds({
            min: [1.25, 0, 0],
            max: [2.25, 1, 1],
          }),
        },
        {
          id: 'top-near',
          bounds: createBounds({
            min: [0, 1.3, 0],
            max: [1, 2.3, 1],
          }),
        },
      ],
    });

    expect(delta.x).toBeCloseTo(0.25, 6);
    expect(delta.y).toBeCloseTo(0.3, 6);
  });

  it('returns no delta when every candidate exceeds the threshold', () => {
    const delta = resolveBoundsSnapDelta({
      activeAxes: ['x'],
      subjectBounds,
      candidates: [
        {
          id: 'too-far',
          bounds: createBounds({
            min: [1 + THIRD_OBJECT_SNAP_THRESHOLD + 0.1, 0, 0],
            max: [2 + THIRD_OBJECT_SNAP_THRESHOLD + 0.1, 1, 1],
          }),
        },
      ],
    });

    expect(delta).toEqual({});
  });

  it('skips excluded candidates such as ancestors or descendants', () => {
    const delta = resolveBoundsSnapDelta({
      activeAxes: ['x'],
      subjectBounds,
      candidates: [
        {
          id: 'ancestor',
          bounds: createBounds({
            min: [1.1, 0, 0],
            max: [2.1, 1, 1],
          }),
        },
        {
          id: 'sibling',
          bounds: createBounds({
            min: [1.35, 0, 0],
            max: [2.35, 1, 1],
          }),
        },
      ],
      excludedIds: new Set(['ancestor']),
    });

    expect(delta.x).toBeCloseTo(0.35, 6);
  });

  it('preserves candidate-order tie breaking for equal absolute gaps', () => {
    const delta = resolveBoundsSnapDelta({
      activeAxes: ['x'],
      subjectBounds,
      candidates: [
        {
          id: 'first',
          bounds: createBounds({
            min: [1.25, 0, 0],
            max: [2.25, 1, 1],
          }),
        },
        {
          id: 'second',
          bounds: createBounds({
            min: [-1.25, 0, 0],
            max: [-0.25, 1, 1],
          }),
        },
      ],
    });

    expect(delta).toEqual({ x: 0.25 });
  });
});
