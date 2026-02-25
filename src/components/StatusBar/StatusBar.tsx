/**
 * `StatusBar` is the bottom dock/taskbar shown on the desktop view.
 * It renders system status text and a live-updating local clock.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styles from './StatusBar.module.scss';
import { useMeOs } from '../../meos/shell/MeOsProvider';
import { MENU_SCOPE_CONFIG, resolveMenuScope, type MenuCommandId } from '../../meos/menu/scopes';
import { useTheme } from '../../theme/ThemeProvider';
import { useYouBoard } from '../../you/YouProvider';
import { useThirdRuntime } from '../../third/ThirdProvider';
import { useConnectRuntime } from '../../connect/ConnectProvider';
import {
  FILEMAN_COMMAND_EVENT,
  type FileManCommandDetail,
  type FileManCommandId,
} from '../../meos/apps/fileman/commands';
import { useContextTrigger } from '../shared/useContextTrigger';
import { nextLocationCaseMode } from './locationCase';
import { getNextThemeMode, getThemeToggleLabel } from './themeMenu';
import { deriveYouDockState } from './youDock';
import {
  formatGenericDockLabel,
  formatMeDockLabel,
  getDockClickIntent,
  type SubsystemScope,
} from './subsystemDock';
import {
  SUBSYSTEM_CONTEXT_MENU_EVENT,
  buildSubsystemContextMenu,
  type SubsystemContextMenuActionId,
  type SubsystemContextMenuEventDetail,
  type SubsystemContextMenuRow,
} from './subsystemContextMenu';

type DesktopPanelScope = 'you' | 'third' | 'connect' | 'me';
type SubsystemMenuState = SubsystemContextMenuEventDetail & { left: number; top: number };

const CONTEXT_MENU_WIDTH_PX = 288;
const CONTEXT_MENU_HEIGHT_PX = 320;
const CONTEXT_MENU_MARGIN_PX = 8;
const DOCK_CONTEXT_MENU_GAP_PX = 8;
const SUBSYSTEM_CONTEXT_MENU_OFFSET_X_PX = 8;
const SUBSYSTEM_CONTEXT_MENU_OFFSET_Y_PX = 32;
const MOBILE_FULLSCREEN_LOCK_MAX_WIDTH_PX = 1024;

const FULLSCREEN_LAYER_LABEL_BY_SCOPE: Record<SubsystemScope, string> = {
  me: 'ME.EXE fullscreen',
  you: 'YOU.EXE fullscreen',
  third: 'THIRD.EXE fullscreen',
  connect: 'CONNECT.EXE fullscreen',
};

const getLocationLabel = (): string => {
  const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!timezone) return 'location --';
  const parts = timezone.split('/');
  const city = parts[parts.length - 1]?.replace(/_/g, ' ');
  return city ? city : 'location --';
};

const isMobileViewportWidth = (): boolean => (
  typeof window !== 'undefined' && window.innerWidth <= MOBILE_FULLSCREEN_LOCK_MAX_WIDTH_PX
);

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
    mode: thirdMode,
    setMode: setThirdMode,
    toggleMode: toggleThirdMode,
    physicsEnabled: thirdPhysicsEnabled,
    togglePhysics: toggleThirdPhysics,
    resetScene: resetThirdScene,
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
  const [subsystemMenu, setSubsystemMenu] = useState<SubsystemMenuState | null>(null);
  const [youLastSeenAt, setYouLastSeenAt] = useState<string | null>(null);
  const [mobileViewport, setMobileViewport] = useState<boolean>(() => isMobileViewportWidth());

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
    const onResize = () => setMobileViewport(isMobileViewportWidth());
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  useEffect(() => {
    if (!subsystemMenu) return;
    const onDocPointerDown = () => setSubsystemMenu(null);
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSubsystemMenu(null);
    };
    window.addEventListener('pointerdown', onDocPointerDown, { once: true });
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('pointerdown', onDocPointerDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [subsystemMenu]);

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
  const shouldLockMobileFullscreenScroll = anyFullscreenOpen && mobileViewport;
  const inYouContext = activeScope === 'you' || youDisplayMode === 'fullscreen';
  const resolveSubsystemAnchorPoint = useCallback((detail: SubsystemContextMenuEventDetail): { x: number; y: number } => {
    if (detail.origin === 'dock') {
      const dockTarget = document.querySelector(`[data-subsystem-dock="${detail.scope}"]`);
      if (dockTarget instanceof HTMLElement) {
        const dockRect = dockTarget.getBoundingClientRect();
        return {
          x: dockRect.left,
          y: dockRect.top - DOCK_CONTEXT_MENU_GAP_PX,
        };
      }
    }

    const fullscreenTarget = document.querySelector(
      `[aria-label="${FULLSCREEN_LAYER_LABEL_BY_SCOPE[detail.scope]}"]`
    );
    const panelTarget = document.querySelector(`[data-panel-scope="${detail.scope}"]`);
    const target = fullscreenTarget instanceof HTMLElement
      ? fullscreenTarget
      : panelTarget;

    if (!(target instanceof HTMLElement)) {
      return { x: detail.x, y: detail.y };
    }

    const rect = target.getBoundingClientRect();

    return {
      x: rect.left + SUBSYSTEM_CONTEXT_MENU_OFFSET_X_PX,
      y: rect.top + SUBSYSTEM_CONTEXT_MENU_OFFSET_Y_PX,
    };
  }, []);
  const clampContextMenuAnchor = useCallback((args: {
    x: number;
    y: number;
    origin: SubsystemContextMenuEventDetail['origin'];
  }): { left: number; top: number } => {
    const x = args.x;
    const y = args.y;
    const maxLeft = Math.max(
      CONTEXT_MENU_MARGIN_PX,
      window.innerWidth - CONTEXT_MENU_WIDTH_PX - CONTEXT_MENU_MARGIN_PX
    );
    const minTop = args.origin === 'dock'
      ? CONTEXT_MENU_MARGIN_PX + CONTEXT_MENU_HEIGHT_PX
      : CONTEXT_MENU_MARGIN_PX;
    const maxTop = args.origin === 'dock'
      ? window.innerHeight - CONTEXT_MENU_MARGIN_PX
      : Math.max(
        CONTEXT_MENU_MARGIN_PX,
        window.innerHeight - CONTEXT_MENU_HEIGHT_PX - CONTEXT_MENU_MARGIN_PX
      );

    return {
      left: Math.max(CONTEXT_MENU_MARGIN_PX, Math.min(x, maxLeft)),
      top: Math.max(minTop, Math.min(y, maxTop)),
    };
  }, []);

  const openSubsystemContextMenu = useCallback((detail: SubsystemContextMenuEventDetail) => {
    setMenuOpen(false);
    const anchorPoint = resolveSubsystemAnchorPoint(detail);
    const anchor = clampContextMenuAnchor({
      x: anchorPoint.x,
      y: anchorPoint.y,
      origin: detail.origin,
    });
    setSubsystemMenu({
      ...detail,
      left: anchor.left,
      top: anchor.top,
    });
  }, [clampContextMenuAnchor, resolveSubsystemAnchorPoint]);

  useEffect(() => {
    if (!shouldLockMobileFullscreenScroll) return;
    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY;
    const prev = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      bodyOverscrollBehavior: body.style.overscrollBehavior,
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    return () => {
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      body.style.overflow = prev.bodyOverflow;
      body.style.overscrollBehavior = prev.bodyOverscrollBehavior;
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscrollBehavior;
      window.scrollTo(0, scrollY);
    };
  }, [shouldLockMobileFullscreenScroll]);

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

  const dispatchFileManCommand = (commandId: FileManCommandId) => {
    const emit = () => {
      window.dispatchEvent(new CustomEvent<FileManCommandDetail>(FILEMAN_COMMAND_EVENT, {
        detail: { id: commandId },
      }));
    };
    const fileWindowOpen = orderedWindows.some((win) => win.appId === 'file');
    if (!fileWindowOpen) {
      openAppForScope('file');
      window.requestAnimationFrame(() => window.requestAnimationFrame(emit));
      return;
    }
    emit();
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
    setSubsystemMenu(null);
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

  const focusMeWindowFromDock = (windowId: string) => {
    setSubsystemMenu(null);
    if (activeFullscreenScope !== 'me') {
      closeAllFullscreen();
      openMeFullscreen();
    }
    restoreWindow(windowId);
  };

  const openMostRecentMeWindow = () => {
    setSubsystemMenu(null);
    const recentWindow = meWindowsLadder[0];
    if (!recentWindow) {
      openAppForScope('file');
      return;
    }
    focusMeWindowFromDock(recentWindow.id);
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

  useEffect(() => {
    const onSubsystemContextMenu = (event: Event) => {
      const detail = (event as CustomEvent<SubsystemContextMenuEventDetail>).detail;
      if (!detail) return;
      openSubsystemContextMenu(detail);
    };

    window.addEventListener(SUBSYSTEM_CONTEXT_MENU_EVENT, onSubsystemContextMenu as EventListener);
    return () => {
      window.removeEventListener(SUBSYSTEM_CONTEXT_MENU_EVENT, onSubsystemContextMenu as EventListener);
    };
  }, [openSubsystemContextMenu]);

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
      case 'third_toggle_mode':
        toggleThirdMode();
        break;
      case 'third_toggle_physics':
        toggleThirdPhysics();
        break;
      case 'third_reset_scene':
        resetThirdScene();
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

  const runSubsystemContextAction = (actionId: SubsystemContextMenuActionId) => {
    switch (actionId) {
      case 'open_me':
        onSubsystemDockClick('me');
        return;
      case 'open_me_recent':
        openMostRecentMeWindow();
        return;
      case 'open_you':
        onSubsystemDockClick('you');
        return;
      case 'open_third':
        onSubsystemDockClick('third');
        return;
      case 'open_connect':
        onSubsystemDockClick('connect');
        return;
      case 'me_new_file':
        dispatchFileManCommand('new_file');
        break;
      case 'me_new_folder':
        dispatchFileManCommand('new_folder');
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
      case 'you_save_input':
        dispatchShellEvent('terminalos:you:save-input');
        break;
      case 'you_clear_input':
        dispatchShellEvent('terminalos:you:clear-input');
        break;
      case 'third_set_edit_mode':
        setThirdMode('edit');
        break;
      case 'third_set_play_mode':
        setThirdMode('play');
        break;
      case 'third_toggle_physics':
        toggleThirdPhysics();
        break;
      case 'third_reset_scene':
        resetThirdScene();
        break;
      case 'connect_copy_banner':
        dispatchShellEvent('terminalos:connect:copy-banner');
        break;
      case 'todo_connect_notifications':
      default:
        break;
    }
    setSubsystemMenu(null);
  };

  const subsystemMenuModel = useMemo(() => {
    if (!subsystemMenu) return null;
    return buildSubsystemContextMenu({
      scope: subsystemMenu.scope,
      origin: subsystemMenu.origin,
      meWindowCount: meWindowCount,
      youHasDraft: youDockState.hasDraft,
      youUnreadCount: youDockState.unreadCount,
      thirdNotificationCount,
      thirdMode,
      thirdPhysicsEnabled,
      connectNotificationCount,
    });
  }, [
    connectNotificationCount,
    meWindowCount,
    subsystemMenu,
    thirdNotificationCount,
    thirdMode,
    thirdPhysicsEnabled,
    youDockState.hasDraft,
    youDockState.unreadCount,
  ]);

  const meMenuActionRows = useMemo(() => (
    subsystemMenuModel?.rows.filter(
      (row): row is Extract<SubsystemContextMenuRow, { kind: 'action' }> => row.kind === 'action'
    ) ?? []
  ), [subsystemMenuModel]);

  const meDockContextTrigger = useContextTrigger<HTMLButtonElement>({
    suppressInteractiveTargets: false,
    onOpen: ({ x, y, source }) => {
      openSubsystemContextMenu({
        scope: 'me',
        origin: 'dock',
        source,
        x,
        y,
      });
    },
  });
  const youDockContextTrigger = useContextTrigger<HTMLButtonElement>({
    suppressInteractiveTargets: false,
    onOpen: ({ x, y, source }) => {
      openSubsystemContextMenu({
        scope: 'you',
        origin: 'dock',
        source,
        x,
        y,
      });
    },
  });
  const thirdDockContextTrigger = useContextTrigger<HTMLButtonElement>({
    suppressInteractiveTargets: false,
    onOpen: ({ x, y, source }) => {
      openSubsystemContextMenu({
        scope: 'third',
        origin: 'dock',
        source,
        x,
        y,
      });
    },
  });
  const connectDockContextTrigger = useContextTrigger<HTMLButtonElement>({
    suppressInteractiveTargets: false,
    onOpen: ({ x, y, source }) => {
      openSubsystemContextMenu({
        scope: 'connect',
        origin: 'dock',
        source,
        x,
        y,
      });
    },
  });

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
                {item.id === 'toggle_theme'
                  ? getThemeToggleLabel(resolvedTheme)
                  : item.id === 'third_toggle_mode'
                    ? (thirdMode === 'edit' ? 'SWITCH TO PLAY MODE' : 'SWITCH TO EDIT MODE')
                    : item.id === 'third_toggle_physics'
                      ? `PHYSICS: ${thirdPhysicsEnabled ? 'ON' : 'OFF'}`
                    : item.label}
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
          data-subsystem-dock="me"
          onClick={() => onSubsystemDockClick('me')}
          title="Open ME.EXE"
          onContextMenu={meDockContextTrigger.onContextMenu}
          onPointerDown={meDockContextTrigger.onPointerDown}
          onPointerMove={meDockContextTrigger.onPointerMove}
          onPointerUp={meDockContextTrigger.onPointerUp}
          onPointerCancel={meDockContextTrigger.onPointerCancel}
          onClickCapture={meDockContextTrigger.onClickCapture}
          onKeyDown={meDockContextTrigger.onKeyDown}
        >
          {formatMeDockLabel(meWindowCount)}
        </button>
        <button
          type="button"
          className={`${styles.taskBtn} ${styles.taskBtnSubsystem} ${styles.taskBtnYou} ${youDockState.showCombinedDot ? styles.taskBtnYouCombined : ''}`.trim()}
          data-subsystem-dock="you"
          onClick={() => onSubsystemDockClick('you')}
          title="Focus or open YOU.EXE"
          onContextMenu={youDockContextTrigger.onContextMenu}
          onPointerDown={youDockContextTrigger.onPointerDown}
          onPointerMove={youDockContextTrigger.onPointerMove}
          onPointerUp={youDockContextTrigger.onPointerUp}
          onPointerCancel={youDockContextTrigger.onPointerCancel}
          onClickCapture={youDockContextTrigger.onClickCapture}
          onKeyDown={youDockContextTrigger.onKeyDown}
        >
          {youDockState.label}
        </button>
        <button
          type="button"
          className={`${styles.taskBtn} ${styles.taskBtnSubsystem}`.trim()}
          data-subsystem-dock="third"
          onClick={() => onSubsystemDockClick('third')}
          title="Open THIRD.EXE"
          onContextMenu={thirdDockContextTrigger.onContextMenu}
          onPointerDown={thirdDockContextTrigger.onPointerDown}
          onPointerMove={thirdDockContextTrigger.onPointerMove}
          onPointerUp={thirdDockContextTrigger.onPointerUp}
          onPointerCancel={thirdDockContextTrigger.onPointerCancel}
          onClickCapture={thirdDockContextTrigger.onClickCapture}
          onKeyDown={thirdDockContextTrigger.onKeyDown}
        >
          {formatGenericDockLabel('THIRD.EXE', thirdNotificationCount)}
        </button>
        <button
          type="button"
          className={`${styles.taskBtn} ${styles.taskBtnSubsystem}`.trim()}
          data-subsystem-dock="connect"
          onClick={() => onSubsystemDockClick('connect')}
          title="Open CONNECT.EXE"
          onContextMenu={connectDockContextTrigger.onContextMenu}
          onPointerDown={connectDockContextTrigger.onPointerDown}
          onPointerMove={connectDockContextTrigger.onPointerMove}
          onPointerUp={connectDockContextTrigger.onPointerUp}
          onPointerCancel={connectDockContextTrigger.onPointerCancel}
          onClickCapture={connectDockContextTrigger.onClickCapture}
          onKeyDown={connectDockContextTrigger.onKeyDown}
        >
          {formatGenericDockLabel('CONNECT.EXE', connectNotificationCount)}
        </button>
      </div>
      {subsystemMenu?.scope === 'me' ? (
        <div
          className={`${styles.meDockMenu} ${subsystemMenu.origin === 'dock' ? styles.subsystemMenuDockAnchored : ''}`.trim()}
          role="menu"
          aria-label="ME.EXE windows"
          style={{ left: subsystemMenu.left, top: subsystemMenu.top }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
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
          {meMenuActionRows.length > 0 ? (
            <div className={styles.subsystemMenuDivider} />
          ) : null}
          {meMenuActionRows.map((row) => (
            <button
              key={row.key}
              type="button"
              className={styles.meDockMenuAction}
              onClick={() => runSubsystemContextAction(row.id)}
              disabled={row.disabled}
            >
              {row.label}
            </button>
          ))}
        </div>
      ) : null}
      {subsystemMenu && subsystemMenu.scope !== 'me' && subsystemMenuModel ? (
        <div
          className={`${styles.subsystemMenu} ${subsystemMenu.origin === 'dock' ? styles.subsystemMenuDockAnchored : ''}`.trim()}
          role="menu"
          aria-label={`${subsystemMenuModel.title} context menu`}
          style={{ left: subsystemMenu.left, top: subsystemMenu.top }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <p className={styles.subsystemMenuTitle}>{subsystemMenuModel.title}</p>
          {subsystemMenuModel.rows.map((row) => {
            if (row.kind === 'divider') {
              return <div key={row.key} className={styles.subsystemMenuDivider} aria-hidden="true" />;
            }
            if (row.kind === 'status') {
              return (
                <p key={row.key} className={styles.subsystemMenuStatus}>
                  {row.label}
                </p>
              );
            }
            return (
              <button
                key={row.key}
                type="button"
                className={`${styles.subsystemMenuItem} ${row.disabled ? styles.subsystemMenuItemDisabled : ''}`.trim()}
                onClick={() => runSubsystemContextAction(row.id)}
                disabled={row.disabled}
              >
                {row.label}
              </button>
            );
          })}
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
