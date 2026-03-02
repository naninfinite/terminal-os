import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MeOsVfsProvider } from '../vfs/MeOsVfsProvider';
import { MeOsProvider } from './MeOsProvider';
import { MeOsViewport } from './MeOsViewport';

describe('MeOsViewport', () => {
  it('renders the fullscreen chrome and the fixed desktop aliases', () => {
    const markup = renderToStaticMarkup(
      <MeOsVfsProvider>
        <MeOsProvider>
          <MeOsViewport mode="fullscreen" />
        </MeOsProvider>
      </MeOsVfsProvider>
    );

    expect(markup).toContain('aria-label="Close ME.EXE fullscreen"');
    expect(markup).toContain('>CLOSE<');
    expect(markup).toContain('Home');
    expect(markup).toContain('Media');
    expect(markup).toContain('About');
    expect(markup).toContain('Contact');
    expect(markup).not.toContain('draggable="true"');
    expect(markup).not.toContain('Projects');
    expect(markup).not.toContain('Archive');
    expect(markup).not.toContain('README.txt');
  });
});
