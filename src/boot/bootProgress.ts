export type BootStage = 'html_shell' | 'react_bootstrap' | 'app_mounted' | 'landing_interactive';

export type BootProgressController = {
  setProgress: (percent: number, label: string) => void;
  complete: () => void;
};

type BootHost = {
  __TERMINAL_OS_BOOT__?: BootProgressController;
};

const BOOT_STAGE_PROGRESS: Record<BootStage, number> = {
  html_shell: 12,
  react_bootstrap: 32,
  app_mounted: 68,
  landing_interactive: 100,
};

const BOOT_STAGE_LABEL: Record<BootStage, string> = {
  html_shell: 'BOOTSTRAP READY',
  react_bootstrap: 'REACT BOOTSTRAP',
  app_mounted: 'APP MOUNTED',
  landing_interactive: 'LANDING INTERACTIVE',
};

const bootState = {
  progress: 0,
  completed: false,
};

const clampProgress = (value: number): number => {
  if (!Number.isFinite(value)) return bootState.progress;
  return Math.max(0, Math.min(100, Math.round(value)));
};

const resolveBootController = (
  host: BootHost | typeof globalThis = globalThis
): BootProgressController | null => {
  const candidate = (host as BootHost).__TERMINAL_OS_BOOT__;
  if (!candidate) return null;
  if (typeof candidate.setProgress !== 'function') return null;
  if (typeof candidate.complete !== 'function') return null;
  return candidate;
};

export const getBootStageProgress = (stage: BootStage): number => BOOT_STAGE_PROGRESS[stage];

export const publishBootProgress = (
  percent: number,
  label: string,
  host: BootHost | typeof globalThis = globalThis
): number => {
  if (bootState.completed) return bootState.progress;

  const nextProgress = clampProgress(percent);
  if (nextProgress < bootState.progress) {
    return bootState.progress;
  }

  bootState.progress = nextProgress;
  resolveBootController(host)?.setProgress(nextProgress, label);
  return bootState.progress;
};

export const completeBootProgress = (
  host: BootHost | typeof globalThis = globalThis,
  label = BOOT_STAGE_LABEL.landing_interactive
): void => {
  if (bootState.completed) return;

  bootState.progress = 100;
  const controller = resolveBootController(host);
  controller?.setProgress(100, label);
  bootState.completed = true;
  controller?.complete();
};

export const publishBootStage = (
  stage: BootStage,
  host: BootHost | typeof globalThis = globalThis
): number => {
  const progress = publishBootProgress(
    BOOT_STAGE_PROGRESS[stage],
    BOOT_STAGE_LABEL[stage],
    host
  );

  if (stage === 'landing_interactive' && progress === BOOT_STAGE_PROGRESS[stage]) {
    completeBootProgress(host, BOOT_STAGE_LABEL[stage]);
  }

  return progress;
};

export const __resetBootProgressForTest = (): void => {
  bootState.progress = 0;
  bootState.completed = false;
};

export const __getBootProgressStateForTest = (): { progress: number; completed: boolean } => ({
  progress: bootState.progress,
  completed: bootState.completed,
});
