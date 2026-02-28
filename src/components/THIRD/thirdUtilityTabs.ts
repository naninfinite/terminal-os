import {
  THIRD_INSPECTOR_SECTION_IDS,
  type ThirdInspectorSectionId,
} from './thirdInspectorSections';

export const THIRD_DEFAULT_UTILITY_TAB_ID = 'scene' as const;

export const THIRD_UTILITY_TAB_IDS = [
  THIRD_DEFAULT_UTILITY_TAB_ID,
  ...THIRD_INSPECTOR_SECTION_IDS,
] as const;

export type ThirdUtilityTabId = typeof THIRD_UTILITY_TAB_IDS[number];

const THIRD_UTILITY_TAB_LABELS: Record<ThirdUtilityTabId, string> = {
  scene: 'SCENE',
  transform: 'TRANSFORM',
  material: 'MATERIAL',
  animation: 'ANIMATION',
  physics: 'PHYSICS',
  camera: 'CAMERA',
};

export const isThirdInspectorSectionTab = (
  tabId: ThirdUtilityTabId
): tabId is ThirdInspectorSectionId => tabId !== THIRD_DEFAULT_UTILITY_TAB_ID;

export const getThirdUtilityTabLabel = (tabId: ThirdUtilityTabId): string => (
  THIRD_UTILITY_TAB_LABELS[tabId]
);

export const resolveNextVisibleThirdUtilityTab = (args: {
  currentTab: ThirdUtilityTabId | null | undefined;
  fallbackTab?: ThirdUtilityTabId;
}): ThirdUtilityTabId => {
  const fallbackTab = args.fallbackTab ?? THIRD_DEFAULT_UTILITY_TAB_ID;
  return THIRD_UTILITY_TAB_IDS.includes(args.currentTab as ThirdUtilityTabId)
    ? (args.currentTab as ThirdUtilityTabId)
    : fallbackTab;
};
