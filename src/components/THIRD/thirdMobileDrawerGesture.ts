export const THIRD_MOBILE_DRAWER_CLOSE_DRAG_MIN_PX = 56;
export const THIRD_MOBILE_DRAWER_CLOSE_DRAG_RATIO = 0.18;
export const THIRD_MOBILE_DRAWER_OPEN_DRAG_MIN_PX = 40;

export const clampThirdMobileDrawerDragOffset = (deltaY: number): number => (
  Number.isFinite(deltaY) ? Math.max(0, deltaY) : 0
);

export const resolveThirdMobileDrawerCloseThreshold = (sheetHeight: number): number => {
  const normalizedHeight = Number.isFinite(sheetHeight) ? Math.max(0, sheetHeight) : 0;
  return Math.max(THIRD_MOBILE_DRAWER_CLOSE_DRAG_MIN_PX, normalizedHeight * THIRD_MOBILE_DRAWER_CLOSE_DRAG_RATIO);
};

export const resolveThirdMobileDrawerOpenDragDistance = (deltaY: number): number => (
  clampThirdMobileDrawerDragOffset(-deltaY)
);

export const shouldCloseThirdMobileDrawer = (args: {
  dragOffsetY: number;
  sheetHeight: number;
}): boolean => (
  clampThirdMobileDrawerDragOffset(args.dragOffsetY) >= resolveThirdMobileDrawerCloseThreshold(args.sheetHeight)
);

export const shouldOpenThirdMobileDrawer = (deltaY: number): boolean => (
  resolveThirdMobileDrawerOpenDragDistance(deltaY) >= THIRD_MOBILE_DRAWER_OPEN_DRAG_MIN_PX
);
