import React, { useEffect, useState } from 'react';
import styles from './StatusBar.module.scss';

// StatusBar displays basic system status and a live clock.
// Self-contained; no props required at this time.
const StatusBar: React.FC = () => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeString = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  return (
    <div className={styles.statusBar} role="contentinfo" aria-label="System status bar">
      <div className={styles.left}>
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



