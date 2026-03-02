import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MeOsVfsProvider } from '../vfs/MeOsVfsProvider';
import { MeOsProvider } from './MeOsProvider';
import { MeOsViewport } from './MeOsViewport';

describe('MeOsViewport', () => {
  it('renders a CLOSE button in the fullscreen chrome', () => {
    const markup = renderToStaticMarkup(
      <MeOsVfsProvider>
        <MeOsProvider>
          <MeOsViewport mode="fullscreen" />
        </MeOsProvider>
      </MeOsVfsProvider>
    );

    expect(markup).toContain('aria-label="Close ME.EXE fullscreen"');
    expect(markup).toContain('>CLOSE<');
  });
});
