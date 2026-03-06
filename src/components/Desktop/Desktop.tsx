/**
 * `Desktop` lays out the main set of panels (ME/YOU/THIRD/CONNECT) in a grid.
 * Responsive behavior is handled in `Desktop.module.scss`; this component only
 * composes app panels and passes panel-specific layout flags.
 */
import React, { Suspense, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { gsap } from 'gsap';
import Panel from '../Panel/Panel';
import ME from '../ME/ME';
import YOU from '../YOU/YOU';
import CONNECT from '../CONNECT/CONNECT';
import styles from './Desktop.module.scss';
import { useMeOs } from '../../meos/shell/MeOsProvider';
import { useThirdRuntime } from '../../third/ThirdProvider';
import { useConnectRuntime } from '../../connect/ConnectProvider';
import { useYouBoard } from '../../you/YouProvider';
import { loadThirdSurface, ThirdLoadingSurface } from '../THIRD/loadThirdSurface';
import {
  isDesktopHeroLayoutViewport,
  resolveDesktopPanelStages,
} from './desktopPanelLayout';
import {
  getDesktopReducedMotionQuery,
  getInitialDesktopReducedMotion,
  measureDesktopStageRect,
  resolveDesktopStageFlip,
  shouldAnimateDesktopStageTransition,
  type DesktopStageRect,
} from './desktopStageMotion';
import {
  SUBSYSTEM_CONTEXT_MENU_EVENT,
  type SubsystemContextMenuEventDetail,
} from '../StatusBar/subsystemContextMenu';

type DesktopPanelScope = 'me' | 'you' | 'third' | 'connect';

const ThirdSurface = React.lazy(loadThirdSurface);
const PANEL_SCOPES: readonly DesktopPanelScope[] = ['me', 'you', 'third', 'connect'];
const DESKTOP_STAGE_MOTION_DURATION_S = 0.42;
const useDesktopMotionEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const getInitialDesktopHeroLayoutEnabled = (): boolean => (
  typeof window === 'undefined' ? true : isDesktopHeroLayoutViewport(window.innerWidth)
);

const Desktop: React.FC = () => {
  const {
    setActiveScope,
    openFullscreen: openMeFullscreen,
    featuredPanel,
    setFeaturedPanel,
  } = useMeOs();
  const { openFullscreen: openYouFullscreen } = useYouBoard();
  const { displayMode: thirdDisplayMode, openFullscreen: openThirdFullscreen } = useThirdRuntime();
  const { displayMode: connectDisplayMode, openFullscreen: openConnectFullscreen } = useConnectRuntime();
  const [activeZoomPanel, setActiveZoomPanel] = React.useState<DesktopPanelScope>('me');
  const [desktopHeroLayoutEnabled, setDesktopHeroLayoutEnabled] = React.useState<boolean>(
    () => getInitialDesktopHeroLayoutEnabled()
  );
  const [reducedMotion, setReducedMotion] = React.useState<boolean>(() => getInitialDesktopReducedMotion());
  const panelStages = resolveDesktopPanelStages(featuredPanel);
  const desktopRootRef = useRef<HTMLDivElement | null>(null);
  const previousPanelRectsRef = useRef<Partial<Record<DesktopPanelScope, DesktopStageRect>>>({});
  const previousFeaturedPanelRef = useRef<DesktopPanelScope | null>(featuredPanel);

  useEffect(() => {
    const onResize = () => setDesktopHeroLayoutEnabled(isDesktopHeroLayoutViewport(window.innerWidth));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia(getDesktopReducedMotionQuery());
    const syncReducedMotion = () => setReducedMotion(mediaQuery.matches);
    syncReducedMotion();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncReducedMotion);
      return () => mediaQuery.removeEventListener('change', syncReducedMotion);
    }

    mediaQuery.addListener(syncReducedMotion);
    return () => mediaQuery.removeListener(syncReducedMotion);
  }, []);

  const requestPanelContextMenu = useCallback((detail: SubsystemContextMenuEventDetail) => {
    window.dispatchEvent(
      new CustomEvent<SubsystemContextMenuEventDetail>(SUBSYSTEM_CONTEXT_MENU_EVENT, { detail })
    );
  }, []);

  const activatePanel = useCallback((scope: DesktopPanelScope) => {
    flushSync(() => {
      setActiveZoomPanel(scope);
    });
    setActiveScope(scope === 'me' ? null : scope);
  }, [setActiveScope]);

  const focusPanelRoot = useCallback((scope: DesktopPanelScope) => {
    const panel = document.querySelector(`[data-panel-scope="${scope}"]`) as HTMLElement | null;
    if (!panel) return;
    panel.focus();
    panel.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, []);

  const getDesktopPanelNodes = useCallback(() => {
    const root = desktopRootRef.current;
    if (!root) return [] as Array<{ scope: DesktopPanelScope; node: HTMLElement }>;

    return PANEL_SCOPES.flatMap((scope) => {
      const node = root.querySelector<HTMLElement>(`[data-panel-scope="${scope}"]`);
      return node ? [{ scope, node }] : [];
    });
  }, []);

  const clearDesktopPanelMotion = useCallback(() => {
    getDesktopPanelNodes().forEach(({ node }) => {
      gsap.killTweensOf(node);
      gsap.set(node, { clearProps: 'transform,willChange' });
    });
  }, [getDesktopPanelNodes]);

  const measurePanelRects = useCallback(() => (
    getDesktopPanelNodes().reduce((rects, { scope, node }) => {
      rects[scope] = measureDesktopStageRect(node.getBoundingClientRect());
      return rects;
    }, {} as Partial<Record<DesktopPanelScope, DesktopStageRect>>)
  ), [getDesktopPanelNodes]);

  const promotePanel = useCallback((scope: DesktopPanelScope) => {
    if (!desktopHeroLayoutEnabled) return;
    flushSync(() => {
      setFeaturedPanel(scope);
      setActiveZoomPanel(scope);
    });
    setActiveScope(scope === 'me' ? null : scope);
    focusPanelRoot(scope);
  }, [desktopHeroLayoutEnabled, focusPanelRoot, setActiveScope, setFeaturedPanel]);

  const getPanelClassName = useCallback((scope: DesktopPanelScope, baseClassName: string): string => {
    const stage = panelStages[scope];
    const stageClassName = (
      stage === 'featured' ? styles.panelFeatured
        : stage === 'rail-top' ? styles.panelRailTop
          : stage === 'rail-middle' ? styles.panelRailMiddle
            : styles.panelRailBottom
    );
    return `${baseClassName} ${styles.desktopPanel} ${stageClassName}`.trim();
  }, [panelStages]);

  const renderHeaderActions = useCallback((args: {
    scope: DesktopPanelScope;
    fullscreenLabel: string;
    onOpenFullscreen: () => void;
  }) => (
    <>
      {desktopHeroLayoutEnabled && featuredPanel !== args.scope ? (
        <button
          type="button"
          onClick={() => promotePanel(args.scope)}
          aria-label={`Promote ${args.scope.toUpperCase()} to the main stage`}
        >
          PROMOTE
        </button>
      ) : null}
      <button type="button" onClick={args.onOpenFullscreen}>
        {args.fullscreenLabel}
      </button>
    </>
  ), [desktopHeroLayoutEnabled, featuredPanel, promotePanel]);

  useDesktopMotionEffect(() => {
    clearDesktopPanelMotion();
    const nextPanelRects = measurePanelRects();

    if (shouldAnimateDesktopStageTransition({
      desktopHeroLayoutEnabled,
      reducedMotion,
      previousFeaturedPanel: previousFeaturedPanelRef.current,
      featuredPanel,
    })) {
      getDesktopPanelNodes().forEach(({ scope, node }) => {
        const flip = resolveDesktopStageFlip({
          previousRect: previousPanelRectsRef.current[scope],
          nextRect: nextPanelRects[scope],
        });
        if (!flip) return;

        gsap.fromTo(node, {
          x: flip.x,
          y: flip.y,
          scaleX: flip.scaleX,
          scaleY: flip.scaleY,
          willChange: 'transform',
          transformOrigin: '50% 50%',
          force3D: true,
        }, {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          duration: DESKTOP_STAGE_MOTION_DURATION_S,
          ease: 'power3.out',
          clearProps: 'transform,willChange',
        });
      });
    }

    previousPanelRectsRef.current = nextPanelRects;
    previousFeaturedPanelRef.current = featuredPanel;
  }, [
    clearDesktopPanelMotion,
    desktopHeroLayoutEnabled,
    featuredPanel,
    getDesktopPanelNodes,
    measurePanelRects,
    reducedMotion,
  ]);

  useEffect(() => () => {
    clearDesktopPanelMotion();
  }, [clearDesktopPanelMotion]);

  return (
    <div
      ref={desktopRootRef}
      className={styles.desktop}
      role="main"
      data-desktop-root="true"
      data-featured-panel={featuredPanel}
    >
      <Panel
        title="ME.EXE"
        className={getPanelClassName('me', styles.mePanel)}
        scopeId="me"
        stretchBody
        bodyClassName={styles.panelBodyFlush}
        headerActions={renderHeaderActions({ scope: 'me', fullscreenLabel: 'ENTER', onOpenFullscreen: openMeFullscreen })}
        enableTouchContextFallback
        enableMobilePinchZoom={activeZoomPanel === 'me'}
        suppressInteractiveTargets={false}
        onActivate={() => activatePanel('me')}
        onRequestContextMenu={({ x, y, source }) => {
          requestPanelContextMenu({
            scope: 'me',
            origin: 'panel',
            source,
            x,
            y,
          });
        }}
      >
        <ME />
      </Panel>
      <Panel
        title="YOU.EXE"
        className={getPanelClassName('you', styles.youPanel)}
        scopeId="you"
        bodyClassName={styles.panelBodyFlush}
        headerActions={renderHeaderActions({ scope: 'you', fullscreenLabel: 'OPEN', onOpenFullscreen: openYouFullscreen })}
        enableTouchContextFallback
        enableMobilePinchZoom={activeZoomPanel === 'you'}
        onActivate={() => activatePanel('you')}
        onRequestContextMenu={({ x, y, source }) => {
          requestPanelContextMenu({
            scope: 'you',
            origin: 'panel',
            source,
            x,
            y,
          });
        }}
      >
        <YOU />
      </Panel>
      <Panel
        title="THIRD.EXE"
        className={getPanelClassName('third', styles.thirdPanel)}
        scopeId="third"
        stretchBody
        bodyClassName={styles.panelBodyFlush}
        headerActions={renderHeaderActions({
          scope: 'third',
          fullscreenLabel: 'ENTER SCENE LAB',
          onOpenFullscreen: openThirdFullscreen,
        })}
        enableTouchContextFallback
        onActivate={() => activatePanel('third')}
        onRequestContextMenu={({ x, y, source }) => {
          requestPanelContextMenu({
            scope: 'third',
            origin: 'panel',
            source,
            x,
            y,
          });
        }}
      >
        {thirdDisplayMode === 'fullscreen' ? null : (
          <Suspense fallback={<ThirdLoadingSurface mode="panel" />}>
            <ThirdSurface mode="panel" />
          </Suspense>
        )}
      </Panel>
      <Panel
        title="CONNECT.EXE"
        className={getPanelClassName('connect', styles.connectPanel)}
        scopeId="connect"
        bodyClassName={styles.panelBodyFlush}
        headerActions={renderHeaderActions({
          scope: 'connect',
          fullscreenLabel: 'OPEN',
          onOpenFullscreen: openConnectFullscreen,
        })}
        enableTouchContextFallback
        enableMobilePinchZoom={activeZoomPanel === 'connect'}
        onActivate={() => activatePanel('connect')}
        onRequestContextMenu={({ x, y, source }) => {
          requestPanelContextMenu({
            scope: 'connect',
            origin: 'panel',
            source,
            x,
            y,
          });
        }}
      >
        {connectDisplayMode === 'fullscreen' ? null : <CONNECT mode="panel" />}
      </Panel>
    </div>
  );
};

export default Desktop;
