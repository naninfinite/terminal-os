/**
 * `Scanlines` renders the CRT scanline overlay effect.
 * It should sit above content but below the custom cursor.
 */
import React from 'react';
import styles from './Scanlines.module.scss';

const Scanlines: React.FC = () => <div className={styles.overlay} aria-hidden="true" />;

export default Scanlines;




