/**
 * ME.OS visual shell.
 *
 * Rendering modes:
 * - `panel`: compact live preview for `ME.EXE` panel.
 * - `fullscreen`: full interactive shell view.
 */
import React, { useMemo, useState } from 'react';
import { useMeOs } from './MeOsProvider';
import type { MeOsDisplayMode, MeOsFixedAppId, MeOsWindow } from './types';
import styles from './MeOsShell.module.scss';
import FileManWindow from '../apps/fileman/FileManWindow';
import FileViewerWindow from '../apps/viewers/FileViewerWindow';

type MeOsViewportProps = {
  mode: MeOsDisplayMode;
  onPanelBackgroundEnterFullscreen?: () => void;
};

type MeOsWindowCardProps = {
  win: MeOsWindow;
  mode: MeOsDisplayMode;
};

type ResizeHandle = 'n' | 'e' | 's' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

const PANEL_DOUBLE_TAP_MS = 300;

const MeOsWindowCard: React.FC<MeOsWindowCardProps> = ({ win, mode }) => {
  const { focusWindow, moveWindow, resizeWindow, minimizeWindow, toggleMaximizeWindow, closeWindow } = useMeOs();
  const interactive = mode === 'fullscreen' || mode === 'panel';
  const stopHeaderInteraction = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
  };

  /**
   * Header-drag algorithm for interactive shell modes.
   * Uses document-level listeners so drag remains smooth even when pointer
   * leaves the window frame during movement.
   */
  const onDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || win.maximized || e.button !== 0) return;
    if (e.target instanceof HTMLElement && e.target.closest('[data-window-action="true"]')) return;
    e.preventDefault();
    focusWindow(win.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWinX = win.x;
    const startWinY = win.y;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      moveWindow(win.id, startWinX + dx, startWinY + dy);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
  };

  const onResizeStart = (handle: ResizeHandle) => (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || win.maximized || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    focusWindow(win.id);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWinX = win.x;
    const startWinY = win.y;
    const startWidth = win.width;
    const startHeight = win.height;

    const onMove = (ev: MouseEvent) => {
      const dw = ev.clientX - startX;
      const dh = ev.clientY - startY;
      const horizontal = handle.includes('e') ? 1 : (handle.includes('w') ? -1 : 0);
      const vertical = handle.includes('s') ? 1 : (handle.includes('n') ? -1 : 0);
      let nextX = startWinX;
      let nextY = startWinY;
      let nextWidth = startWidth;
      let nextHeight = startHeight;

      if (horizontal !== 0) {
        nextWidth = startWidth + (horizontal * dw);
        if (horizontal < 0) nextX = startWinX + dw;
      }
      if (vertical !== 0) {
        nextHeight = startHeight + (vertical * dh);
        if (vertical < 0) nextY = startWinY + dh;
      }

      resizeWindow(win.id, {
        x: nextX,
        y: nextY,
        width: nextWidth,
        height: nextHeight,
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
  };

  const renderContent = () => {
    if (win.appId === 'file') {
      return <FileManWindow />;
    }

    if (
      win.appId === 'viewer_text'
      || win.appId === 'viewer_image'
      || win.appId === 'viewer_video'
      || win.appId === 'viewer_project'
    ) {
      return <FileViewerWindow win={win} />;
    }

    if (win.appId === 'about') {
      return (
        <div className={styles.docContent}>
          <p className={styles.copy}>ABOUT.TXT</p>
          <p className={styles.copyDim}>Terminal-OS portfolio shell. File and viewers will be layered on this shell.</p>
        </div>
      );
    }
    if (win.appId === 'projects') {
      return (
        <div className={styles.docContent}>
          <p className={styles.copy}>PROJECTS.DIR</p>
          <ul className={styles.list}>
            <li>Terminal-OS</li>
            <li>Interactive web experiments</li>
            <li>Archive (planned)</li>
          </ul>
        </div>
      );
    }
    return (
      <div className={styles.docContent}>
        <p className={styles.copy}>MEDIA.DIR</p>
        <ul className={styles.list}>
          <li>Images</li>
          <li>Videos</li>
          <li>Audio (future)</li>
        </ul>
      </div>
    );
  };

  return (
    <article
      className={`${styles.window} ${win.maximized ? styles.windowMaximized : ''}`.trim()}
      style={{
        left: `${win.x}px`,
        top: `${win.y}px`,
        width: `${win.width}px`,
        height: `${win.height}px`,
        zIndex: win.zIndex,
      }}
      onMouseDown={() => {
        if (!interactive) return;
        focusWindow(win.id);
      }}
      aria-label={win.title}
    >
      <div className={styles.windowHeader} onMouseDown={onDragStart}>
        <span className={styles.windowTitle}>[{win.title}]</span>
        {interactive ? (
          <div className={styles.windowActions} onMouseDown={stopHeaderInteraction} data-window-action="true">
            <button
              type="button"
              className={styles.windowBtn}
              data-window-action="true"
              onMouseDown={stopHeaderInteraction}
              onClick={() => minimizeWindow(win.id)}
              aria-label={`Minimize ${win.title}`}
            >
              _
            </button>
            <button
              type="button"
              className={styles.windowBtn}
              data-window-action="true"
              onMouseDown={stopHeaderInteraction}
              onClick={() => toggleMaximizeWindow(win.id)}
              aria-label={`${win.maximized ? 'Restore' : 'Maximize'} ${win.title}`}
            >
              []
            </button>
            <button
              type="button"
              className={styles.windowBtn}
              data-window-action="true"
              onMouseDown={stopHeaderInteraction}
              onClick={() => closeWindow(win.id)}
              aria-label={`Close ${win.title}`}
            >
              X
            </button>
          </div>
        ) : null}
      </div>
      <div className={`${styles.windowBody} ${win.appId === 'file' ? styles.windowBodyNoScroll : ''}`.trim()}>
        {renderContent()}
      </div>
      {interactive && !win.maximized ? (
        <>
          <div
            className={`${styles.windowResizeHandle} ${styles.windowResizeHandleN}`.trim()}
            onMouseDown={onResizeStart('n')}
            aria-hidden="true"
          />
          <div
            className={`${styles.windowResizeHandle} ${styles.windowResizeHandleE}`.trim()}
            onMouseDown={onResizeStart('e')}
            aria-hidden="true"
          />
          <div
            className={`${styles.windowResizeHandle} ${styles.windowResizeHandleS}`.trim()}
            onMouseDown={onResizeStart('s')}
            aria-hidden="true"
          />
          <div
            className={`${styles.windowResizeHandle} ${styles.windowResizeHandleW}`.trim()}
            onMouseDown={onResizeStart('w')}
            aria-hidden="true"
          />
          <div
            className={`${styles.windowResizeHandle} ${styles.windowResizeHandleNw}`.trim()}
            onMouseDown={onResizeStart('nw')}
            aria-hidden="true"
          />
          <div
            className={`${styles.windowResizeHandle} ${styles.windowResizeHandleNe}`.trim()}
            onMouseDown={onResizeStart('ne')}
            aria-hidden="true"
          />
          <div
            className={`${styles.windowResizeHandle} ${styles.windowResizeHandleSw}`.trim()}
            onMouseDown={onResizeStart('sw')}
            aria-hidden="true"
          />
          <div
            className={`${styles.windowResizeHandle} ${styles.windowResizeHandleSe}`.trim()}
            onMouseDown={onResizeStart('se')}
            aria-hidden="true"
          />
        </>
      ) : null}
    </article>
  );
};

export const MeOsViewport: React.FC<MeOsViewportProps> = ({ mode, onPanelBackgroundEnterFullscreen }) => {
  const { windows, closeFullscreen, openApp } = useMeOs();
  const [selectedLauncher, setSelectedLauncher] = useState<MeOsFixedAppId | null>(null);
  const isFullscreen = mode === 'fullscreen';
  const isPanel = mode === 'panel';
  const panelTapAtRef = React.useRef<number | null>(null);
  const launchers: Array<{ id: MeOsFixedAppId; label: string }> = [
    { id: 'file', label: 'FILE' },
    { id: 'about', label: 'ABOUT' },
    { id: 'projects', label: 'PROJECTS' },
    { id: 'media', label: 'MEDIA' },
  ];
  const activeWindows = useMemo(
    () => windows.filter((w) => !w.minimized).sort((a, b) => a.zIndex - b.zIndex),
    [windows]
  );
  const windowCount = activeWindows.length;
  const desktopStateLabel = windowCount === 0 ? 'DESKTOP READY' : 'DESKTOP ACTIVE';
  const visibleWindows = activeWindows;

  const onPanelBackgroundDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanel || !onPanelBackgroundEnterFullscreen) return;
    if (event.target !== event.currentTarget) return;
    onPanelBackgroundEnterFullscreen();
  };

  const onPanelBackgroundPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanel || !onPanelBackgroundEnterFullscreen) return;
    if (event.pointerType !== 'touch') return;
    if (event.target !== event.currentTarget) {
      panelTapAtRef.current = null;
      return;
    }
    const now = event.timeStamp;
    const previousTap = panelTapAtRef.current;
    if (previousTap != null && now - previousTap <= PANEL_DOUBLE_TAP_MS) {
      panelTapAtRef.current = null;
      onPanelBackgroundEnterFullscreen();
      return;
    }
    panelTapAtRef.current = now;
  };

  return (
    <section className={`${styles.viewport} ${mode === 'panel' ? styles.panelMode : styles.fullscreenMode}`.trim()}>
      {isFullscreen ? (
        <header className={styles.chromeHeader}>
          <span className={styles.chromeTitle}>[ME.EXE]</span>
          <div className={styles.chromeActions}>
            <button type="button" className={styles.chromeBtn} onClick={closeFullscreen} aria-label="Close ME.EXE fullscreen">
              X
            </button>
          </div>
        </header>
      ) : null}

      <div className={styles.stageViewport}>
        <div
          className={styles.stage}
          onDoubleClick={onPanelBackgroundDoubleClick}
          onPointerUp={onPanelBackgroundPointerUp}
        >
          <div className={styles.launcherShelf}>
            <div className={styles.launchGrid}>
              {launchers.map((launcher) => (
                <button
                  key={launcher.id}
                  type="button"
                  className={`${styles.launchBtn} ${selectedLauncher === launcher.id ? styles.launchBtnSelected : ''}`.trim()}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isPanel) {
                      setSelectedLauncher(launcher.id);
                      openApp(launcher.id);
                      return;
                    }
                    if (!isFullscreen) return;
                    setSelectedLauncher(launcher.id);
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    if (!isFullscreen) return;
                    setSelectedLauncher(launcher.id);
                    openApp(launcher.id);
                  }}
                  onKeyDown={(event) => {
                    if (!isPanel && !isFullscreen) return;
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    setSelectedLauncher(launcher.id);
                    openApp(launcher.id);
                  }}
                  tabIndex={isPanel || isFullscreen ? 0 : -1}
                  aria-disabled={!isPanel && !isFullscreen}
                  aria-pressed={selectedLauncher === launcher.id}
                  aria-label={`${launcher.label} launcher`}
                >
                  {launcher.label}
                </button>
              ))}
            </div>
          </div>

          {visibleWindows.map((w) => (
            <MeOsWindowCard
              key={w.id}
              win={w}
              mode={mode}
            />
          ))}
        </div>
      </div>

      {isFullscreen ? (
        <footer className={styles.chromeFooter}>
          <span className={styles.footerInfo}>{`${desktopStateLabel} | ${windowCount} WINDOW(S)`}</span>
        </footer>
      ) : null}
    </section>
  );
};
