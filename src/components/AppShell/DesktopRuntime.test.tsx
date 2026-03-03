import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../THIRD/loadThirdSurface', () => ({
  loadThirdSurface: async () => ({
    default: () => React.createElement('div', null, 'THIRD'),
  }),
  ThirdLoadingSurface: () => React.createElement('div', null, 'Loading THIRD'),
}));

vi.mock('../Desktop/Desktop', () => ({
  default: () => React.createElement('div', { 'data-desktop-root': 'true' }, 'Desktop'),
}));

vi.mock('../StatusBar/StatusBar', () => ({
  default: () => React.createElement('div', { 'data-status-bar': 'true' }, 'Status'),
}));

import DesktopRuntime from './DesktopRuntime';

describe('DesktopRuntime', () => {
  it('renders the desktop shell intro markers', () => {
    const markup = renderToStaticMarkup(
      <DesktopRuntime introState="hidden" />
    );

    expect(markup).toContain('data-desktop-shell="true"');
    expect(markup).toContain('data-intro-state="hidden"');
    expect(markup).toContain('data-desktop-root="true"');
    expect(markup).toContain('data-status-bar="true"');
  });
});
