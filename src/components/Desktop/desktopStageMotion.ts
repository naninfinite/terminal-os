import type { MeOsShellScope } from '../../meos/shell/types';

export type DesktopStageRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type DesktopStageFlip = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
};

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const POSITION_EPSILON_PX = 0.5;
const SCALE_EPSILON = 0.01;

export const getDesktopReducedMotionQuery = (): string => REDUCED_MOTION_QUERY;

export const getInitialDesktopReducedMotion = (): boolean => (
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia(REDUCED_MOTION_QUERY).matches
);

export const measureDesktopStageRect = (
  rect: Pick<DOMRectReadOnly, 'left' | 'top' | 'width' | 'height'>,
): DesktopStageRect => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
});

export const shouldAnimateDesktopStageTransition = (args: {
  desktopHeroLayoutEnabled: boolean;
  reducedMotion: boolean;
  previousFeaturedPanel: MeOsShellScope | null;
  featuredPanel: MeOsShellScope;
}): boolean => (
  args.desktopHeroLayoutEnabled
  && !args.reducedMotion
  && args.previousFeaturedPanel != null
  && args.previousFeaturedPanel !== args.featuredPanel
);

export const resolveDesktopStageFlip = (args: {
  previousRect?: DesktopStageRect;
  nextRect?: DesktopStageRect;
}): DesktopStageFlip | null => {
  const previousRect = args.previousRect;
  const nextRect = args.nextRect;

  if (!previousRect || !nextRect) return null;
  if (previousRect.width <= 0 || previousRect.height <= 0) return null;
  if (nextRect.width <= 0 || nextRect.height <= 0) return null;

  const x = previousRect.left - nextRect.left;
  const y = previousRect.top - nextRect.top;
  const scaleX = previousRect.width / nextRect.width;
  const scaleY = previousRect.height / nextRect.height;

  if (
    Math.abs(x) <= POSITION_EPSILON_PX
    && Math.abs(y) <= POSITION_EPSILON_PX
    && Math.abs(scaleX - 1) <= SCALE_EPSILON
    && Math.abs(scaleY - 1) <= SCALE_EPSILON
  ) {
    return null;
  }

  return { x, y, scaleX, scaleY };
};
