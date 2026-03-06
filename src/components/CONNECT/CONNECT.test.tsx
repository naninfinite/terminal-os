import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import CONNECT from './CONNECT';
import { ConnectProvider } from '../../connect/ConnectProvider';
import { MeOsProvider } from '../../meos/shell/MeOsProvider';

describe('CONNECT', () => {
  it('renders the current local Tron launcher controls', () => {
    const markup = renderToStaticMarkup(
      <MeOsProvider>
        <ConnectProvider>
          <CONNECT mode="panel" />
        </ConnectProvider>
      </MeOsProvider>
    );

    expect(markup).toContain('LOCAL MATCH');
    expect(markup).toContain('2 PLAYERS');
    expect(markup).toContain('1 LOCAL');
    expect(markup).toContain('START LOCAL');
    expect(markup).toContain('PLAY CPU');
    expect(markup).toContain('ONLINE');
    expect(markup).toContain('JOIN ROOM');
    expect(markup).toContain('CONNECT.EXE');
  });
});
