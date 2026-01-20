import React from 'react';
import Panel from '../Panel/Panel';
import ME from '../ME/ME';
import YOU from '../YOU/YOU';
import THIRD from '../THIRD/THIRD';
import CONNECT from '../CONNECT/CONNECT';
import styles from './Desktop.module.scss';

export type DesktopProps = {
  onOpenApp?: (key: 'ME' | 'YOU' | 'THIRD' | 'CONNECT') => void;
};

const Desktop: React.FC<DesktopProps> = ({ onOpenApp }) => {
  return (
    <div className={styles.desktop} role="main">
      <Panel
        title="ME.EXE"
        bodyLayout="stretch"
        headerActions={
          onOpenApp ? (
            <button type="button" className={styles.maxBtn} onClick={() => onOpenApp('ME')} aria-label="Open ME.EXE fullscreen">
              MAX
            </button>
          ) : null
        }
      >
        <ME />
      </Panel>
      <Panel
        title="YOU.EXE"
        bodyLayout="stretch"
        headerActions={
          onOpenApp ? (
            <button type="button" className={styles.maxBtn} onClick={() => onOpenApp('YOU')} aria-label="Open YOU.EXE fullscreen">
              MAX
            </button>
          ) : null
        }
      >
        <YOU />
      </Panel>
      <Panel
        title="THIRD.EXE"
        bodyLayout="stretch"
        headerActions={
          onOpenApp ? (
            <button
              type="button"
              className={styles.maxBtn}
              onClick={() => onOpenApp('THIRD')}
              aria-label="Open THIRD.EXE fullscreen"
            >
              MAX
            </button>
          ) : null
        }
      >
        <THIRD />
      </Panel>
      <Panel
        title="CONNECT.EXE"
        headerActions={
          onOpenApp ? (
            <button
              type="button"
              className={styles.maxBtn}
              onClick={() => onOpenApp('CONNECT')}
              aria-label="Open CONNECT.EXE fullscreen"
            >
              MAX
            </button>
          ) : null
        }
      >
        <CONNECT />
      </Panel>
    </div>
  );
};

export default Desktop;


