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
      <Panel title="ME.EXE"><ME variant="compact" /></Panel>
      <Panel title="YOU.EXE"><YOU /></Panel>
      <Panel title="THIRD.EXE"><THIRD /></Panel>
      <Panel title="CONNECT.EXE"><CONNECT /></Panel>
    </div>
  );
};

export default Desktop;


