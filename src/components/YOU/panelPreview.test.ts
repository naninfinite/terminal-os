import { describe, expect, it } from 'vitest';
import {
  PANEL_PREVIEW_DEFAULT_COUNT,
  PANEL_PREVIEW_MAX_COUNT,
  PANEL_PREVIEW_MIN_COUNT,
  derivePanelPreviewLimit,
} from './panelPreview';

describe('panel preview sizing helper', () => {
  it('returns default count for invalid heights', () => {
    expect(derivePanelPreviewLimit(NaN)).toBe(PANEL_PREVIEW_DEFAULT_COUNT);
    expect(derivePanelPreviewLimit(0)).toBe(PANEL_PREVIEW_DEFAULT_COUNT);
    expect(derivePanelPreviewLimit(-10)).toBe(PANEL_PREVIEW_DEFAULT_COUNT);
  });

  it('clamps tiny feed heights to at least one message', () => {
    expect(derivePanelPreviewLimit(12)).toBe(PANEL_PREVIEW_MIN_COUNT);
    expect(derivePanelPreviewLimit(24)).toBe(PANEL_PREVIEW_MIN_COUNT);
  });

  it('scales message count with feed height', () => {
    expect(derivePanelPreviewLimit(180)).toBe(2);
    expect(derivePanelPreviewLimit(340)).toBe(4);
    expect(derivePanelPreviewLimit(500)).toBe(6);
  });

  it('caps message count at configured maximum', () => {
    expect(derivePanelPreviewLimit(5000)).toBe(PANEL_PREVIEW_MAX_COUNT);
  });
});
