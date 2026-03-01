export const THIRD_GRID_CELL_SIZE = 1;
export const THIRD_ROTATION_SNAP_RADIANS = Math.PI / 12;
export const THIRD_SCALE_SNAP_STEP = 0.1;
export const THIRD_OBJECT_SNAP_THRESHOLD = 0.5;

export type ThirdSnapAxis = 'x' | 'y' | 'z';

export type ThirdSnapBounds = {
  min: Record<ThirdSnapAxis, number>;
  max: Record<ThirdSnapAxis, number>;
};

export type ThirdBoundsSnapCandidate = {
  id: string;
  bounds: ThirdSnapBounds;
};

export type ResolveBoundsSnapDeltaArgs = {
  activeAxes: ThirdSnapAxis[];
  subjectBounds: ThirdSnapBounds;
  candidates: ThirdBoundsSnapCandidate[];
  excludedIds?: ReadonlySet<string>;
  threshold?: number;
};

const SNAP_AXES: ReadonlyArray<ThirdSnapAxis> = ['x', 'y', 'z'];

export const resolveActiveSnapAxes = (
  axis: string | null | undefined
): ThirdSnapAxis[] => {
  if (!axis) return [];
  const normalized = axis.toLowerCase();
  return SNAP_AXES.filter((candidate) => normalized.includes(candidate));
};

export const resolveBoundsSnapDelta = (
  args: ResolveBoundsSnapDeltaArgs
): Partial<Record<ThirdSnapAxis, number>> => {
  const threshold = Number.isFinite(args.threshold)
    ? Math.max(0, args.threshold ?? THIRD_OBJECT_SNAP_THRESHOLD)
    : THIRD_OBJECT_SNAP_THRESHOLD;
  const next: Partial<Record<ThirdSnapAxis, number>> = {};

  args.activeAxes.forEach((axis) => {
    let bestGap: number | null = null;

    args.candidates.forEach((candidate) => {
      if (args.excludedIds?.has(candidate.id)) return;

      const subjectMin = args.subjectBounds.min[axis];
      const subjectMax = args.subjectBounds.max[axis];
      const candidateMin = candidate.bounds.min[axis];
      const candidateMax = candidate.bounds.max[axis];
      const candidateGaps = [
        candidateMin - subjectMax,
        candidateMax - subjectMin,
      ];

      candidateGaps.forEach((gap) => {
        if (Math.abs(gap) > threshold) return;
        if (bestGap == null || Math.abs(gap) < Math.abs(bestGap)) {
          bestGap = gap;
        }
      });
    });

    if (bestGap != null) {
      next[axis] = bestGap;
    }
  });

  return next;
};
