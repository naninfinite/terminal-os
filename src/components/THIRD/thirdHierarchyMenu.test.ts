import { describe, expect, it } from 'vitest';
import { buildThirdHierarchyMenu } from './thirdHierarchyMenu';

describe('thirdHierarchyMenu model', () => {
  it('returns stable object action order', () => {
    const items = buildThirdHierarchyMenu({
      context: 'object',
      mode: 'edit',
      hasSelection: true,
      selectedObjectLocked: false,
      selectedObjectHasParent: true,
      isRenaming: false,
    });

    expect(items.map((item) => item.id)).toEqual([
      'hierarchy_focus',
      'hierarchy_toggle_lock',
      'hierarchy_add_child_cube',
      'hierarchy_add_child_sphere',
      'hierarchy_add_child_cylinder',
      'hierarchy_add_child_plane',
      'hierarchy_rename',
      'hierarchy_duplicate',
      'hierarchy_delete',
      'hierarchy_unparent',
    ]);
  });

  it('returns scene add actions for scene-context menu', () => {
    const items = buildThirdHierarchyMenu({
      context: 'scene',
      mode: 'play',
      hasSelection: false,
      selectedObjectLocked: false,
      selectedObjectHasParent: false,
      isRenaming: false,
    });

    expect(items.map((item) => item.id)).toEqual([
      'hierarchy_add_cube',
      'hierarchy_add_sphere',
      'hierarchy_add_cylinder',
      'hierarchy_add_plane',
    ]);
    expect(items.some((item) => item.disabled)).toBe(false);
  });

  it('disables actions when there is no selection', () => {
    const items = buildThirdHierarchyMenu({
      context: 'object',
      mode: 'edit',
      hasSelection: false,
      selectedObjectLocked: false,
      selectedObjectHasParent: false,
      isRenaming: false,
    });

    expect(items.every((item) => item.disabled === true)).toBe(true);
  });

  it('keeps duplicate/delete enabled in play while edit-only actions are disabled', () => {
    const items = buildThirdHierarchyMenu({
      context: 'object',
      mode: 'play',
      hasSelection: true,
      selectedObjectLocked: false,
      selectedObjectHasParent: true,
      isRenaming: false,
    });

    const focus = items.find((item) => item.id === 'hierarchy_focus');
    const toggleLock = items.find((item) => item.id === 'hierarchy_toggle_lock');
    const addChild = items.find((item) => item.id === 'hierarchy_add_child_cube');
    const rename = items.find((item) => item.id === 'hierarchy_rename');
    const duplicate = items.find((item) => item.id === 'hierarchy_duplicate');
    const remove = items.find((item) => item.id === 'hierarchy_unparent');

    expect(focus?.disabled).toBe(false);
    expect(toggleLock?.disabled).toBe(false);
    expect(addChild?.disabled).toBe(true);
    expect(rename?.disabled).toBe(true);
    expect(duplicate?.disabled).toBe(false);
    expect(remove?.disabled).toBe(true);
  });

  it('disables rename while a rename session is active', () => {
    const items = buildThirdHierarchyMenu({
      context: 'object',
      mode: 'edit',
      hasSelection: true,
      selectedObjectLocked: false,
      selectedObjectHasParent: false,
      isRenaming: true,
    });

    const rename = items.find((item) => item.id === 'hierarchy_rename');
    expect(rename?.disabled).toBe(true);
  });

  it('disables edit actions and flips lock label when object is locked', () => {
    const items = buildThirdHierarchyMenu({
      context: 'object',
      mode: 'edit',
      hasSelection: true,
      selectedObjectLocked: true,
      selectedObjectHasParent: true,
      isRenaming: false,
    });

    const toggleLock = items.find((item) => item.id === 'hierarchy_toggle_lock');
    const addChild = items.find((item) => item.id === 'hierarchy_add_child_cube');
    const duplicate = items.find((item) => item.id === 'hierarchy_duplicate');
    const remove = items.find((item) => item.id === 'hierarchy_unparent');

    expect(toggleLock?.label).toBe('UNLOCK');
    expect(toggleLock?.disabled).toBe(false);
    expect(addChild?.disabled).toBe(true);
    expect(duplicate?.disabled).toBe(true);
    expect(remove?.disabled).toBe(true);
  });

  it('enables add-child actions for unlocked selections in edit mode', () => {
    const items = buildThirdHierarchyMenu({
      context: 'object',
      mode: 'edit',
      hasSelection: true,
      selectedObjectLocked: false,
      selectedObjectHasParent: false,
      isRenaming: false,
    });

    const addChildCube = items.find((item) => item.id === 'hierarchy_add_child_cube');
    const addChildSphere = items.find((item) => item.id === 'hierarchy_add_child_sphere');
    expect(addChildCube?.disabled).toBe(false);
    expect(addChildSphere?.disabled).toBe(false);
  });
});
