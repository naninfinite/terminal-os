import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { CONTACT_CARD_ID } from '../../vfs/seed';
import { MeOsVfsProvider } from '../../vfs/MeOsVfsProvider';
import type { MeOsWindow } from '../../shell/types';
import FileViewerWindow from './FileViewerWindow';

describe('FileViewerWindow', () => {
  it('renders the naninfinite portrait for contact cards', () => {
    const win: MeOsWindow = {
      id: 'contact-window',
      title: 'Contact',
      appId: 'viewer_contact',
      x: 0,
      y: 0,
      width: 480,
      height: 320,
      zIndex: 1,
      minimized: false,
      maximized: false,
      nodeId: CONTACT_CARD_ID,
      viewerKind: 'contact',
    };

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <MeOsVfsProvider>
          <FileViewerWindow win={win} />
        </MeOsVfsProvider>
      </ThemeProvider>
    );

    expect(markup).toContain('alt="Naninfinite portrait"');
    expect(markup).not.toContain('>AV<');
  });
});
