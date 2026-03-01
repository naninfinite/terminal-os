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

  return (
    <div
      className={styles.root}
    >
      <MeOsViewport mode="panel" onPanelBackgroundEnterFullscreen={openFullscreen} />
    </div>
  );
};

export default ME;
