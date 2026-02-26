import { describe, expect, it } from 'vitest';
import {
  ALLOW_NATIVE_CONTEXTMENU_SELECTOR,
  ALLOW_SELECTION_SELECTOR,
  shouldAllowNativeContextMenu,
  shouldAllowTextSelection,
} from './interactionLockdown';

type StubTargetOptions = {
  allowNativeContextMenu?: boolean;
  allowSelection?: boolean;
  editableClosest?: boolean;
  isContentEditable?: boolean;
};

const createStubTarget = (options: StubTargetOptions): EventTarget => ({
  isContentEditable: options.isContentEditable ?? false,
  closest: (selector: string) => {
    if (selector === ALLOW_NATIVE_CONTEXTMENU_SELECTOR) {
      return options.allowNativeContextMenu ? { nodeName: 'DIV' } : null;
    }
    if (selector === ALLOW_SELECTION_SELECTOR) {
      return options.allowSelection ? { nodeName: 'DIV' } : null;
    }
    if (selector.includes('input') || selector.includes('textarea') || selector.includes('[contenteditable]')) {
      return options.editableClosest ? { nodeName: 'INPUT' } : null;
    }
    return null;
  },
}) as unknown as EventTarget;

describe('interactionLockdown policy', () => {
  it('allows native context menu only when explicitly whitelisted', () => {
    expect(shouldAllowNativeContextMenu(null)).toBe(false);
    expect(shouldAllowNativeContextMenu(createStubTarget({ allowNativeContextMenu: false }))).toBe(false);
    expect(shouldAllowNativeContextMenu(createStubTarget({ allowNativeContextMenu: true }))).toBe(true);
  });

  it('supports text-node targets for native context menu allowlist checks', () => {
    const parent = createStubTarget({ allowNativeContextMenu: true });
    const textNode = { nodeType: 3, parentElement: parent } as unknown as EventTarget;
    expect(shouldAllowNativeContextMenu(textNode)).toBe(true);
  });

  it('allows text selection for editable controls and explicit allowlist targets', () => {
    expect(shouldAllowTextSelection(createStubTarget({ editableClosest: true }))).toBe(true);
    expect(shouldAllowTextSelection(createStubTarget({ isContentEditable: true }))).toBe(true);
    expect(shouldAllowTextSelection(createStubTarget({ allowSelection: true }))).toBe(true);
  });

  it('blocks text selection for standard non-editable targets', () => {
    const plainParent = createStubTarget({});
    const plainTextNode = { nodeType: 3, parentElement: plainParent } as unknown as EventTarget;
    expect(shouldAllowTextSelection(createStubTarget({}))).toBe(false);
    expect(shouldAllowTextSelection(plainTextNode)).toBe(false);
  });
});
