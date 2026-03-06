export const THIRD_DEFAULT_UTILITY_TAB_ID = 'scene' as const;

export const THIRD_UTILITY_TAB_IDS = [
  THIRD_DEFAULT_UTILITY_TAB_ID,
  'object',
  'camera',
] as const;

export type ThirdUtilityTabId = typeof THIRD_UTILITY_TAB_IDS[number];

const THIRD_UTILITY_TAB_LABELS: Record<ThirdUtilityTabId, string> = {
  scene: 'SCENE',
  object: 'OBJECT',
  camera: 'CAMERA',
};

export const isThirdObjectUtilityTab = (
  tabId: ThirdUtilityTabId
): tabId is 'object' => tabId === 'object';

export const getThirdUtilityTabLabel = (tabId: ThirdUtilityTabId): string => (
  THIRD_UTILITY_TAB_LABELS[tabId]
);

export const shouldShowThirdUtilityHideAction = (mobileLayout: boolean): boolean => !mobileLayout;

export const resolveNextVisibleThirdUtilityTab = (args: {
  currentTab: ThirdUtilityTabId | null | undefined;
  fallbackTab?: ThirdUtilityTabId;
}): ThirdUtilityTabId => {
  const fallbackTab = args.fallbackTab ?? THIRD_DEFAULT_UTILITY_TAB_ID;
  return THIRD_UTILITY_TAB_IDS.includes(args.currentTab as ThirdUtilityTabId)
    ? (args.currentTab as ThirdUtilityTabId)
    : fallbackTab;
};
