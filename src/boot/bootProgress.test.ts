import { afterEach, describe, expect, it } from 'vitest';
import {
  __getBootProgressStateForTest,
  __resetBootProgressForTest,
  completeBootProgress,
  getBootStageCeiling,
  getBootStageProgress,
  publishBootProgress,
  publishBootStage,
} from './bootProgress';

type BootCall =
  | { type: 'set'; progress: number; label: string }
  | { type: 'complete' };

const createBootHost = () => {
  const calls: BootCall[] = [];
  return {
    calls,
    host: {
      __TERMINAL_OS_BOOT__: {
        setProgress: (progress: number, label: string) => {
          calls.push({ type: 'set', progress, label });
        },
        complete: () => {
          calls.push({ type: 'complete' });
        },
      },
    },
  };
};

describe('bootProgress', () => {
  afterEach(() => {
    __resetBootProgressForTest();
  });

  it('publishes stages in order and completes on landing interactive', () => {
    const { host, calls } = createBootHost();

    expect(publishBootStage('html_shell', host)).toBe(getBootStageProgress('html_shell'));
    expect(publishBootStage('react_bootstrap', host)).toBe(getBootStageProgress('react_bootstrap'));
    expect(publishBootStage('app_mounted', host)).toBe(getBootStageProgress('app_mounted'));
    expect(publishBootStage('landing_interactive', host)).toBe(getBootStageProgress('landing_interactive'));

    expect(calls).toEqual([
      { type: 'set', progress: 12, label: 'BOOTSTRAP READY' },
      { type: 'set', progress: 32, label: 'REACT BOOTSTRAP' },
      { type: 'set', progress: 68, label: 'APP MOUNTED' },
      { type: 'set', progress: 100, label: 'LANDING INTERACTIVE' },
      { type: 'set', progress: 100, label: 'LANDING INTERACTIVE' },
      { type: 'complete' },
    ]);
    expect(__getBootProgressStateForTest()).toEqual({ progress: 100, completed: true });
  });

  it('exposes bounded stage ceilings for estimated live fill', () => {
    expect(getBootStageCeiling('html_shell')).toBe(28);
    expect(getBootStageCeiling('react_bootstrap')).toBe(58);
    expect(getBootStageCeiling('app_mounted')).toBe(92);
    expect(getBootStageCeiling('landing_interactive')).toBe(100);
  });

  it('clamps direct progress updates into the supported range', () => {
    const { host, calls } = createBootHost();

    expect(publishBootProgress(-15, 'UNDERFLOW', host)).toBe(0);
    expect(publishBootProgress(180, 'OVERFLOW', host)).toBe(100);

    expect(calls).toEqual([
      { type: 'set', progress: 0, label: 'UNDERFLOW' },
      { type: 'set', progress: 100, label: 'OVERFLOW' },
    ]);
  });

  it('ignores progress regressions before completion', () => {
    const { host, calls } = createBootHost();

    expect(publishBootProgress(68, 'APP MOUNTED', host)).toBe(68);
    expect(publishBootProgress(32, 'REACT BOOTSTRAP', host)).toBe(68);

    expect(calls).toEqual([
      { type: 'set', progress: 68, label: 'APP MOUNTED' },
    ]);
    expect(__getBootProgressStateForTest()).toEqual({ progress: 68, completed: false });
  });

  it('ignores later updates once the loader has completed', () => {
    const { host, calls } = createBootHost();

    completeBootProgress(host);
    expect(publishBootProgress(40, 'LATE UPDATE', host)).toBe(100);

    expect(calls).toEqual([
      { type: 'set', progress: 100, label: 'LANDING INTERACTIVE' },
      { type: 'complete' },
    ]);
    expect(__getBootProgressStateForTest()).toEqual({ progress: 100, completed: true });
  });
});
