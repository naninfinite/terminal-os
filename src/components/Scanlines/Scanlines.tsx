/**
 * `Scanlines` renders the CRT scanline overlay effect.
 * It sits above app content and below the custom cursor.
 */
import React from 'react';
import styles from './Scanlines.module.scss';

// Pure visual layer; no props or runtime logic.
const Scanlines: React.FC = () => <div className={styles.overlay} aria-hidden="true" />;

export default Scanlines;



