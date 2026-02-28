import React from 'react';
import styles from './THIRD.module.scss';
import { createRetriableLazyImport } from '../../utils/lazyImport';

export const loadThirdSurface = createRetriableLazyImport(
  () => import('./THIRD')
);

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
