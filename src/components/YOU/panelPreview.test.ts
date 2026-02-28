import { describe, expect, it } from 'vitest';
import {
  PANEL_PREVIEW_DEFAULT_COUNT,
  derivePanelPreviewFit,
} from './panelPreview';

describe('panel preview sizing helper', () => {
  it('returns the default preview count for invalid feed heights', () => {
    expect(derivePanelPreviewFit({
      feedHeightPx: NaN,
      itemHeightsPx: [48, 52],
      gapPx: 6,
      paddingTopPx: 6,
      paddingBottomPx: 6,
    })).toEqual({
      visibleCount: PANEL_PREVIEW_DEFAULT_COUNT,
      usedHeightPx: 0,
      hasSpareSpace: false,
    });

    expect(derivePanelPreviewFit({
      feedHeightPx: 0,
      itemHeightsPx: [48, 52],
      gapPx: 6,
      paddingTopPx: 6,
      paddingBottomPx: 6,
    })).toEqual({
      visibleCount: PANEL_PREVIEW_DEFAULT_COUNT,
      usedHeightPx: 0,
      hasSpareSpace: false,
    });
  });

  it('fits exact counts with variable message heights', () => {
    expect(derivePanelPreviewFit({
      feedHeightPx: 210,
      itemHeightsPx: [60, 90, 40],
      gapPx: 10,
      paddingTopPx: 8,
      paddingBottomPx: 8,
    })).toEqual({
      visibleCount: 2,
      usedHeightPx: 176,
      hasSpareSpace: false,
    });
  });

  it('includes feed gap and padding when calculating the fit', () => {
    expect(derivePanelPreviewFit({
      feedHeightPx: 141,
      itemHeightsPx: [60, 60],
      gapPx: 10,
      paddingTopPx: 5,
      paddingBottomPx: 5,
    })).toEqual({
      visibleCount: 2,
      usedHeightPx: 140,
      hasSpareSpace: false,
    });
  });

  it('does not cap tall viewports at twenty messages', () => {
    expect(derivePanelPreviewFit({
      feedHeightPx: 2_000,
      itemHeightsPx: Array.from({ length: 40 }, () => 40),
      gapPx: 4,
      paddingTopPx: 6,
      paddingBottomPx: 6,
    })).toEqual({
      visibleCount: 40,
      usedHeightPx: 1_768,
      hasSpareSpace: true,
    });
  });

  it('flags spare space only when every loaded message fits', () => {
    expect(derivePanelPreviewFit({
      feedHeightPx: 200,
      itemHeightsPx: [40, 40, 40],
      gapPx: 10,
      paddingTopPx: 5,
      paddingBottomPx: 5,
    })).toEqual({
      visibleCount: 3,
      usedHeightPx: 150,
      hasSpareSpace: true,
    });
  });

  it('does not flag spare space when the next message would overflow', () => {
    expect(derivePanelPreviewFit({
      feedHeightPx: 200,
      itemHeightsPx: [40, 40, 40, 60],
      gapPx: 10,
      paddingTopPx: 5,
      paddingBottomPx: 5,
    })).toEqual({
      visibleCount: 3,
      usedHeightPx: 150,
      hasSpareSpace: false,
    });
  });
});
