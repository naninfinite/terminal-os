import { describe, expect, it } from 'vitest';
import {
  clampThirdMobileDrawerDragOffset,
  resolveThirdMobileDrawerCloseThreshold,
  resolveThirdMobileDrawerOpenDragDistance,
  shouldCloseThirdMobileDrawer,
  shouldOpenThirdMobileDrawer,
  THIRD_MOBILE_DRAWER_CLOSE_DRAG_MIN_PX,
  THIRD_MOBILE_DRAWER_OPEN_DRAG_MIN_PX,
} from './thirdMobileDrawerGesture';

describe('thirdMobileDrawerGesture', () => {
  it('clamps drag offsets to non-negative values', () => {
    expect(clampThirdMobileDrawerDragOffset(-12)).toBe(0);
    expect(clampThirdMobileDrawerDragOffset(0)).toBe(0);
    expect(clampThirdMobileDrawerDragOffset(34)).toBe(34);
  });

  it('converts upward drag deltas into open distances', () => {
    expect(resolveThirdMobileDrawerOpenDragDistance(12)).toBe(0);
    expect(resolveThirdMobileDrawerOpenDragDistance(0)).toBe(0);
    expect(resolveThirdMobileDrawerOpenDragDistance(-28)).toBe(28);
  });

  it('uses a minimum close threshold for short sheets', () => {
    expect(resolveThirdMobileDrawerCloseThreshold(0)).toBe(THIRD_MOBILE_DRAWER_CLOSE_DRAG_MIN_PX);
    expect(resolveThirdMobileDrawerCloseThreshold(240)).toBe(THIRD_MOBILE_DRAWER_CLOSE_DRAG_MIN_PX);
  });

  it('scales the close threshold with taller sheets', () => {
    expect(resolveThirdMobileDrawerCloseThreshold(400)).toBe(72);
  });

  it('closes only after the drag offset crosses the close threshold', () => {
    expect(shouldCloseThirdMobileDrawer({
      dragOffsetY: 55,
      sheetHeight: 240,
    })).toBe(false);

    expect(shouldCloseThirdMobileDrawer({
      dragOffsetY: 56,
      sheetHeight: 240,
    })).toBe(true);

    expect(shouldCloseThirdMobileDrawer({
      dragOffsetY: 60,
      sheetHeight: 400,
    })).toBe(false);

    expect(shouldCloseThirdMobileDrawer({
      dragOffsetY: 72,
      sheetHeight: 400,
    })).toBe(true);
  });

  it('opens only after upward drag crosses the open threshold', () => {
    expect(THIRD_MOBILE_DRAWER_OPEN_DRAG_MIN_PX).toBe(40);
    expect(shouldOpenThirdMobileDrawer(-39)).toBe(false);
    expect(shouldOpenThirdMobileDrawer(-40)).toBe(true);
    expect(shouldOpenThirdMobileDrawer(18)).toBe(false);
  });
});
