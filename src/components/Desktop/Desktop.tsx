/**
 * `Desktop` lays out the main set of panels (ME/YOU/THIRD/CONNECT) in a grid.
 * Responsive behavior is handled in `Desktop.module.scss`; this component only
 * composes app panels and passes panel-specific layout flags.
 */
import React from 'react';
import Panel from '../Panel/Panel';
import ME from '../ME/ME';
import YOU from '../YOU/YOU';
import THIRD from '../THIRD/THIRD';
import CONNECT from '../CONNECT/CONNECT';
import styles from './Desktop.module.scss';
import { useMeOs } from '../../meos/shell/MeOsProvider';

const Desktop: React.FC = () => {
  const { setActiveScope } = useMeOs();

  return (
    <div className={styles.desktop} role="main">
      {/* Profile / portfolio entry panel. */}
      <Panel
        title="ME.EXE"
        scopeId="me"
        stretchBody
        bodyClassName={styles.panelBodyFlush}
        onActivate={() => setActiveScope(null)}
      >
        <ME />
      </Panel>
      {/* Shared message-board panel (YOU runtime, preview mode). */}
      <Panel title="YOU.EXE" scopeId="you" bodyClassName={styles.panelBodyFlush} onActivate={() => setActiveScope('you')}><YOU /></Panel>
      {/* Canvas app needs a stretching body so WebGL can fill available height. */}
      <Panel title="THIRD.EXE" scopeId="third" stretchBody bodyClassName={styles.panelBodyFlush} onActivate={() => setActiveScope('third')}><THIRD /></Panel>
      {/* ASCII banner / contact panel. */}
      <Panel title="CONNECT.EXE" scopeId="connect" bodyClassName={styles.panelBodyFlush} onActivate={() => setActiveScope('connect')}><CONNECT /></Panel>
    </div>
  );
};

export default Desktop;
