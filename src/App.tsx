/**
 * `App` controls the top-level flow:
 * - Landing screen (`ENTER.EXE`) with an enter transition.
 * - Desktop shell is lazy-loaded after the landing screen becomes interactive.
 *
 * Design notes:
 * - `entered` gates which screen is mounted.
 * - `exiting` drives the fade-out state before switching to desktop.
 * - Transition timing matches CSS unless reduced-motion is enabled.
 */
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import landingStyles from './components/Landing/Landing.module.scss';
import crt from './styles/crt.module.scss';
import { loadDesktopRuntime } from './components/AppShell/loadDesktopRuntime';
import Cursor from './components/Cursor/Cursor';

type DesktopRuntimeModule = typeof import('./components/AppShell/DesktopRuntime');
type IdleAwareWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const DesktopRuntime = React.lazy(loadDesktopRuntime);

const App: React.FC = () => {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [enterQueued, setEnterQueued] = useState(false);
  const [desktopReady, setDesktopReady] = useState(false);
  const [desktopLoadError, setDesktopLoadError] = useState(false);
  const enterTimeoutRef = useRef<number | null>(null);
  const desktopLoadRef = useRef<Promise<DesktopRuntimeModule> | null>(null);
  const desktopReadyRef = useRef(false);

  const startExit = useCallback(() => {
    if (exiting || entered) return;
    setEnterQueued(false);
    setExiting(true);
  }, [entered, exiting]);

  const markDesktopReady = useCallback(() => {
    desktopReadyRef.current = true;
    setDesktopReady(true);
    setDesktopLoadError(false);
  }, []);

  const primeDesktopRuntime = useCallback((): Promise<DesktopRuntimeModule> => {
    if (desktopLoadRef.current) return desktopLoadRef.current;

    const nextPromise = loadDesktopRuntime();
    desktopLoadRef.current = nextPromise;

    void nextPromise.then(() => {
      markDesktopReady();
    }).catch(() => {
      desktopLoadRef.current = null;
      desktopReadyRef.current = false;
      setDesktopReady(false);
    });

    return nextPromise;
  }, [markDesktopReady]);

  // Shared guard used by click + keyboard triggers to avoid duplicate transitions.
  const triggerEnter = useCallback(() => {
    if (exiting || entered || enterQueued) return;

    setDesktopLoadError(false);

    if (desktopReadyRef.current) {
      startExit();
      return;
    }

    setEnterQueued(true);
    void primeDesktopRuntime()
      .then(() => {
        startExit();
      })
      .catch(() => {
        setEnterQueued(false);
        setDesktopLoadError(true);
      });
  }, [enterQueued, entered, exiting, primeDesktopRuntime, startExit]);

  useEffect(() => {
    const idleWindow = window as IdleAwareWindow;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const preloadDesktopRuntime = () => {
      void primeDesktopRuntime();
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleId = idleWindow.requestIdleCallback(() => {
        preloadDesktopRuntime();
      });
    } else {
      timeoutId = window.setTimeout(() => {
        preloadDesktopRuntime();
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
  }, [primeDesktopRuntime]);

  // Listen for Enter key to start exiting from the landing screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') triggerEnter();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [triggerEnter]);

  // When exiting starts, schedule transition to the desktop after a short delay.
  useEffect(() => {
    if (exiting && !entered) {
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const delayMs = reduce ? 0 : 600; // match CSS transition duration
      if (enterTimeoutRef.current != null) {
        window.clearTimeout(enterTimeoutRef.current);
      }
      enterTimeoutRef.current = window.setTimeout(() => setEntered(true), delayMs);
      return () => {
        if (enterTimeoutRef.current != null) {
          window.clearTimeout(enterTimeoutRef.current);
          enterTimeoutRef.current = null;
        }
      };
    }
  }, [exiting, entered]);

  const waitingForDesktop = enterQueued && !desktopReady && !exiting;
  const enterButtonLabel = desktopLoadError
    ? 'RETRY'
    : exiting
      ? 'ENTERING...'
      : waitingForDesktop
        ? 'LOADING...'
        : 'ENTER';
  const enterStatus = desktopLoadError
    ? 'DESKTOP LOAD FAILED. PRESS ENTER TO RETRY.'
    : exiting
      ? 'ENTERING SHELL...'
      : waitingForDesktop
        ? 'LOADING DESKTOP SHELL...'
        : desktopReady
          ? 'DESKTOP CACHE READY.'
          : 'PRESS ENTER TO LOAD DESKTOP.';
  const runtimeStatus = desktopReady
    ? 'DESKTOP CACHE READY'
    : waitingForDesktop
      ? 'LINKING SHELL...'
      : 'STANDBY';

  return (
    <>
      <Cursor />
      {!entered ? (
        <div
          className={`${landingStyles.landing} ${crt.crt}`}
          data-state={exiting ? 'exiting' : 'idle'}
        >
          <div className={landingStyles.center}>
            <section
              className={landingStyles.landingFrame}
              aria-label="ENTER.EXE"
              aria-busy={waitingForDesktop}
            >
              <header className={landingStyles.landingHeader}>[ENTER.EXE]</header>
              <div className={landingStyles.landingBody}>
                <div className={landingStyles.videoBox} data-loading={waitingForDesktop ? 'true' : 'false'}>
                  <div className={landingStyles.sceneField} aria-hidden="true">
                    <div className={landingStyles.sceneGlow} />
                    <div className={landingStyles.sceneGrid} />
                    <div className={landingStyles.sceneSweep} />
                    <div className={landingStyles.sceneTelemetry}>
                      <span>BOOT SECTOR 01</span>
                      <span>DISPLAY BUS ONLINE</span>
                      <span>{runtimeStatus}</span>
                    </div>
                  </div>
                  <p className={landingStyles.enterStatus} role="status" aria-live="polite" aria-atomic="true">
                    {enterStatus}
                  </p>
                  <button
                    type="button"
                    className={landingStyles.enterBtn}
                    onClick={triggerEnter}
                    aria-label="Enter Terminal-OS"
                    aria-busy={waitingForDesktop}
                    disabled={waitingForDesktop || exiting}
                  >
                    {enterButtonLabel}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <Suspense fallback={null}>
          <DesktopRuntime />
        </Suspense>
      )}
    </>
  );
};

export default App;
