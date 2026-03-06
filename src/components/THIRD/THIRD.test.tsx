import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { ThirdProvider } from '../../third/ThirdProvider';
import THIRD from './THIRD';
import {
  resetThirdUtilityPanelSessionForTests,
  setThirdUtilityPanelSession,
} from './thirdUtilityPanelSession';

describe('THIRD', () => {
  afterEach(() => {
    resetThirdUtilityPanelSessionForTests();
  });

  it('keeps panel mode as a preview even when utility state wants the panel open', () => {
    setThirdUtilityPanelSession({
      panelVisible: true,
      activeTab: 'object',
    });

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ThirdProvider>
          <THIRD mode="panel" />
        </ThirdProvider>
      </ThemeProvider>
    );

    expect(markup).not.toContain('THIRD utility panel');
    expect(markup).not.toContain('third-utility-tab-panel-object');
    expect(markup).not.toContain('THIRD scene toolbar');
  });

  it('renders fullscreen scene-lab tabs as scene, object, and camera', () => {
    setThirdUtilityPanelSession({
      panelVisible: true,
      activeTab: 'object',
    });

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ThirdProvider>
          <THIRD mode="fullscreen" />
        </ThirdProvider>
      </ThemeProvider>
    );

    expect(markup).toContain('THIRD utility panel');
    expect(markup).toContain('third-utility-tab-fullscreen-scene');
    expect(markup).toContain('third-utility-tab-fullscreen-object');
    expect(markup).toContain('third-utility-tab-fullscreen-camera');
    expect(markup).not.toContain('third-utility-tab-fullscreen-material');
    expect(markup).not.toContain('third-utility-tab-fullscreen-physics');
  });
});
