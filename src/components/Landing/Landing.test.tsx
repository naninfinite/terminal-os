import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import Landing from './Landing';

describe('Landing', () => {
  it('renders the landing surface markers and idle copy', () => {
    const markup = renderToStaticMarkup(
      <Landing
        phase="idle"
        busy={false}
        sceneLoading={false}
        buttonLabel="ENTER"
        status="PRESS ENTER TO LOAD DESKTOP."
        runtimeStatus="STANDBY"
        onEnter={vi.fn()}
        disabled={false}
      />
    );

    expect(markup).toContain('data-landing-root="true"');
    expect(markup).toContain('data-landing-scene="true"');
    expect(markup).toContain('data-landing-telemetry="true"');
    expect(markup).toContain('data-landing-status="true"');
    expect(markup).toContain('data-landing-enter="true"');
    expect(markup).toContain('PRESS ENTER TO LOAD DESKTOP.');
    expect(markup).toContain('>ENTER<');
    expect(markup).toContain('aria-busy="false"');
  });

  it('renders the busy loading state with a disabled button', () => {
    const markup = renderToStaticMarkup(
      <Landing
        phase="loading"
        busy
        sceneLoading
        buttonLabel="LOADING..."
        status="LOADING DESKTOP..."
        runtimeStatus="LINKING SHELL..."
        onEnter={vi.fn()}
        disabled
      />
    );

    expect(markup).toContain('data-state="loading"');
    expect(markup).toContain('data-loading="true"');
    expect(markup).toContain('LOADING DESKTOP...');
    expect(markup).toContain('>LOADING...<');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('aria-busy="true"');
  });
});
