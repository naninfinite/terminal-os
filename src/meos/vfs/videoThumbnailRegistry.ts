import reelCover from '../../assets/images/juno_thumbnail.jpg';

export const VIDEO_THUMBNAIL_REGISTRY = {
  reel_cover: reelCover,
} as const;

export const resolveVideoThumbnailAsset = (thumbnailId?: string): string | null => {
  if (!thumbnailId) return null;
  return VIDEO_THUMBNAIL_REGISTRY[thumbnailId as keyof typeof VIDEO_THUMBNAIL_REGISTRY] ?? null;
};
