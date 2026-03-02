import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { HOME_ID } from '../../vfs/seed';
import { MeOsVfsProvider } from '../../vfs/MeOsVfsProvider';
import { MeOsProvider } from '../../shell/MeOsProvider';
import FileManWindow, { shouldUseMediaFrameHighlight } from './FileManWindow';

describe('FileManWindow', () => {
  it('uses thumbnail-frame highlighting only for grid media entries', () => {
    const imageNode = {
      id: 'portrait_png',
      name: 'Portrait.png',
      type: 'file' as const,
      parentId: 'photos',
      kind: 'image' as const,
    };

    expect(shouldUseMediaFrameHighlight(imageNode, 'grid')).toBe(true);
    expect(shouldUseMediaFrameHighlight(imageNode, 'list')).toBe(false);
    expect(shouldUseMediaFrameHighlight({
      id: 'photos',
      name: 'Photos',
      type: 'folder',
      parentId: 'media',
    }, 'grid')).toBe(false);
  });

  it('renders grid and list view controls', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <MeOsVfsProvider>
          <MeOsProvider>
            <FileManWindow
              win={{
                id: 'folder_home',
                title: 'Home',
                appId: 'folder',
                x: 0,
                y: 0,
                width: 640,
                height: 480,
                zIndex: 1,
                minimized: false,
                maximized: false,
                nodeId: HOME_ID,
              }}
            />
          </MeOsProvider>
        </MeOsVfsProvider>
      </ThemeProvider>
    );

    expect(markup).toContain('Folder layout');
    expect(markup).toContain('>GRID<');
    expect(markup).toContain('>LIST<');
    expect(markup).toContain('aria-pressed="true"');
  });
});
