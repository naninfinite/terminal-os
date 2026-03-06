import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { MeOsProvider } from '../../meos/shell/MeOsProvider';
import { MeOsVfsProvider } from '../../meos/vfs/MeOsVfsProvider';
import { YouProvider } from '../../you/YouProvider';
import { ThirdProvider } from '../../third/ThirdProvider';
import { ConnectProvider } from '../../connect/ConnectProvider';

vi.mock('../CONNECT/CONNECT', () => ({
  default: () => React.createElement('div', null, 'CONNECT'),
}));
import Desktop from './Desktop';

describe('Desktop', () => {
  const originalWidth = typeof window === 'undefined' ? null : window.innerWidth;

  afterEach(() => {
    if (typeof window === 'undefined' || originalWidth == null) return;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalWidth,
    });
  });

  it('renders explicit panel header actions for subsystem entry', () => {
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: 1440,
      });
    }

    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <MeOsVfsProvider>
          <MeOsProvider>
            <YouProvider>
              <ThirdProvider>
                <ConnectProvider>
                  <Desktop />
                </ConnectProvider>
              </ThirdProvider>
            </YouProvider>
          </MeOsProvider>
        </MeOsVfsProvider>
      </ThemeProvider>
    );

    expect(markup).toContain('ME.EXE');
    expect(markup).toContain('YOU.EXE');
    expect(markup).toContain('THIRD.EXE');
    expect(markup).toContain('CONNECT.EXE');
    expect(markup).toContain('data-featured-panel="me"');
    expect(markup).toContain('>ENTER<');
    expect(markup).toContain('>OPEN<');
    expect(markup).toContain('ENTER SCENE LAB');
    expect((markup.match(/>PROMOTE</g) ?? []).length).toBe(3);
  });
});
