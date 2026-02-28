export const PANEL_PREVIEW_DEFAULT_COUNT = 5;
export const PANEL_PREVIEW_TOLERANCE_PX = 1;

export type DerivePanelPreviewFitInput = {
  feedHeightPx: number;
  itemHeightsPx: number[];
  gapPx: number;
  paddingTopPx: number;
  paddingBottomPx: number;
  tolerancePx?: number;
};

export type PanelPreviewFit = {
  visibleCount: number;
  usedHeightPx: number;
  hasSpareSpace: boolean;
};

const normalizeLengthPx = (value: number): number => (
  Number.isFinite(value) && value > 0 ? value : 0
);

export const derivePanelPreviewFit = ({
  feedHeightPx,
  itemHeightsPx,
  gapPx,
  paddingTopPx,
  paddingBottomPx,
  tolerancePx = PANEL_PREVIEW_TOLERANCE_PX,
}: DerivePanelPreviewFitInput): PanelPreviewFit => {
  if (!Number.isFinite(feedHeightPx) || feedHeightPx <= 0) {
    return {
      visibleCount: PANEL_PREVIEW_DEFAULT_COUNT,
      usedHeightPx: 0,
      hasSpareSpace: false,
    };
  }

  const availableHeightPx = normalizeLengthPx(feedHeightPx);
  const gapHeightPx = normalizeLengthPx(gapPx);
  const topPaddingPx = normalizeLengthPx(paddingTopPx);
  const bottomPaddingPx = normalizeLengthPx(paddingBottomPx);
  const tolerance = normalizeLengthPx(tolerancePx);

  let visibleCount = 0;
  let usedHeightPx = topPaddingPx + bottomPaddingPx;

  for (const rawItemHeightPx of itemHeightsPx) {
    const itemHeightPx = normalizeLengthPx(rawItemHeightPx);
    const nextHeightPx = visibleCount === 0
      ? usedHeightPx + itemHeightPx
      : usedHeightPx + gapHeightPx + itemHeightPx;

    if (nextHeightPx - availableHeightPx > tolerance) break;

    usedHeightPx = nextHeightPx;
    visibleCount += 1;
  }

  const allMeasuredItemsFit = visibleCount >= itemHeightsPx.length;

  return {
    visibleCount,
    usedHeightPx,
    hasSpareSpace: allMeasuredItemsFit && (availableHeightPx - usedHeightPx > tolerance),
  };
};
