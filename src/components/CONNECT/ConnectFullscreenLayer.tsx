import React, { useEffect } from 'react';
import CONNECT from './CONNECT';
import styles from './CONNECT.module.scss';
import { useConnectRuntime } from '../../connect/ConnectProvider';
import { useMeOs } from '../../meos/shell/MeOsProvider';

export const ConnectFullscreenLayer: React.FC = () => {
  const { displayMode, closeFullscreen } = useConnectRuntime();
  const { setActiveScope } = useMeOs();

  useEffect(() => {
    if (displayMode !== 'fullscreen') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeFullscreen, displayMode]);

  useEffect(() => {
    if (displayMode !== 'fullscreen') return;
    setActiveScope('connect');
    return () => setActiveScope(null);
  }, [displayMode, setActiveScope]);

  if (displayMode !== 'fullscreen') return null;

  return (
    <div className={styles.fullscreenLayer} role="dialog" aria-modal="true" aria-label="CONNECT.EXE fullscreen">
      <div className={styles.fullscreenSurface}>
        <header className={styles.fullscreenHeader}>
          <span className={styles.fullscreenTitle}>CONNECT.EXE</span>
          <button type="button" className={styles.fullscreenCloseBtn} onClick={closeFullscreen}>
            CLOSE
          </button>
        </header>
        <div className={styles.fullscreenBody}>
          <CONNECT mode="fullscreen" />
        </div>
      </div>
    </div>
  );
};
