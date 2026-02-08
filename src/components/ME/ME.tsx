/**
 * `ME` is now the desktop host for the embedded ME.OS preview.
 * The same ME.OS state can be expanded fullscreen via shell actions.
 */
import React from 'react';
import { MeOsViewport } from '../../meos/shell/MeOsViewport';
import styles from './ME.module.scss';

const ME: React.FC = () => {
  return (
    <div className={styles.root}>
      <MeOsViewport mode="panel" />
    </div>
  );
};

export default ME;

