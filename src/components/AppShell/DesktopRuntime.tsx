import React, { useEffect } from 'react';
import Desktop from '../Desktop/Desktop';
import StatusBar from '../StatusBar/StatusBar';
import Scanlines from '../Scanlines/Scanlines';
import { ConnectFullscreenLayer } from '../CONNECT/ConnectFullscreenLayer';
import { ThirdFullscreenLayer } from '../THIRD/ThirdFullscreenLayer';
import { YouFullscreenLayer } from '../YOU/YouFullscreenLayer';
import { loadThirdSurface } from '../THIRD/loadThirdSurface';
import shell from './AppShell.module.scss';
import { ConnectProvider } from '../../connect/ConnectProvider';
import { MeOsFullscreenLayer } from '../../meos/shell/MeOsFullscreenLayer';
import { MeOsProvider } from '../../meos/shell/MeOsProvider';
import { MeOsVfsProvider } from '../../meos/vfs/MeOsVfsProvider';
import { ThirdProvider } from '../../third/ThirdProvider';
import { YouProvider } from '../../you/YouProvider';

type IdleAwareWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export type DesktopRuntimeProps = {
  shellRef?: React.Ref<HTMLDivElement>;
  introState?: 'hidden' | 'transitioning' | 'idle';
};

const DesktopRuntime: React.FC<DesktopRuntimeProps> = ({
  shellRef,
  introState = 'idle',
}) => {
  useEffect(() => {
    const idleWindow = window as IdleAwareWindow;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const preloadThirdSurface = () => {
      void loadThirdSurface().catch(() => {
        // Idle preloading failures should not surface to the user.
      });
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleId = idleWindow.requestIdleCallback(() => {
        preloadThirdSurface();
      });
    } else {
      timeoutId = window.setTimeout(() => {
        preloadThirdSurface();
      }, 1200);
    }

    return () => {
      if (idleId != null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <MeOsProvider>
      <MeOsVfsProvider>
        <YouProvider>
          <ThirdProvider>
            <ConnectProvider>
              <div
                ref={shellRef}
                className={shell.shell}
                data-desktop-shell="true"
                data-intro-state={introState}
              >
                <Scanlines />
                <Desktop />
                <StatusBar />
                <YouFullscreenLayer />
                <ThirdFullscreenLayer />
                <ConnectFullscreenLayer />
                <MeOsFullscreenLayer />
              </div>
            </ConnectProvider>
          </ThirdProvider>
        </YouProvider>
      </MeOsVfsProvider>
    </MeOsProvider>
  );
};

export default DesktopRuntime;
