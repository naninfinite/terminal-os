import type { ThirdEditorMode } from '../../third/types';

export type ThirdHierarchyMenuActionId =
  | 'hierarchy_rename'
  | 'hierarchy_duplicate'
  | 'hierarchy_delete'
  | 'hierarchy_unparent';

export type ThirdHierarchyMenuItem = {
  id: ThirdHierarchyMenuActionId;
  label: string;
  disabled?: boolean;
};

export type BuildThirdHierarchyMenuArgs = {
  mode: ThirdEditorMode;
  hasSelection: boolean;
  selectedObjectHasParent: boolean;
  isRenaming: boolean;
};

export const buildThirdHierarchyMenu = (
  args: BuildThirdHierarchyMenuArgs
): ThirdHierarchyMenuItem[] => {
  const hasSelection = args.hasSelection;
  const canRename = hasSelection && args.mode === 'edit' && !args.isRenaming;
  const canUnparent = hasSelection && args.mode === 'edit' && args.selectedObjectHasParent;

  return [
    { id: 'hierarchy_rename', label: 'RENAME', disabled: !canRename },
    { id: 'hierarchy_duplicate', label: 'DUPLICATE', disabled: !hasSelection },
    { id: 'hierarchy_delete', label: 'DELETE', disabled: !hasSelection },
    { id: 'hierarchy_unparent', label: 'UNPARENT', disabled: !canUnparent },
  ];
};
