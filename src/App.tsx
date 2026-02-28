/**
 * `App` controls the top-level flow:
 * - Landing screen (`ENTER.EXE`) with an enter transition.
 * - Desktop shell is lazy-loaded with retry diagnostics before the transition completes.
 * - Background preloading only runs when startup conditions look favorable.
 *
 * Design notes:
 * - `entered` gates which screen is mounted.
 * - `exiting` drives the fade-out state before switching to desktop.
 * - Transition timing matches CSS unless reduced-motion is enabled.
 */
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { loadDesktopRuntime } from './components/AppShell/loadDesktopRuntime';
import {
  createDesktopRuntimeDiagnostic,
  type DesktopLoadErrorKind,
} from './components/AppShell/desktopRuntimeError';
import {
  readDesktopRuntimePreloadSignals,
  shouldPreloadDesktopRuntime,
} from './components/AppShell/desktopRuntimePreload';
import landingStyles from './components/Landing/Landing.module.scss';
import crt from './styles/crt.module.scss';
import Cursor from './components/Cursor/Cursor';

type DesktopRuntimeModule = typeof import('./components/AppShell/DesktopRuntime');
type DesktopLoadSource = 'preload' | 'enter';
type IdleAwareWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const DESKTOP_RUNTIME_RELOAD_SESSION_KEY = 'terminalOS.desktopRuntime.reloadAttempted.v1';
const DesktopRuntime = React.lazy(loadDesktopRuntime);

type AppProps = {
  initialEnterRequested?: boolean;
};

const hasDesktopReloadAttempted = (): boolean => {
  try {
    return window.sessionStorage.getItem(DESKTOP_RUNTIME_RELOAD_SESSION_KEY) === '1';
  } catch (error) {
    return false;
  }
};

const markDesktopReloadAttempted = (): void => {
  try {
    window.sessionStorage.setItem(DESKTOP_RUNTIME_RELOAD_SESSION_KEY, '1');
  } catch (error) {
    // Session storage is only used to prevent reload loops for stale chunk fetch failures.
  }
};

const App: React.FC<AppProps> = ({ initialEnterRequested = false }) => {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [enterQueued, setEnterQueued] = useState(false);
  const [desktopReady, setDesktopReady] = useState(false);
  const [desktopLoading, setDesktopLoading] = useState(false);
  const [desktopLoadError, setDesktopLoadError] = useState<string | null>(null);
  const [desktopLoadErrorKind, setDesktopLoadErrorKind] = useState<DesktopLoadErrorKind | null>(null);
  const enterTimeoutRef = useRef<number | null>(null);
  const desktopLoadRef = useRef<Promise<DesktopRuntimeModule> | null>(null);
  const desktopReadyRef = useRef(false);
  const initialEnterHandledRef = useRef(false);
  const reloadRequestedRef = useRef(false);

  const clearDesktopLoadError = useCallback(() => {
    setDesktopLoadError(null);
    setDesktopLoadErrorKind(null);
  }, []);

  const markDesktopReady = useCallback(() => {
    desktopReadyRef.current = true;
    setDesktopReady(true);
    setDesktopLoading(false);
    clearDesktopLoadError();
  }, [clearDesktopLoadError]);

  const ensureDesktopRuntime = useCallback((): Promise<DesktopRuntimeModule> => {
    if (desktopLoadRef.current) return desktopLoadRef.current;

    setDesktopLoading(true);
    const nextPromise = loadDesktopRuntime();
    desktopLoadRef.current = nextPromise;

    void nextPromise.then(() => {
      markDesktopReady();
    }).catch(() => {
      if (desktopLoadRef.current === nextPromise) {
        desktopLoadRef.current = null;
      }
      desktopReadyRef.current = false;
      setDesktopReady(false);
      setDesktopLoading(false);
    });

    return nextPromise;
  }, [markDesktopReady]);

  const handleDesktopRuntimeFailure = useCallback((error: unknown, source: DesktopLoadSource): boolean => {
    const diagnostic = createDesktopRuntimeDiagnostic(error);

    if (import.meta.env.DEV) {
      console.error('Desktop runtime load failed.', diagnostic);
    }

    if (diagnostic.kind === 'fetch' && !hasDesktopReloadAttempted()) {
      markDesktopReloadAttempted();
      reloadRequestedRef.current = true;
      window.location.reload();
      return true;
    }

    if (source === 'enter') {
      setDesktopLoadError(diagnostic.message);
      setDesktopLoadErrorKind(diagnostic.kind);
    }

    return false;
  }, []);

  const startExit = useCallback(() => {
    if (exiting || entered) return;
    setEnterQueued(false);
    setExiting(true);
  }, [entered, exiting]);

  // Shared guard used by click + keyboard triggers to avoid duplicate transitions.
  const triggerEnter = useCallback(() => {
    if (exiting || entered || enterQueued) return;

    reloadRequestedRef.current = false;
    clearDesktopLoadError();

    if (desktopReadyRef.current) {
      startExit();
      return;
    }

    setEnterQueued(true);
    setDesktopLoading(true);

    void ensureDesktopRuntime()
      .then(() => {
        if (!reloadRequestedRef.current) {
          startExit();
        }
      })
      .catch((error) => {
        const reloading = handleDesktopRuntimeFailure(error, 'enter');
        if (!reloading) {
          setEnterQueued(false);
        }
      });
  }, [clearDesktopLoadError, ensureDesktopRuntime, enterQueued, entered, exiting, handleDesktopRuntimeFailure, startExit]);

  useEffect(() => {
    const preloadSignals = readDesktopRuntimePreloadSignals(
      window.navigator,
      typeof window.performance?.now === 'function' ? window.performance.now() : 0
    );
    if (!shouldPreloadDesktopRuntime(preloadSignals)) {
      return;
    }

    const idleWindow = window as IdleAwareWindow;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const preloadDesktopRuntime = () => {
      void ensureDesktopRuntime().catch((error) => {
        void handleDesktopRuntimeFailure(error, 'preload');
      });
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
  }, [ensureDesktopRuntime, handleDesktopRuntimeFailure]);

  useEffect(() => {
    if (!initialEnterRequested || initialEnterHandledRef.current) return;
    initialEnterHandledRef.current = true;
    triggerEnter();
  }, [initialEnterRequested, triggerEnter]);

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

  const waitingForDesktop = enterQueued && desktopLoading && !exiting;
  const enterButtonLabel = desktopLoadError
    ? 'RETRY'
    : exiting
      ? 'ENTERING...'
      : waitingForDesktop
        ? 'LOADING...'
        : 'ENTER';
  const enterStatus = desktopLoadErrorKind === 'fetch'
    ? 'DESKTOP LOAD FAILED. PRESS ENTER TO RETRY.'
    : desktopLoadError != null
      ? 'DESKTOP LOAD CRASHED. PRESS ENTER TO RETRY.'
      : exiting
        ? 'ENTERING SHELL...'
        : waitingForDesktop
          ? 'LOADING DESKTOP...'
          : 'PRESS ENTER TO LOAD DESKTOP.';
  const runtimeStatus = desktopLoadError != null
    ? 'RETRY STANDBY'
    : exiting || waitingForDesktop
      ? 'LINKING SHELL...'
      : desktopReady
        ? 'DESKTOP CACHE READY'
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
              aria-busy={waitingForDesktop || exiting}
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
                    aria-busy={waitingForDesktop || exiting}
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
