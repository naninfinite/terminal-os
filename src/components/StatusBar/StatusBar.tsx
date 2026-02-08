/**
 * `StatusBar` is the bottom dock/taskbar shown on the desktop view.
 * It renders system status text and a live-updating local clock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import styles from './StatusBar.module.scss';
import { useMeOs } from '../../meos/shell/MeOsProvider';

type MenuScope = 'desktop' | 'meos';

const StatusBar: React.FC = () => {
  const {
    displayMode,
    windows,
    openFullscreen,
    closeFullscreen,
    openApp,
    restoreWindow,
  } = useMeOs();
  const [now, setNow] = useState<Date>(() => new Date());
  const [menuOpen, setMenuOpen] = useState(false);

  // Keep the clock fresh while desktop shell is mounted.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = () => setMenuOpen(false);
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('click', onDocClick, { once: true });
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [menuOpen]);

  // Explicit formatter keeps output stable (HH:mm:ss, 24h).
  const timeString = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);

  const scope: MenuScope = displayMode === 'fullscreen' ? 'meos' : 'desktop';
  const orderedWindows = useMemo(
    () => [...windows].sort((a, b) => a.zIndex - b.zIndex),
    [windows]
  );

  const runMenuAction = (fn: () => void) => {
    fn();
    setMenuOpen(false);
  };

  const desktopMenu = [
    { label: 'OPEN ME.OS', action: () => openFullscreen() },
    { label: 'OPEN FILEMAN', action: () => { openFullscreen(); openApp('fileman'); } },
    { label: 'OPEN HOME', action: () => { openFullscreen(); openApp('home'); } },
  ];
  const meOsMenu = [
    { label: 'OPEN FILEMAN', action: () => openApp('fileman') },
    { label: 'OPEN HOME', action: () => openApp('home') },
    { label: 'OPEN PROJECTS', action: () => openApp('projects') },
    { label: 'OPEN MEDIA', action: () => openApp('media') },
    { label: 'EXIT ME.OS', action: () => closeFullscreen() },
  ];
  const menuItems = scope === 'desktop' ? desktopMenu : meOsMenu;

  return (
    <div className={styles.statusBar} role="contentinfo" aria-label="System status bar">
      <div className={styles.left}>
        <button
          type="button"
          className={styles.btn}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          aria-label="Open Start menu"
          aria-expanded={menuOpen}
        >
          [ MENU ]
        </button>
        {menuOpen ? (
          <div
            className={styles.menu}
            role="menu"
            onClick={(event) => event.stopPropagation()}
            aria-label={scope === 'desktop' ? 'Desktop menu' : 'ME.OS menu'}
          >
            <p className={styles.menuTitle}>{scope === 'desktop' ? 'DESKTOP' : 'ME.OS'}</p>
            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={styles.menuItem}
                onClick={() => runMenuAction(item.action)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        <span>SYS: READY</span>
      </div>
      <div className={styles.tasks} aria-label="ME.OS windows">
        {orderedWindows.map((win) => (
          <button
            key={win.id}
            type="button"
            className={`${styles.taskBtn} ${win.minimized ? styles.taskBtnMinimized : ''}`.trim()}
            onClick={() => restoreWindow(win.id)}
            title={win.title}
          >
            {win.title}
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
