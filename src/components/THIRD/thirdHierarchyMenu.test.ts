import { describe, expect, it } from 'vitest';
import { buildThirdHierarchyMenu } from './thirdHierarchyMenu';

describe('thirdHierarchyMenu model', () => {
  it('returns stable action order', () => {
    const items = buildThirdHierarchyMenu({
      mode: 'edit',
      hasSelection: true,
      selectedObjectHasParent: true,
      isRenaming: false,
    });

    expect(items.map((item) => item.id)).toEqual([
      'hierarchy_rename',
      'hierarchy_duplicate',
      'hierarchy_delete',
      'hierarchy_unparent',
    ]);
  });

  it('disables actions when there is no selection', () => {
    const items = buildThirdHierarchyMenu({
      mode: 'edit',
      hasSelection: false,
      selectedObjectHasParent: false,
      isRenaming: false,
    });

    expect(items.every((item) => item.disabled === true)).toBe(true);
  });

  it('keeps duplicate/delete enabled in play while edit-only actions are disabled', () => {
    const items = buildThirdHierarchyMenu({
      mode: 'play',
      hasSelection: true,
      selectedObjectHasParent: true,
      isRenaming: false,
    });

    const rename = items.find((item) => item.id === 'hierarchy_rename');
    const duplicate = items.find((item) => item.id === 'hierarchy_duplicate');
    const remove = items.find((item) => item.id === 'hierarchy_unparent');

    expect(rename?.disabled).toBe(true);
    expect(duplicate?.disabled).toBe(false);
    expect(remove?.disabled).toBe(true);
  });

  it('disables rename while a rename session is active', () => {
    const items = buildThirdHierarchyMenu({
      mode: 'edit',
      hasSelection: true,
      selectedObjectHasParent: false,
      isRenaming: true,
    });

    const rename = items.find((item) => item.id === 'hierarchy_rename');
    expect(rename?.disabled).toBe(true);
  });
});
