import { describe, expect, it } from 'vitest';
import {
  resolveFocusCameraDistance,
  resolveThirdCameraHotkey,
} from './thirdCameraControls';

describe('thirdCameraControls hotkeys', () => {
  it('maps blender-style camera keys to actions', () => {
    expect(resolveThirdCameraHotkey({
      code: 'Digit1',
      key: '1',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      hasSelection: false,
    })).toBe('camera_view_front');
    expect(resolveThirdCameraHotkey({
      code: 'Numpad3',
      key: '3',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      hasSelection: false,
    })).toBe('camera_view_right');
    expect(resolveThirdCameraHotkey({
      code: 'Digit7',
      key: '7',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      hasSelection: false,
    })).toBe('camera_view_top');
    expect(resolveThirdCameraHotkey({
      code: 'Numpad5',
      key: '5',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      hasSelection: false,
    })).toBe('camera_toggle_projection');
  });

  it('focus hotkey requires an active selection', () => {
    expect(resolveThirdCameraHotkey({
      code: 'KeyF',
      key: 'f',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      hasSelection: false,
    })).toBeNull();
    expect(resolveThirdCameraHotkey({
      code: 'KeyF',
      key: 'f',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      hasSelection: true,
    })).toBe('camera_focus_selected');
  });

  it('ignores camera hotkeys on interactive targets and with modifiers', () => {
    expect(resolveThirdCameraHotkey({
      code: 'Digit1',
      key: '1',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      hasSelection: true,
      targetTagName: 'input',
    })).toBeNull();
    expect(resolveThirdCameraHotkey({
      code: 'Digit1',
      key: '1',
      altKey: false,
      ctrlKey: true,
      metaKey: false,
      hasSelection: true,
      targetTagName: 'div',
    })).toBeNull();
    expect(resolveThirdCameraHotkey({
      code: 'Digit1',
      key: '1',
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      hasSelection: true,
      targetTagName: 'div',
      targetIsContentEditable: true,
    })).toBeNull();
  });
});

describe('thirdCameraControls focus framing', () => {
  it('keeps a stable minimum framing distance', () => {
    expect(resolveFocusCameraDistance({ objectRadius: 0.1, minDistance: 1.2 })).toBe(5);
  });

  it('expands distance for larger objects and larger minimums', () => {
    expect(resolveFocusCameraDistance({ objectRadius: 3, minDistance: 1.2 })).toBeCloseTo(9.6, 6);
    expect(resolveFocusCameraDistance({ objectRadius: 0.2, minDistance: 7 })).toBe(7);
  });
});
