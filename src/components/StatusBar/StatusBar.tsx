/**
 * `StatusBar` is the bottom dock/taskbar shown on the desktop view.
 * It renders system status text and a live-updating local clock.
 */
import React, { useEffect, useMemo, useState } from 'react';
import styles from './StatusBar.module.scss';
import { useMeOs } from '../../meos/shell/MeOsProvider';
import { MENU_SCOPE_CONFIG, resolveMenuScope, type MenuCommandId } from '../../meos/menu/scopes';
import { useTheme } from '../../theme/ThemeProvider';
import { useYouBoard } from '../../you/YouProvider';
import { useThirdRuntime } from '../../third/ThirdProvider';
import { useConnectRuntime } from '../../connect/ConnectProvider';
import { nextLocationCaseMode } from './locationCase';
import { getNextThemeMode, getThemeToggleLabel } from './themeMenu';
import { deriveYouDockState } from './youDock';
import {
  formatGenericDockLabel,
  formatMeDockLabel,
  getDockClickIntent,
  type SubsystemScope,
} from './subsystemDock';

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
    displayMode: meDisplayMode,
    activeScope,
    windows,
    openFullscreen: openMeFullscreen,
    closeFullscreen: closeMeFullscreen,
    openApp,
    restoreWindow,
  } = useMeOs();
  const {
    messages,
    draftBody,
    displayMode: youDisplayMode,
    loadingInitial: youLoadingInitial,
    error: youError,
    openFullscreen: openYouFullscreen,
    closeFullscreen: closeYouFullscreen,
  } = useYouBoard();
  const {
    displayMode: thirdDisplayMode,
    openFullscreen: openThirdFullscreen,
    closeFullscreen: closeThirdFullscreen,
  } = useThirdRuntime();
  const {
    displayMode: connectDisplayMode,
    notificationCount: connectNotificationCount,
    openFullscreen: openConnectFullscreen,
    closeFullscreen: closeConnectFullscreen,
  } = useConnectRuntime();
  const { resolvedTheme, setThemeMode, setTextCaseMode, textCaseMode } = useTheme();
  const [now, setNow] = useState<Date>(() => new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [meDockMenuAnchor, setMeDockMenuAnchor] = useState<{ left: number; top: number } | null>(null);
  const [youLastSeenAt, setYouLastSeenAt] = useState<string | null>(null);

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

  useEffect(() => {
    if (!meDockMenuAnchor) return;
    const onDocClick = () => setMeDockMenuAnchor(null);
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMeDockMenuAnchor(null);
    };
    window.addEventListener('click', onDocClick, { once: true });
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [meDockMenuAnchor]);

  // Explicit formatter keeps output stable (HH:mm:ss, 24h).
  const timeString = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
  const locationLabel = useMemo(() => getLocationLabel(), []);

  const scope = resolveMenuScope({ displayMode: meDisplayMode, activeScope: activeScope ?? undefined });
  const scopeConfig = MENU_SCOPE_CONFIG[scope];
  const orderedWindows = useMemo(
    () => [...windows].sort((a, b) => a.zIndex - b.zIndex),
    [windows]
  );
  const meWindowsLadder = useMemo(
    () => [...orderedWindows].sort((a, b) => b.zIndex - a.zIndex),
    [orderedWindows]
  );
  const meWindowCount = orderedWindows.length;
  const thirdNotificationCount = 0;
  const youDockState = useMemo(
    () => deriveYouDockState({ draftBody, messages, lastSeenAt: youLastSeenAt }),
    [draftBody, messages, youLastSeenAt]
  );
  const activeFullscreenScope: SubsystemScope | null = (
    meDisplayMode === 'fullscreen' ? 'me'
      : youDisplayMode === 'fullscreen' ? 'you'
        : thirdDisplayMode === 'fullscreen' ? 'third'
          : connectDisplayMode === 'fullscreen' ? 'connect'
            : null
  );
  const anyFullscreenOpen = activeFullscreenScope != null;
  const inYouContext = activeScope === 'you' || youDisplayMode === 'fullscreen';

  const openAppForScope = (appId: Parameters<typeof openApp>[0]) => {
    if (scope === 'desktop') openMeFullscreen();
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

  const closeAllFullscreen = () => {
    closeMeFullscreen();
    closeYouFullscreen();
    closeThirdFullscreen();
    closeConnectFullscreen();
  };

  const openSubsystemFullscreen = (targetScope: SubsystemScope) => {
    switch (targetScope) {
      case 'me':
        openMeFullscreen();
        break;
      case 'you':
        openYouFullscreen();
        break;
      case 'third':
        openThirdFullscreen();
        break;
      case 'connect':
        openConnectFullscreen();
        break;
      default:
        break;
    }
  };

  const onSubsystemDockClick = (targetScope: SubsystemScope) => {
    setMeDockMenuAnchor(null);
    const intent = getDockClickIntent({
      targetScope,
      anyFullscreenOpen,
      activeFullscreenScope,
    });

    if (intent === 'noop') return;

    if (intent === 'focus_panel') {
      focusPanel('you');
      if (youDockState.latestMessageAt) setYouLastSeenAt(youDockState.latestMessageAt);
      return;
    }

    closeAllFullscreen();
    openSubsystemFullscreen(targetScope);
  };

  const openMeDockWindowLadder = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setMenuOpen(false);
    const rect = event.currentTarget.getBoundingClientRect();
    setMeDockMenuAnchor({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 288)),
      top: rect.top - 8,
    });
  };

  const focusMeWindowFromDock = (windowId: string) => {
    setMeDockMenuAnchor(null);
    if (activeFullscreenScope !== 'me') {
      closeAllFullscreen();
      openMeFullscreen();
    }
    restoreWindow(windowId);
  };

  useEffect(() => {
    if (youLoadingInitial || youError) return;
    setYouLastSeenAt((prev) => {
      if (prev != null) return prev;
      return youDockState.latestMessageAt ?? new Date().toISOString();
    });
  }, [youDockState.latestMessageAt, youError, youLoadingInitial]);

  useEffect(() => {
    if (!inYouContext || !youDockState.latestMessageAt) return;
    setYouLastSeenAt((prev) => (
      prev === youDockState.latestMessageAt ? prev : youDockState.latestMessageAt
    ));
  }, [inYouContext, youDockState.latestMessageAt]);

  const runMenuAction = (commandId: MenuCommandId) => {
    switch (commandId) {
      case 'open_meos':
        openMeFullscreen();
        break;
      case 'exit_meos':
        closeMeFullscreen();
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
      case 'toggle_theme':
        setThemeMode(getNextThemeMode(resolvedTheme));
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
                {item.id === 'toggle_theme' ? getThemeToggleLabel(resolvedTheme) : item.label}
              </button>
            ))}
          </div>
        ) : null}
        <span>SYS: READY</span>
      </div>
      <div className={styles.tasks} aria-label="Desktop tasks">
        <button
          type="button"
          className={`${styles.taskBtn} ${styles.taskBtnSubsystem}`.trim()}
          onClick={() => onSubsystemDockClick('me')}
          onContextMenu={openMeDockWindowLadder}
          title="Open ME.EXE"
        >
          {formatMeDockLabel(meWindowCount)}
        </button>
        <button
          type="button"
          className={`${styles.taskBtn} ${styles.taskBtnSubsystem} ${styles.taskBtnYou} ${youDockState.showCombinedDot ? styles.taskBtnYouCombined : ''}`.trim()}
          onClick={() => onSubsystemDockClick('you')}
          title="Focus or open YOU.EXE"
        >
          {youDockState.label}
        </button>
        <button
          type="button"
          className={`${styles.taskBtn} ${styles.taskBtnSubsystem}`.trim()}
          onClick={() => onSubsystemDockClick('third')}
          title="Open THIRD.EXE"
        >
          {formatGenericDockLabel('THIRD.EXE', thirdNotificationCount)}
        </button>
        <button
          type="button"
          className={`${styles.taskBtn} ${styles.taskBtnSubsystem}`.trim()}
          onClick={() => onSubsystemDockClick('connect')}
          title="Open CONNECT.EXE"
        >
          {formatGenericDockLabel('CONNECT.EXE', connectNotificationCount)}
        </button>
      </div>
      {meDockMenuAnchor ? (
        <div
          className={styles.meDockMenu}
          role="menu"
          aria-label="ME.EXE windows"
          style={{ left: meDockMenuAnchor.left, top: meDockMenuAnchor.top }}
          onClick={(event) => event.stopPropagation()}
        >
          <p className={styles.meDockMenuTitle}>ME WINDOWS</p>
          {meWindowsLadder.length === 0 ? (
            <p className={styles.meDockMenuEmpty}>NO OPEN WINDOWS</p>
          ) : (
            meWindowsLadder.map((win, index) => (
              <button
                key={win.id}
                type="button"
                className={styles.meDockMenuItem}
                onClick={() => focusMeWindowFromDock(win.id)}
                title={win.title}
              >
                {`${index + 1}. ${win.title}${win.minimized ? ' [MIN]' : ''}`}
              </button>
            ))
          )}
        </div>
      ) : null}
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
