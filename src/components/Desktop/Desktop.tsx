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

const Desktop: React.FC = () => {
  return (
    <div className={styles.desktop} role="main">
      {/* Profile / portfolio entry panel. */}
      <Panel title="ME.EXE" stretchBody><ME /></Panel>
      {/* Small persisted input panel. */}
      <Panel title="YOU.EXE"><YOU /></Panel>
      {/* Canvas app needs a stretching body so WebGL can fill available height. */}
      <Panel title="THIRD.EXE" stretchBody><THIRD /></Panel>
      {/* ASCII banner / contact panel. */}
      <Panel title="CONNECT.EXE"><CONNECT /></Panel>
    </div>
  );
};

export default Desktop;
