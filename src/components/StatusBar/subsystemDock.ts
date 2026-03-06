import type { MeOsShellScope } from '../../meos/shell/types';

export type SubsystemScope = MeOsShellScope;

export type DockClickIntent = 'focus_panel' | 'feature_panel' | 'open_target_fullscreen' | 'noop';

export const formatGenericDockLabel = (appName: string, count: number): string => (
  count > 0 ? `${appName} (${count})` : appName
);

export const formatMeDockLabel = (windowCount: number): string => (
  formatGenericDockLabel('ME.EXE', windowCount)
);

export const isSameTargetFullscreenNoop = (args: {
  targetScope: SubsystemScope;
  activeFullscreenScope: SubsystemScope | null;
}): boolean => args.activeFullscreenScope != null && args.targetScope === args.activeFullscreenScope;

export const getDockClickIntent = (args: {
  targetScope: SubsystemScope;
  anyFullscreenOpen: boolean;
  activeFullscreenScope: SubsystemScope | null;
  featuredScope: SubsystemScope;
  desktopHeroLayoutEnabled: boolean;
}): DockClickIntent => {
  if (isSameTargetFullscreenNoop(args)) return 'noop';
  if (args.anyFullscreenOpen) return 'open_target_fullscreen';
  if (args.desktopHeroLayoutEnabled) {
    return args.targetScope === args.featuredScope ? 'focus_panel' : 'feature_panel';
  }
  if (args.targetScope === 'you') return 'focus_panel';
  return 'open_target_fullscreen';
};
