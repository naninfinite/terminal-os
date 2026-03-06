/**
 * `Desktop` lays out the main set of panels (ME/YOU/THIRD/CONNECT) in a grid.
 * Responsive behavior is handled in `Desktop.module.scss`; this component only
 * composes app panels and passes panel-specific layout flags.
 */
import React, { Suspense, useCallback, useEffect } from 'react';
import { flushSync } from 'react-dom';
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
  SUBSYSTEM_CONTEXT_MENU_EVENT,
  type SubsystemContextMenuEventDetail,
} from '../StatusBar/subsystemContextMenu';

type DesktopPanelScope = 'me' | 'you' | 'third' | 'connect';
const ThirdSurface = React.lazy(loadThirdSurface);

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
  const panelStages = resolveDesktopPanelStages(featuredPanel);

  useEffect(() => {
    const onResize = () => setDesktopHeroLayoutEnabled(isDesktopHeroLayoutViewport(window.innerWidth));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const requestPanelContextMenu = useCallback((detail: SubsystemContextMenuEventDetail) => {
    window.dispatchEvent(
      new CustomEvent<SubsystemContextMenuEventDetail>(SUBSYSTEM_CONTEXT_MENU_EVENT, { detail })
    );
  }, []);
  const activatePanel = useCallback((scope: DesktopPanelScope) => {
    // Ensure active-panel zoom state is available immediately for multi-touch starts.
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

  return (
    <div
      className={styles.desktop}
      role="main"
      data-desktop-root="true"
      data-featured-panel={featuredPanel}
    >
      {/* Profile / portfolio entry panel. */}
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
      {/* Shared message-board panel (YOU runtime, preview mode). */}
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
      {/* Canvas app needs a stretching body so WebGL can fill available height. */}
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
      {/* ASCII banner / contact panel. */}
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
