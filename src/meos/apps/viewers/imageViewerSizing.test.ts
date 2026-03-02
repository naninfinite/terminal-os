import { describe, expect, it } from 'vitest';
import { resolvePortraitImageViewerSize } from './imageViewerSizing';

describe('imageViewerSizing', () => {
  it('returns a taller window size for portrait images', () => {
    expect(resolvePortraitImageViewerSize(1080, 1920)).toEqual({
      width: 415,
      height: 754,
    });
  });

  it('does not resize landscape images', () => {
    expect(resolvePortraitImageViewerSize(1920, 1080)).toBeNull();
  });
});
