import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { MeOsProvider } from '../../shell/MeOsProvider';
import { CONTACT_CARD_ID, README_ID, SNAKE_GAME_ID } from '../../vfs/seed';
import { MeOsVfsProvider } from '../../vfs/MeOsVfsProvider';
import type { MeOsWindow } from '../../shell/types';
import FileViewerWindow from './FileViewerWindow';

describe('FileViewerWindow', () => {
  it('renders the naninfinite portrait for contact cards without placeholder channels', () => {
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
          <MeOsProvider>
            <FileViewerWindow win={win} />
          </MeOsProvider>
        </MeOsVfsProvider>
      </ThemeProvider>
    );

    expect(markup).toContain('alt="Naninfinite portrait"');
    expect(markup).toContain('https://github.com/naninfinite');
    expect(markup).not.toContain('add-email@example.com');
    expect(markup).not.toContain('your-handle');
  });

  it('renders the Start Here hub recommendations from the canonical README node', () => {
    const win: MeOsWindow = {
      id: 'readme-window',
      title: 'README.txt',
      appId: 'viewer_text',
      x: 0,
      y: 0,
      width: 560,
      height: 390,
      zIndex: 1,
      minimized: false,
      maximized: false,
      nodeId: README_ID,
      viewerKind: 'text',
    };

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <MeOsVfsProvider>
          <MeOsProvider>
            <FileViewerWindow win={win} />
          </MeOsProvider>
        </MeOsVfsProvider>
      </ThemeProvider>
    );

    expect(markup).toContain('ME.EXE World Hub');
    expect(markup).toContain('OPEN PROJECTS');
    expect(markup).toContain('OPEN MEDIA');
    expect(markup).toContain('OPEN ABOUT');
  });

  it('renders the embedded snake game viewer', () => {
    const win: MeOsWindow = {
      id: 'snake-window',
      title: 'Snake.exe',
      appId: 'viewer_game',
      x: 0,
      y: 0,
      width: 540,
      height: 640,
      zIndex: 1,
      minimized: false,
      maximized: false,
      nodeId: SNAKE_GAME_ID,
      viewerKind: 'game',
    };

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <MeOsVfsProvider>
          <MeOsProvider>
            <FileViewerWindow win={win} />
          </MeOsProvider>
        </MeOsVfsProvider>
      </ThemeProvider>
    );

    expect(markup).toContain('<canvas');
    expect(markup).toContain('NOKIA MODE');
    expect(markup).toContain('Snake board 18 by 12');
    expect(markup).toContain('>START<');
  });
});
