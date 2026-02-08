/**
 * Fullscreen wrapper for ME.OS.
 * Renders only when the shared shell mode is `fullscreen`.
 */
import React, { useEffect } from 'react';
import { useMeOs } from './MeOsProvider';
import { MeOsViewport } from './MeOsViewport';
import styles from './MeOsShell.module.scss';

export const MeOsFullscreenLayer: React.FC = () => {
  const { displayMode, closeFullscreen } = useMeOs();

  // Keyboard escape hatch for quick exit from fullscreen mode.
  useEffect(() => {
    if (displayMode !== 'fullscreen') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeFullscreen, displayMode]);

  if (displayMode !== 'fullscreen') return null;

  return (
    <div className={styles.fullscreenLayer} role="dialog" aria-modal="true" aria-label="ME.EXE fullscreen">
      <MeOsViewport mode="fullscreen" />
    </div>
  );
};
