export type DesktopRuntimePreloadSignals = {
  saveData: boolean;
  effectiveType: string | null;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  bootDurationMs: number;
};

type ConnectionLike = {
  saveData?: boolean;
  effectiveType?: string;
};

type NavigatorLike = Navigator & {
  connection?: ConnectionLike;
  mozConnection?: ConnectionLike;
  webkitConnection?: ConnectionLike;
  deviceMemory?: number;
};

const MAX_BOOT_DURATION_MS_FOR_PRELOAD = 1400;

export const shouldPreloadDesktopRuntime = (
  signals: DesktopRuntimePreloadSignals
): boolean => {
  if (signals.saveData) return false;

  const effectiveType = signals.effectiveType?.toLowerCase() ?? null;
  if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
    return false;
  }

  if (signals.bootDurationMs >= MAX_BOOT_DURATION_MS_FOR_PRELOAD) {
    return false;
  }

  if (signals.hardwareConcurrency != null && signals.hardwareConcurrency > 0 && signals.hardwareConcurrency <= 2) {
    return false;
  }

  if (signals.deviceMemory != null && signals.deviceMemory > 0 && signals.deviceMemory <= 2) {
    return false;
  }

  return true;
};

export const readDesktopRuntimePreloadSignals = (
  navigatorLike: NavigatorLike,
  bootDurationMs: number
): DesktopRuntimePreloadSignals => {
  const connection = navigatorLike.connection
    ?? navigatorLike.mozConnection
    ?? navigatorLike.webkitConnection;

  return {
    saveData: Boolean(connection?.saveData),
    effectiveType: connection?.effectiveType ?? null,
    hardwareConcurrency: Number.isFinite(navigatorLike.hardwareConcurrency)
      ? navigatorLike.hardwareConcurrency
      : null,
    deviceMemory: Number.isFinite(navigatorLike.deviceMemory)
      ? navigatorLike.deviceMemory ?? null
      : null,
    bootDurationMs: Number.isFinite(bootDurationMs) ? Math.max(0, bootDurationMs) : 0,
  };
};
