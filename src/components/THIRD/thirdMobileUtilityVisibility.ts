export type ThirdUtilityVisibility = {
  sceneWindowVisible: boolean;
  inspectorWindowVisible: boolean;
};

export const THIRD_MOBILE_UTILITY_MAX_WIDTH_PX = 560;

let utilityVisibilitySession: ThirdUtilityVisibility | null = null;

const cloneUtilityVisibility = (
  visibility: ThirdUtilityVisibility
): ThirdUtilityVisibility => ({
  sceneWindowVisible: visibility.sceneWindowVisible,
  inspectorWindowVisible: visibility.inspectorWindowVisible,
});

export const isThirdMobileUtilityViewport = (width: number): boolean => (
  Number.isFinite(width) && width <= THIRD_MOBILE_UTILITY_MAX_WIDTH_PX
);

export const resolveInitialThirdUtilityVisibility = (
  windowWidth: number | null | undefined,
  session: ThirdUtilityVisibility | null
): ThirdUtilityVisibility => {
  if (session) {
    return cloneUtilityVisibility(session);
  }

  if (typeof windowWidth === 'number' && isThirdMobileUtilityViewport(windowWidth)) {
    return {
      sceneWindowVisible: false,
      inspectorWindowVisible: false,
    };
  }

  return {
    sceneWindowVisible: true,
    inspectorWindowVisible: true,
  };
};

export const getThirdUtilityVisibilitySession = (): ThirdUtilityVisibility | null => (
  utilityVisibilitySession ? cloneUtilityVisibility(utilityVisibilitySession) : null
);

export const setThirdUtilityVisibilitySession = (next: ThirdUtilityVisibility): void => {
  utilityVisibilitySession = cloneUtilityVisibility(next);
};

export const resetThirdUtilityVisibilitySessionForTests = (): void => {
  utilityVisibilitySession = null;
};

