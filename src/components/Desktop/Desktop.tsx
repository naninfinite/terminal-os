/**
 * `Desktop` lays out the main set of panels (ME/YOU/THIRD/CONNECT) in a grid.
 * Responsive behavior is handled in `Desktop.module.scss`; this component only
 * composes app panels and passes panel-specific layout flags.
 */
import React, { useCallback } from 'react';
import { flushSync } from 'react-dom';
import Panel from '../Panel/Panel';
import ME from '../ME/ME';
import YOU from '../YOU/YOU';
import THIRD from '../THIRD/THIRD';
import CONNECT from '../CONNECT/CONNECT';
import styles from './Desktop.module.scss';
import { useMeOs } from '../../meos/shell/MeOsProvider';
import { useThirdRuntime } from '../../third/ThirdProvider';
import { useConnectRuntime } from '../../connect/ConnectProvider';
import {
  SUBSYSTEM_CONTEXT_MENU_EVENT,
  type SubsystemContextMenuEventDetail,
} from '../StatusBar/subsystemContextMenu';

type DesktopPanelScope = 'me' | 'you' | 'third' | 'connect';

const Desktop: React.FC = () => {
  const { setActiveScope } = useMeOs();
  const { displayMode: thirdDisplayMode } = useThirdRuntime();
  const { displayMode: connectDisplayMode } = useConnectRuntime();
  const [activeZoomPanel, setActiveZoomPanel] = React.useState<DesktopPanelScope>('me');
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

  return (
    <div className={styles.desktop} role="main">
      {/* Profile / portfolio entry panel. */}
      <Panel
        title="ME.EXE"
        scopeId="me"
        stretchBody
        bodyClassName={styles.panelBodyFlush}
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
        scopeId="you"
        bodyClassName={styles.panelBodyFlush}
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
        scopeId="third"
        stretchBody
        bodyClassName={styles.panelBodyFlush}
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
        {thirdDisplayMode === 'fullscreen' ? null : <THIRD mode="panel" />}
      </Panel>
      {/* ASCII banner / contact panel. */}
      <Panel
        title="CONNECT.EXE"
        scopeId="connect"
        bodyClassName={styles.panelBodyFlush}
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
