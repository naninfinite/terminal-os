import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import DigitalRain from './DigitalRain';

describe('DigitalRain', () => {
  it('renders the default rain wrapper and canvas markers', () => {
    const markup = renderToStaticMarkup(
      <DigitalRain enabled={false} />
    );

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('data-digital-rain="true"');
    expect(markup).toContain('data-direction="rtl"');
    expect(markup).toContain('data-enabled="false"');
    expect(markup).toContain('<canvas');
  });

  it('renders explicit override markers', () => {
    const markup = renderToStaticMarkup(
      <DigitalRain enabled direction="ltr" fps={24} fontSize={18} speed={1.4} />
    );

    expect(markup).toContain('data-direction="ltr"');
    expect(markup).toContain('data-enabled="true"');
  });
});
