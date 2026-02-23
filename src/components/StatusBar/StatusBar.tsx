/**
 * `StatusBar` is the bottom dock/taskbar shown on the desktop view.
 * It renders system status text and a live-updating local clock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import styles from './StatusBar.module.scss';
import { useMeOs } from '../../meos/shell/MeOsProvider';
import { MENU_SCOPE_CONFIG, resolveMenuScope, type MenuCommandId } from '../../meos/menu/scopes';
import { useTheme } from '../../theme/ThemeProvider';
import { nextLocationCaseMode } from './locationCase';

type DesktopPanelScope = 'you' | 'third' | 'connect' | 'me';

const getLocationLabel = (): string => {
  const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timezone) return 'location --';
  const parts = timezone.split('/');
  const city = parts[parts.length - 1]?.replace(/_/g, ' ');
  return city ? city : 'location --';
};

const StatusBar: React.FC = () => {
  const {
    displayMode,
    activeScope,
    windows,
    openFullscreen,
    closeFullscreen,
    openApp,
    restoreWindow,
  } = useMeOs();
  const { setThemeMode, setTextCaseMode, textCaseMode } = useTheme();
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
  const locationLabel = useMemo(() => getLocationLabel(), []);

  const scope = resolveMenuScope({ displayMode, activeScope: activeScope ?? undefined });
  const scopeConfig = MENU_SCOPE_CONFIG[scope];
  const orderedWindows = useMemo(
    () => [...windows].sort((a, b) => a.zIndex - b.zIndex),
    [windows]
  );
  const scopedWindows = useMemo(
    () => (scope === 'meos' ? orderedWindows : []),
    [orderedWindows, scope]
  );
  const meWindowCount = orderedWindows.length;
  const showCollapsedMeTask = scope !== 'meos' && meWindowCount > 0;

  const openAppForScope = (appId: Parameters<typeof openApp>[0]) => {
    if (scope === 'desktop') openFullscreen();
    openApp(appId);
  };

  const focusPanel = (scopeId: DesktopPanelScope) => {
    const panel = document.querySelector(`[data-panel-scope="${scopeId}"]`) as HTMLElement | null;
    if (!panel) return;
    panel.scrollIntoView({ block: 'center', behavior: 'smooth' });
    panel.focus();
  };

  const dispatchShellEvent = (eventName: string) => {
    window.dispatchEvent(new CustomEvent(eventName));
  };

  const runMenuAction = (commandId: MenuCommandId) => {
    switch (commandId) {
      case 'open_meos':
        openFullscreen();
        break;
      case 'exit_meos':
        closeFullscreen();
        break;
      case 'open_file':
        openAppForScope('file');
        break;
      case 'open_projects':
        openAppForScope('projects');
        break;
      case 'open_media':
        openAppForScope('media');
        break;
      case 'set_theme_auto':
        setThemeMode('auto');
        break;
      case 'set_theme_dark':
        setThemeMode('dark');
        break;
      case 'set_theme_light':
        setThemeMode('light');
        break;
      case 'focus_you_panel':
        focusPanel('you');
        break;
      case 'you_save_input':
        dispatchShellEvent('terminalos:you:save-input');
        break;
      case 'you_clear_input':
        dispatchShellEvent('terminalos:you:clear-input');
        break;
      case 'focus_third_panel':
        focusPanel('third');
        break;
      case 'third_reset_scene':
        dispatchShellEvent('terminalos:third:reset-scene');
        break;
      case 'focus_connect_panel':
        focusPanel('connect');
        break;
      case 'connect_copy_banner':
        dispatchShellEvent('terminalos:connect:copy-banner');
        break;
      case 'noop':
      default:
        break;
    }
    setMenuOpen(false);
  };

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
            aria-label={`${scopeConfig.title} menu`}
          >
            <p className={styles.menuTitle}>{scopeConfig.title}</p>
            {scopeConfig.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={styles.menuItem}
                onClick={() => runMenuAction(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
        <span>SYS: READY</span>
      </div>
      <div className={styles.tasks} aria-label="ME.EXE windows">
        {showCollapsedMeTask ? (
          <button
            type="button"
            className={styles.taskBtn}
            onClick={openFullscreen}
            title={`Open ME.EXE (${meWindowCount} window${meWindowCount === 1 ? '' : 's'})`}
          >
            {`ME.EXE (${meWindowCount})`}
          </button>
        ) : null}
        {scopedWindows.map((win) => (
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
        <button
          type="button"
          className={styles.locationTokenButton}
          onClick={() => setTextCaseMode(nextLocationCaseMode(textCaseMode))}
          title={`Text case: ${textCaseMode}`}
          aria-label={`Text case ${textCaseMode}. Click to toggle case mode.`}
        >
          <span className={styles.locationToken}>
            {locationLabel}
          </span>
        </button>
        <span className={styles.rightDivider} aria-hidden="true">|</span>
        <span>{timeString}</span>
      </div>
    </div>
  );
};

export default StatusBar;
