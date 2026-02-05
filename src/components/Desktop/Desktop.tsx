/**
 * `Desktop` lays out the main set of panels (ME/YOU/THIRD/CONNECT) in a grid.
 * Responsive behavior is handled by `Desktop.module.scss`; this component just composes panels.
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
      <Panel title="ME.EXE"><ME /></Panel>
      <Panel title="YOU.EXE"><YOU /></Panel>
      {/* Canvas needs the body to stretch so it can resize with the panel. */}
      <Panel title="THIRD.EXE" stretchBody><THIRD /></Panel>
      <Panel title="CONNECT.EXE"><CONNECT /></Panel>
    </div>
  );
};

export default Desktop;


