export const PANEL_PREVIEW_DEFAULT_COUNT = 5;
export const PANEL_PREVIEW_MIN_COUNT = 1;
export const PANEL_PREVIEW_MAX_COUNT = 20;

const PANEL_FEED_PADDING_PX = 12;
const PANEL_FEED_ROW_ESTIMATE_PX = 74;
const PANEL_FEED_ROW_GAP_PX = 6;

const clamp = (value: number, min: number, max: number): number => (
  Math.max(min, Math.min(max, value))
);

export const derivePanelPreviewLimit = (feedHeightPx: number): number => {
  if (!Number.isFinite(feedHeightPx) || feedHeightPx <= 0) {
    return PANEL_PREVIEW_DEFAULT_COUNT;
  }

  const usableHeight = Math.max(0, feedHeightPx - PANEL_FEED_PADDING_PX);
  const estimatedRowUnit = PANEL_FEED_ROW_ESTIMATE_PX + PANEL_FEED_ROW_GAP_PX;
  const estimatedRows = Math.floor((usableHeight + PANEL_FEED_ROW_GAP_PX) / estimatedRowUnit);

  return clamp(estimatedRows, PANEL_PREVIEW_MIN_COUNT, PANEL_PREVIEW_MAX_COUNT);
};
