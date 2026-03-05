import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CONNECT from './CONNECT';
import { ConnectProvider } from '../../connect/ConnectProvider';

describe('CONNECT', () => {
  it('renders the Tron launcher controls and keyboard hint', () => {
    const markup = renderToStaticMarkup(
      <ConnectProvider>
        <CONNECT mode="panel" />
      </ConnectProvider>
    );

    expect(markup).toContain('QUICK MATCH');
    expect(markup).toContain('PLAY CPU');
    expect(markup).toContain('JOIN ROOM');
    expect(markup).toContain('WASD / ARROW KEYS TO STEER. NO REVERSE TURNS.');
  });
});
