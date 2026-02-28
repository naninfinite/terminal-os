import React from 'react';
import styles from './THIRD.module.scss';

let thirdSurfacePromise: Promise<typeof import('./THIRD')> | null = null;

export const loadThirdSurface = (): Promise<typeof import('./THIRD')> => {
  if (!thirdSurfacePromise) {
    thirdSurfacePromise = import('./THIRD');
  }

  return thirdSurfacePromise;
};

type ThirdLoadingSurfaceProps = {
  mode: 'panel' | 'fullscreen';
};

export const ThirdLoadingSurface: React.FC<ThirdLoadingSurfaceProps> = ({ mode }) => (
  <div
    className={`${styles.loadingFallback} ${mode === 'fullscreen' ? styles.loadingFallbackFullscreen : ''}`.trim()}
    role="status"
    aria-live="polite"
    aria-atomic="true"
    aria-label="Loading THIRD.EXE scene"
  >
    <div className={styles.loadingFrame}>
      <span className={styles.loadingLabel}>LOADING SCENE...</span>
      <div className={styles.loadingMeter} aria-hidden="true">
        <span className={styles.loadingMeterFill} />
      </div>
    </div>
  </div>
);
