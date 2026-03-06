import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CONNECT from './CONNECT';
import { ConnectProvider } from '../../connect/ConnectProvider';
import { MeOsProvider } from '../../meos/shell/MeOsProvider';

describe('CONNECT', () => {
  it('renders the expanded Tron launcher controls and quick-match size picker', () => {
    const markup = renderToStaticMarkup(
      <MeOsProvider>
        <ConnectProvider>
          <CONNECT mode="panel" />
        </ConnectProvider>
      </MeOsProvider>
    );

    expect(markup).toContain('QUICK 2P');
    expect(markup).toContain('QUICK 4P');
    expect(markup).toContain('CUSTOM MATCH');
    expect(markup).toContain('PLAY CPU');
    expect(markup).toContain('JOIN ROOM');
    expect(markup).toContain('CONNECT.EXE');
  });
});
