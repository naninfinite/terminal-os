import React, { Suspense, useEffect } from 'react';
import styles from './THIRD.module.scss';
import { loadThirdSurface, ThirdLoadingSurface } from './loadThirdSurface';
import { useThirdRuntime } from '../../third/ThirdProvider';
import { useMeOs } from '../../meos/shell/MeOsProvider';

const ThirdSurface = React.lazy(loadThirdSurface);

export const ThirdFullscreenLayer: React.FC = () => {
  const { displayMode, closeFullscreen } = useThirdRuntime();
  const { displayMode: meDisplayMode, setActiveScope } = useMeOs();

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
    setActiveScope('third');
    return () => setActiveScope(null);
  }, [displayMode, setActiveScope]);

  useEffect(() => {
    if (displayMode !== 'fullscreen') return;
    if (meDisplayMode === 'fullscreen') {
      closeFullscreen();
    }
  }, [closeFullscreen, displayMode, meDisplayMode]);

  if (displayMode !== 'fullscreen') return null;

  return (
    <div className={styles.fullscreenLayer} role="dialog" aria-modal="true" aria-label="THIRD.EXE fullscreen">
      <div className={styles.fullscreenSurface}>
        <header className={styles.fullscreenHeader}>
          <span className={styles.fullscreenTitle}>THIRD.EXE</span>
          <button type="button" className={styles.fullscreenCloseBtn} onClick={closeFullscreen}>
            CLOSE
          </button>
        </header>
        <div className={styles.fullscreenBody}>
          <Suspense fallback={<ThirdLoadingSurface mode="fullscreen" />}>
            <ThirdSurface mode="fullscreen" />
          </Suspense>
        </div>
      </div>
    </div>
  );
};
