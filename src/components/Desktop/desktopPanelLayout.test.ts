import { describe, expect, it } from 'vitest';
import {
  DESKTOP_HERO_LAYOUT_MAX_WIDTH_PX,
  isDesktopHeroLayoutViewport,
  resolveDesktopPanelStages,
} from './desktopPanelLayout';

describe('desktopPanelLayout helpers', () => {
  it('treats widths above the tablet breakpoint as hero-layout desktop viewports', () => {
    expect(isDesktopHeroLayoutViewport(DESKTOP_HERO_LAYOUT_MAX_WIDTH_PX)).toBe(false);
    expect(isDesktopHeroLayoutViewport(DESKTOP_HERO_LAYOUT_MAX_WIDTH_PX + 1)).toBe(true);
  });

  it('keeps the featured panel on the main stage and preserves rail order for the rest', () => {
    expect(resolveDesktopPanelStages('me')).toEqual({
      me: 'featured',
      you: 'rail-top',
      third: 'rail-middle',
      connect: 'rail-bottom',
    });

    expect(resolveDesktopPanelStages('third')).toEqual({
      me: 'rail-top',
      you: 'rail-middle',
      third: 'featured',
      connect: 'rail-bottom',
    });
  });
});
