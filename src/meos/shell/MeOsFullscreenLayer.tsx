/**
 * Fullscreen wrapper for ME.OS.
 * Renders only when the shared shell mode is `fullscreen`.
 */
import React, { useEffect } from 'react';
import { useMeOs } from './MeOsProvider';
import { MeOsViewport } from './MeOsViewport';
import styles from './MeOsShell.module.scss';
import { useContextTrigger } from '../../components/shared/useContextTrigger';
import {
  SUBSYSTEM_CONTEXT_MENU_EVENT,
  type SubsystemContextMenuEventDetail,
} from '../../components/StatusBar/subsystemContextMenu';

export const MeOsFullscreenLayer: React.FC = () => {
  const { displayMode, closeFullscreen } = useMeOs();
  const contextTrigger = useContextTrigger<HTMLDivElement>({
    disabled: displayMode !== 'fullscreen',
    suppressInteractiveTargets: false,
    onOpen: ({ x, y, source }) => {
      window.dispatchEvent(new CustomEvent<SubsystemContextMenuEventDetail>(
        SUBSYSTEM_CONTEXT_MENU_EVENT,
        {
          detail: {
            scope: 'me',
            origin: 'panel',
            source,
            x,
            y,
          },
        }
      ));
    },
  });

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
    <div
      className={styles.fullscreenLayer}
      role="dialog"
      aria-modal="true"
      aria-label="ME.EXE fullscreen"
      onContextMenu={contextTrigger.onContextMenu}
      onPointerDown={contextTrigger.onPointerDown}
      onPointerMove={contextTrigger.onPointerMove}
      onPointerUp={contextTrigger.onPointerUp}
      onPointerCancel={contextTrigger.onPointerCancel}
      onTouchStart={contextTrigger.onTouchStart}
      onTouchMove={contextTrigger.onTouchMove}
      onTouchEnd={contextTrigger.onTouchEnd}
      onTouchCancel={contextTrigger.onTouchCancel}
      onClickCapture={contextTrigger.onClickCapture}
      onKeyDown={contextTrigger.onKeyDown}
    >
      <MeOsViewport mode="fullscreen" />
    </div>
  );
};
