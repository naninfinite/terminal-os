import { describe, expect, it } from 'vitest';
import { resolveConfiguredVideoPosterSrc, resolveVideoPosterSrc } from './mediaPreview';

describe('mediaPreview', () => {
  it('resolves configured video poster assets from the thumbnail registry', () => {
    const poster = resolveConfiguredVideoPosterSrc({
      id: 'reel_mp4',
      name: 'Reel.mp4',
      type: 'file',
      parentId: 'videos',
      kind: 'video',
      videoThumbnailId: 'reel_cover',
    });

    expect(poster).toBeTruthy();
    expect(poster?.startsWith('data:image/svg+xml')).toBe(false);
  });

  it('falls back to a generated poster when a video has no configured thumbnail', () => {
    const poster = resolveVideoPosterSrc({
      id: 'clip_mp4',
      name: 'Clip.mp4',
      type: 'file',
      parentId: 'videos',
      kind: 'video',
    }, 'dark');

    expect(poster.startsWith('data:image/svg+xml')).toBe(true);
  });
});
