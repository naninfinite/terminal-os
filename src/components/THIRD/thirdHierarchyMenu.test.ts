import { describe, expect, it } from 'vitest';
import { buildThirdHierarchyMenu } from './thirdHierarchyMenu';

describe('thirdHierarchyMenu model', () => {
  it('returns stable object action order', () => {
    const items = buildThirdHierarchyMenu({
      context: 'object',
      mode: 'edit',
      hasSelection: true,
      selectedObjectHasParent: true,
      isRenaming: false,
    });

    expect(items.map((item) => item.id)).toEqual([
      'hierarchy_focus',
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
      selectedObjectHasParent: true,
      isRenaming: false,
    });

    const focus = items.find((item) => item.id === 'hierarchy_focus');
    const rename = items.find((item) => item.id === 'hierarchy_rename');
    const duplicate = items.find((item) => item.id === 'hierarchy_duplicate');
    const remove = items.find((item) => item.id === 'hierarchy_unparent');

    expect(focus?.disabled).toBe(false);
    expect(rename?.disabled).toBe(true);
    expect(duplicate?.disabled).toBe(false);
    expect(remove?.disabled).toBe(true);
  });

  it('disables rename while a rename session is active', () => {
    const items = buildThirdHierarchyMenu({
      context: 'object',
      mode: 'edit',
      hasSelection: true,
      selectedObjectHasParent: false,
      isRenaming: true,
    });

    const rename = items.find((item) => item.id === 'hierarchy_rename');
    expect(rename?.disabled).toBe(true);
  });
});
