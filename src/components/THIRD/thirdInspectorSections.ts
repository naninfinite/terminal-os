export const THIRD_INSPECTOR_SECTION_IDS = [
  'transform',
  'material',
  'animation',
  'physics',
] as const;

export type ThirdInspectorSectionId = typeof THIRD_INSPECTOR_SECTION_IDS[number];
export type ThirdInspectorSectionState = Record<ThirdInspectorSectionId, boolean>;

export const createThirdInspectorSectionState = (
  expanded = true
): ThirdInspectorSectionState => (
  THIRD_INSPECTOR_SECTION_IDS.reduce((acc, section) => {
    acc[section] = expanded;
    return acc;
  }, {} as ThirdInspectorSectionState)
);

export const createInitialThirdInspectorSectionState = (): ThirdInspectorSectionState => (
  createThirdInspectorSectionState(true)
);

export const isThirdInspectorSectionCollapsible = (mobileLayout: boolean): boolean => !mobileLayout;

export const isThirdInspectorSectionExpanded = (
  sectionState: ThirdInspectorSectionState,
  section: ThirdInspectorSectionId,
  mobileLayout: boolean
): boolean => (
  mobileLayout || sectionState[section]
);
