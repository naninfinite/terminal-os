const PORTRAIT_MEDIA_MAX_HEIGHT = 680;
const PORTRAIT_WINDOW_FRAME_WIDTH = 32;
const PORTRAIT_WINDOW_FRAME_HEIGHT = 74;

export const resolvePortraitImageViewerSize = (
  naturalWidth: number,
  naturalHeight: number
): { width: number; height: number } | null => {
  if (!Number.isFinite(naturalWidth) || !Number.isFinite(naturalHeight)) return null;
  if (naturalWidth <= 0 || naturalHeight <= 0) return null;
  if (naturalWidth >= naturalHeight) return null;

  const aspect = naturalWidth / naturalHeight;
  const mediaHeight = Math.min(PORTRAIT_MEDIA_MAX_HEIGHT, naturalHeight);
  const mediaWidth = Math.round(mediaHeight * aspect);

  return {
    width: Math.max(260, mediaWidth + PORTRAIT_WINDOW_FRAME_WIDTH),
    height: Math.max(180, mediaHeight + PORTRAIT_WINDOW_FRAME_HEIGHT),
  };
};
