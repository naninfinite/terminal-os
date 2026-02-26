type TargetLike = {
  closest?: (selector: string) => unknown;
  isContentEditable?: boolean;
  parentElement?: EventTarget | null;
  nodeType?: number;
};

export const ALLOW_NATIVE_CONTEXTMENU_SELECTOR = '[data-allow-native-contextmenu="true"]';
export const ALLOW_SELECTION_SELECTOR = '[data-allow-selection="true"]';
export const EDITABLE_SELECTION_SELECTOR = [
  'input',
  'textarea',
  '[contenteditable]',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
].join(', ');

const resolveTarget = (target: EventTarget | null): TargetLike | null => {
  if (!target || typeof target !== 'object') return null;
  const candidate = target as TargetLike;
  if (typeof candidate.closest === 'function' || candidate.isContentEditable) return candidate;
  if (candidate.nodeType === 3 && candidate.parentElement && typeof candidate.parentElement === 'object') {
    return candidate.parentElement as TargetLike;
  }
  return null;
};

const matchesClosest = (target: TargetLike | null, selector: string): boolean => {
  if (!target || typeof target.closest !== 'function') return false;
  try {
    return Boolean(target.closest(selector));
  } catch {
    return false;
  }
};

export const shouldAllowNativeContextMenu = (target: EventTarget | null): boolean => {
  const candidate = resolveTarget(target);
  return matchesClosest(candidate, ALLOW_NATIVE_CONTEXTMENU_SELECTOR);
};

export const shouldAllowTextSelection = (target: EventTarget | null): boolean => {
  const candidate = resolveTarget(target);
  if (!candidate) return false;
  if (candidate.isContentEditable) return true;
  if (matchesClosest(candidate, ALLOW_SELECTION_SELECTOR)) return true;
  return matchesClosest(candidate, EDITABLE_SELECTION_SELECTOR);
};
