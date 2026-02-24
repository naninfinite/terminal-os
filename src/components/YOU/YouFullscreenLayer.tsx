import React, { useEffect } from 'react';
import YOU from './YOU';
import styles from './YOU.module.scss';
import { useYouBoard } from '../../you/YouProvider';
import { useMeOs } from '../../meos/shell/MeOsProvider';

export const YouFullscreenLayer: React.FC = () => {
  const { displayMode, closeFullscreen } = useYouBoard();
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
    setActiveScope('you');
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
    <div className={styles.fullscreenLayer} role="dialog" aria-modal="true" aria-label="YOU.EXE fullscreen">
      <div className={styles.fullscreenSurface}>
        <YOU mode="fullscreen" />
      </div>
    </div>
  );
};
