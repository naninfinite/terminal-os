let desktopRuntimePromise: Promise<typeof import('./DesktopRuntime')> | null = null;

export const loadDesktopRuntime = (): Promise<typeof import('./DesktopRuntime')> => {
  if (!desktopRuntimePromise) {
    desktopRuntimePromise = import('./DesktopRuntime');
  }

  return desktopRuntimePromise;
};
