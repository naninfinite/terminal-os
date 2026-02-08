/**
 * `ME` is now the desktop host for the embedded ME.OS preview.
 * The same ME.OS state can be expanded fullscreen via shell actions.
 */
import React from 'react';
import { MeOsViewport } from '../../meos/shell/MeOsViewport';
import { useMeOs } from '../../meos/shell/MeOsProvider';
import styles from './ME.module.scss';

const ME: React.FC = () => {
  const { openFullscreen } = useMeOs();
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFullscreen();
    }
  };

  return (
    <div 
      className={styles.root}
      role="button"
      tabIndex={0}
      aria-label="Open ME.os fullscreen"
      onClick={openFullscreen}
      onKeyDown={onKeyDown}
      >
      <MeOsViewport mode="panel" />
    </div>
  );
};

export default ME;

