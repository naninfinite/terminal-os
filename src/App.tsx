/**
 * `App` controls the top-level flow:
 * - Landing screen (`ENTER.EXE`) with a GSAP-powered CRT handoff.
 * - Desktop shell is lazy-loaded with retry diagnostics before the transition completes.
 * - Background preloading only runs when startup conditions look favorable.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { loadDesktopRuntime } from './components/AppShell/loadDesktopRuntime';
import {
  createDesktopRuntimeDiagnostic,
  type DesktopLoadErrorKind,
} from './components/AppShell/desktopRuntimeError';
import {
  readDesktopRuntimePreloadSignals,
  shouldPreloadDesktopRuntime,
} from './components/AppShell/desktopRuntimePreload';
import Landing, {
  type LandingPhase,
  type LandingSurfaceHandle,
} from './components/Landing/Landing';
import {
  createLandingIntroTimeline,
  type LandingIntroNodes,
} from './components/Landing/landingIntroMotion';
import Cursor from './components/Cursor/Cursor';

type DesktopRuntimeModule = Awaited<ReturnType<typeof loadDesktopRuntime>>;
type DesktopLoadSource = 'preload' | 'enter';
type IdleAwareWindow = Window & {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const DESKTOP_RUNTIME_RELOAD_SESSION_KEY = 'terminalOS.desktopRuntime.reloadAttempted.v1';

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

const resolveLandingIntroNodes = (
  landingSurface: LandingSurfaceHandle | null,
  desktopShell: HTMLDivElement | null,
): LandingIntroNodes | null => {
  if (
    !landingSurface?.root
    || !landingSurface.frame
    || !landingSurface.scene
    || !landingSurface.field
    || !landingSurface.glow
    || !landingSurface.grid
    || !landingSurface.sweep
    || !landingSurface.telemetry
    || !landingSurface.status
    || !landingSurface.button
    || !desktopShell
  ) {
    return null;
  }

  return {
    root: landingSurface.root,
    frame: landingSurface.frame,
    scene: landingSurface.scene,
    field: landingSurface.field,
    glow: landingSurface.glow,
    grid: landingSurface.grid,
    sweep: landingSurface.sweep,
    telemetry: landingSurface.telemetry,
    status: landingSurface.status,
    button: landingSurface.button,
    flash: landingSurface.flash,
    desktopShell,
    desktopRoot: desktopShell.querySelector<HTMLElement>('[data-desktop-root="true"]'),
    panels: Array.from(desktopShell.querySelectorAll<HTMLElement>('[data-panel-scope]')),
    statusBar: desktopShell.querySelector<HTMLElement>('[data-status-bar="true"]'),
  };
};

const App: React.FC<AppProps> = ({ initialEnterRequested = false }) => {
  const [phase, setPhase] = useState<LandingPhase>('idle');
  const [desktopLoading, setDesktopLoading] = useState(false);
  const [desktopRuntimeModule, setDesktopRuntimeModule] = useState<DesktopRuntimeModule | null>(null);
  const [desktopLoadError, setDesktopLoadError] = useState<string | null>(null);
  const [desktopLoadErrorKind, setDesktopLoadErrorKind] = useState<DesktopLoadErrorKind | null>(null);
  const desktopLoadRef = useRef<Promise<DesktopRuntimeModule> | null>(null);
  const desktopRuntimeModuleRef = useRef<DesktopRuntimeModule | null>(null);
  const desktopReadyRef = useRef(false);
  const initialEnterHandledRef = useRef(false);
  const reloadRequestedRef = useRef(false);
  const landingSurfaceRef = useRef<LandingSurfaceHandle | null>(null);
  const desktopShellRef = useRef<HTMLDivElement | null>(null);
  const bootstrapLandingDismissedRef = useRef(false);

  const clearDesktopLoadError = useCallback(() => {
    setDesktopLoadError(null);
    setDesktopLoadErrorKind(null);
  }, []);

  const markDesktopReady = useCallback((nextModule: DesktopRuntimeModule) => {
    desktopRuntimeModuleRef.current = nextModule;
    setDesktopRuntimeModule(nextModule);
    desktopReadyRef.current = true;
    setDesktopLoading(false);
    clearDesktopLoadError();
  }, [clearDesktopLoadError]);

  const ensureDesktopRuntime = useCallback((): Promise<DesktopRuntimeModule> => {
    if (desktopRuntimeModuleRef.current) {
      return Promise.resolve(desktopRuntimeModuleRef.current);
    }
    if (desktopLoadRef.current) return desktopLoadRef.current;

    setDesktopLoading(true);
    const nextPromise = loadDesktopRuntime()
      .then((nextModule) => {
        markDesktopReady(nextModule);
        return nextModule;
      })
      .catch((error) => {
        if (desktopLoadRef.current === nextPromise) {
          desktopLoadRef.current = null;
        }
        desktopRuntimeModuleRef.current = null;
        desktopReadyRef.current = false;
        setDesktopRuntimeModule(null);
        setDesktopLoading(false);
        throw error;
      });
    desktopLoadRef.current = nextPromise;
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
      setPhase('error');
    }

    return false;
  }, []);

  const startTransition = useCallback(() => {
    if (!desktopReadyRef.current) return;
    setPhase((previous) => (
      previous === 'transitioning' || previous === 'entered' ? previous : 'transitioning'
    ));
  }, []);

  // Shared guard used by click + keyboard triggers to avoid duplicate transitions.
  const triggerEnter = useCallback(() => {
    if (phase === 'loading' || phase === 'transitioning' || phase === 'entered') return;

    reloadRequestedRef.current = false;
    clearDesktopLoadError();

    if (desktopReadyRef.current) {
      startTransition();
      return;
    }

    setPhase('loading');
    setDesktopLoading(true);

    void ensureDesktopRuntime()
      .then(() => {
        if (!reloadRequestedRef.current) {
          startTransition();
        }
      })
      .catch((error) => {
        const reloading = handleDesktopRuntimeFailure(error, 'enter');
        if (!reloading) {
          setDesktopLoading(false);
        }
      });
  }, [clearDesktopLoadError, ensureDesktopRuntime, handleDesktopRuntimeFailure, phase, startTransition]);

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

  useEffect(() => {
    if (phase !== 'transitioning') return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const introNodes = resolveLandingIntroNodes(landingSurfaceRef.current, desktopShellRef.current);
    if (!introNodes) return undefined;

    let cancelled = false;
    const ctx = gsap.context(() => {
      createLandingIntroTimeline(introNodes, {
        reducedMotion: reduceMotion,
        onComplete: () => {
          if (cancelled) return;
          setPhase('entered');
        },
      });
    }, introNodes.root);

    return () => {
      cancelled = true;
      ctx.revert();
    };
  }, [phase]);

  // Listen for Enter key to start the landing transition.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') triggerEnter();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [triggerEnter]);

  const handleLandingReady = useCallback(() => {
    if (bootstrapLandingDismissedRef.current) return;
    bootstrapLandingDismissedRef.current = true;
    window.requestAnimationFrame(() => {
      window.__TERMINAL_OS_LANDING__?.markInteractive();
    });
  }, []);

  const waitingForDesktop = phase === 'loading';
  const transitioning = phase === 'transitioning';
  const desktopReady = desktopReadyRef.current || desktopRuntimeModule != null;
  const renderDesktop = transitioning || phase === 'entered';
  const LandingRuntime = desktopRuntimeModule?.default;
  const enterButtonLabel = desktopLoadError
    ? 'RETRY'
    : transitioning
      ? 'ENTERING...'
      : waitingForDesktop
        ? 'LOADING...'
        : 'ENTER';
  const enterStatus = desktopLoadErrorKind === 'fetch'
    ? 'DESKTOP LOAD FAILED. PRESS ENTER TO RETRY.'
    : desktopLoadError != null
      ? 'DESKTOP LOAD CRASHED. PRESS ENTER TO RETRY.'
      : transitioning
        ? 'ENTERING SHELL...'
        : waitingForDesktop
          ? 'LOADING DESKTOP...'
          : 'PRESS ENTER TO LOAD DESKTOP.';
  const runtimeStatus = desktopLoadError != null
    ? 'RETRY STANDBY'
    : transitioning || waitingForDesktop
      ? 'LINKING SHELL...'
      : desktopReady
        ? 'DESKTOP CACHE READY'
        : desktopLoading
          ? 'PRIMING CACHE...'
        : 'STANDBY';

  return (
    <>
      <Cursor />
      {renderDesktop && LandingRuntime ? (
        <LandingRuntime
          shellRef={desktopShellRef}
          introState={transitioning ? 'transitioning' : 'idle'}
        />
      ) : null}
      {phase !== 'entered' ? (
        <Landing
          ref={landingSurfaceRef}
          phase={phase}
          busy={waitingForDesktop || transitioning}
          sceneLoading={waitingForDesktop}
          buttonLabel={enterButtonLabel}
          status={enterStatus}
          runtimeStatus={runtimeStatus}
          onEnter={triggerEnter}
          disabled={waitingForDesktop || transitioning}
          onReady={handleLandingReady}
        />
      ) : null}
    </>
  );
};

export default App;
