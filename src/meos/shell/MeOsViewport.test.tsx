import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MeOsVfsProvider } from '../vfs/MeOsVfsProvider';
import { MeOsProvider } from './MeOsProvider';
import { MeOsViewport, isPanelBackgroundTarget } from './MeOsViewport';

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
    expect(markup).toContain('ME.EXE</span><button');
    expect(markup).toContain('Home');
    expect(markup).toContain('Media');
    expect(markup).toContain('About');
    expect(markup).toContain('Contact');
    expect(markup).not.toContain('draggable="true"');
    expect(markup).not.toContain('Projects');
    expect(markup).not.toContain('Archive');
    expect(markup).not.toContain('README.txt');
  });

  it('marks the panel desktop surface as a valid background target', () => {
    const markup = renderToStaticMarkup(
      <MeOsVfsProvider>
        <MeOsProvider>
          <MeOsViewport mode="panel" />
        </MeOsProvider>
      </MeOsVfsProvider>
    );

    expect(markup).toContain('data-meos-stage-background="true"');
  });

  it('treats the stage itself as panel background', () => {
    const stageTarget = { id: 'stage' } as unknown as EventTarget;

    expect(isPanelBackgroundTarget(stageTarget, stageTarget)).toBe(true);
  });

  it('treats only the marked desktop surface as panel background', () => {
    const stageTarget = { id: 'stage' } as unknown as EventTarget;
    const desktopSurfaceTarget = { dataset: { meosStageBackground: 'true' } } as unknown as EventTarget;
    const entryTarget = { dataset: {} } as unknown as EventTarget;

    expect(isPanelBackgroundTarget(desktopSurfaceTarget, stageTarget)).toBe(true);
    expect(isPanelBackgroundTarget(entryTarget, stageTarget)).toBe(false);
  });
});
