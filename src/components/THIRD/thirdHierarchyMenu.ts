import type { ThirdEditorMode } from '../../third/types';

export type ThirdHierarchyMenuActionId =
  | 'hierarchy_focus'
  | 'hierarchy_toggle_lock'
  | 'hierarchy_rename'
  | 'hierarchy_duplicate'
  | 'hierarchy_delete'
  | 'hierarchy_unparent'
  | 'hierarchy_add_cube'
  | 'hierarchy_add_sphere'
  | 'hierarchy_add_cylinder'
  | 'hierarchy_add_plane';

export type ThirdHierarchyMenuContext = 'object' | 'scene';

export type ThirdHierarchyMenuItem = {
  id: ThirdHierarchyMenuActionId;
  label: string;
  disabled?: boolean;
};

export type BuildThirdHierarchyMenuArgs = {
  context: ThirdHierarchyMenuContext;
  mode: ThirdEditorMode;
  hasSelection: boolean;
  selectedObjectLocked: boolean;
  selectedObjectHasParent: boolean;
  isRenaming: boolean;
};

export const buildThirdHierarchyMenu = (
  args: BuildThirdHierarchyMenuArgs
): ThirdHierarchyMenuItem[] => {
  if (args.context === 'scene') {
    return [
      { id: 'hierarchy_add_cube', label: 'ADD CUBE' },
      { id: 'hierarchy_add_sphere', label: 'ADD SPHERE' },
      { id: 'hierarchy_add_cylinder', label: 'ADD CYLINDER' },
      { id: 'hierarchy_add_plane', label: 'ADD PLANE' },
    ];
  }

  const hasSelection = args.hasSelection;
  const canEditObject = hasSelection && !args.selectedObjectLocked;
  const canRename = canEditObject && args.mode === 'edit' && !args.isRenaming;
  const canUnparent = canEditObject && args.mode === 'edit' && args.selectedObjectHasParent;

  return [
    { id: 'hierarchy_focus', label: 'FOCUS', disabled: !hasSelection },
    {
      id: 'hierarchy_toggle_lock',
      label: args.selectedObjectLocked ? 'UNLOCK' : 'LOCK',
      disabled: !hasSelection,
    },
    { id: 'hierarchy_rename', label: 'RENAME', disabled: !canRename },
    { id: 'hierarchy_duplicate', label: 'DUPLICATE', disabled: !canEditObject },
    { id: 'hierarchy_delete', label: 'DELETE', disabled: !canEditObject },
    { id: 'hierarchy_unparent', label: 'UNPARENT', disabled: !canUnparent },
  ];
};
