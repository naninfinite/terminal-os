import {
  THIRD_DEFAULT_UTILITY_TAB_ID,
  resolveNextVisibleThirdUtilityTab,
  type ThirdUtilityTabId,
} from './thirdUtilityTabs';

export type ThirdUtilityPanelSession = {
  panelVisible: boolean;
  activeTab: ThirdUtilityTabId;
};

export const THIRD_MOBILE_UTILITY_MAX_WIDTH_PX = 560;

let utilityPanelSession: ThirdUtilityPanelSession | null = null;

const cloneUtilityPanelSession = (
  session: ThirdUtilityPanelSession
): ThirdUtilityPanelSession => ({
  panelVisible: session.panelVisible,
  activeTab: session.activeTab,
});

export const isThirdMobileUtilityViewport = (width: number): boolean => (
  Number.isFinite(width) && width <= THIRD_MOBILE_UTILITY_MAX_WIDTH_PX
);

export const createDefaultThirdUtilityPanelSession = (): ThirdUtilityPanelSession => ({
  panelVisible: false,
  activeTab: THIRD_DEFAULT_UTILITY_TAB_ID,
});

export const resolveInitialThirdUtilityPanelSession = (
  session: ThirdUtilityPanelSession | null
): ThirdUtilityPanelSession => {
  if (!session) {
    return createDefaultThirdUtilityPanelSession();
  }

  return {
    panelVisible: session.panelVisible,
    activeTab: resolveNextVisibleThirdUtilityTab({ currentTab: session.activeTab }),
  };
};

export const getThirdUtilityPanelSession = (): ThirdUtilityPanelSession | null => (
  utilityPanelSession ? cloneUtilityPanelSession(utilityPanelSession) : null
);

export const setThirdUtilityPanelSession = (next: ThirdUtilityPanelSession): void => {
  utilityPanelSession = cloneUtilityPanelSession({
    panelVisible: next.panelVisible,
    activeTab: resolveNextVisibleThirdUtilityTab({ currentTab: next.activeTab }),
  });
};

export const resetThirdUtilityPanelSessionForTests = (): void => {
  utilityPanelSession = null;
};
