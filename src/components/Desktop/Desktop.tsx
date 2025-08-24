import React from 'react';
import Panel from '../Panel/Panel';
import ME from '../ME/ME';
import YOU from '../YOU/YOU';
import THIRD from '../THIRD/THIRD';
import CONNECT from '../CONNECT/CONNECT';
import { WindowManagerProvider } from '../Windowing/WindowManager';
import styles from './Desktop.module.scss';

const Desktop: React.FC = () => {
  return (
    <WindowManagerProvider>
      <div className={styles.desktop} role="main">
        <Panel title="HOME.EXE"><ME /></Panel>
        <Panel title="CONNECT.EXE"><YOU /></Panel>
        <Panel title="DIMENSION.EXE"><THIRD /></Panel>
        <Panel title="?.EXE"><CONNECT /></Panel>
      </div>
    </WindowManagerProvider>
  );
};

export default Desktop;


