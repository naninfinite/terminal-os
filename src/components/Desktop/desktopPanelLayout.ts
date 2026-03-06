import type { MeOsShellScope } from '../../meos/shell/types';

export type DesktopPanelStage = 'featured' | 'rail-top' | 'rail-middle' | 'rail-bottom';

export const DESKTOP_HERO_LAYOUT_MAX_WIDTH_PX = 1024;

const PANEL_ORDER: readonly MeOsShellScope[] = ['me', 'you', 'third', 'connect'];
const RAIL_STAGES: readonly Exclude<DesktopPanelStage, 'featured'>[] = ['rail-top', 'rail-middle', 'rail-bottom'];

export const isDesktopHeroLayoutViewport = (viewportWidth: number): boolean => (
  viewportWidth > DESKTOP_HERO_LAYOUT_MAX_WIDTH_PX
);

export const resolveDesktopPanelStages = (
  featuredPanel: MeOsShellScope
): Record<MeOsShellScope, DesktopPanelStage> => {
  const railScopes = PANEL_ORDER.filter((scope) => scope !== featuredPanel);

  return {
    me: featuredPanel === 'me' ? 'featured' : RAIL_STAGES[railScopes.indexOf('me')] ?? 'rail-bottom',
    you: featuredPanel === 'you' ? 'featured' : RAIL_STAGES[railScopes.indexOf('you')] ?? 'rail-bottom',
    third: featuredPanel === 'third' ? 'featured' : RAIL_STAGES[railScopes.indexOf('third')] ?? 'rail-bottom',
    connect: featuredPanel === 'connect' ? 'featured' : RAIL_STAGES[railScopes.indexOf('connect')] ?? 'rail-bottom',
  };
};
