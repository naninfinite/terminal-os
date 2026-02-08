/**
 * `StatusBar` is the bottom dock/taskbar shown on the desktop view.
 * It renders system status text and a live-updating local clock.
 */
import React, { useEffect, useState } from 'react';
import styles from './StatusBar.module.scss';

const StatusBar: React.FC = () => {
  const [now, setNow] = useState<Date>(() => new Date());

  // Keep the clock fresh while desktop shell is mounted.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Explicit formatter keeps output stable (HH:mm:ss, 24h).
  const timeString = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  return (
    <div className={styles.statusBar} role="contentinfo" aria-label="System status bar">
      <div className={styles.left}>
        {/* Placeholder button for future scope-aware Start menu. */}
        <button type="button" className={styles.btn} aria-label="Open menu">[ MENU ]</button>
        <span>SYS: READY</span>
      </div>
      <div className={styles.right} aria-live="polite" aria-atomic="true">
        {timeString}
      </div>
    </div>
  );
};

export default StatusBar;


