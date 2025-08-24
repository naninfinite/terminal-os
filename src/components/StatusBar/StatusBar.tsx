import React, { useContext, useEffect, useState } from 'react';
import styles from './StatusBar.module.scss';
import { WindowManagerContext } from '../Windowing/WindowManager';

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

  const ctx = useContext(WindowManagerContext);
  const minimized = ctx?.windows.filter(w => w.minimized) ?? [];

  return (
    <div className={styles.statusBar} role="contentinfo" aria-label="System dock and status bar">
      <div className={styles.left}>
        <button type="button" className={styles.btn} aria-label="Open menu">[ MENU ]</button>
        {minimized.map(w => (
          <button
            key={w.id}
            type="button"
            onClick={() => { ctx?.restoreWindow(w.id); ctx?.focusWindow(w.id); }}
            className={styles.btn}
            aria-label={`Restore ${w.title}`}
          >
            [{w.title}]
          </button>
        ))}
      </div>
      <div className={styles.right} aria-live="polite" aria-atomic="true">
        {timeString}
      </div>
    </div>
  );
};

export default StatusBar;



