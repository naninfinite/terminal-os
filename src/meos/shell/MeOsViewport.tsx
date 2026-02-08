/**
 * ME.OS visual shell.
 *
 * Rendering modes:
 * - `panel`: compact live preview for `ME.EXE` panel.
 * - `fullscreen`: full interactive shell view.
 */
import React, { useMemo } from 'react';
import { useMeOs } from './MeOsProvider';
import type { MeOsDisplayMode, MeOsWindow } from './types';
import styles from './MeOsShell.module.scss';

type MeOsViewportProps = {
  mode: MeOsDisplayMode;
};

type MeOsWindowCardProps = {
  win: MeOsWindow;
  mode: MeOsDisplayMode;
};

const MeOsWindowCard: React.FC<MeOsWindowCardProps> = ({ win, mode }) => {
  const { focusWindow, moveWindow, minimizeWindow, closeWindow, openApp } = useMeOs();
  const interactive = mode === 'fullscreen';

  /**
   * Header-drag algorithm for fullscreen mode.
   * Uses document-level listeners so drag remains smooth even when pointer
   * leaves the window frame during movement.
   */
  const onDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
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

  const renderContent = () => {
    if (win.appId === 'home') {
      return (
        <div className={styles.homeContent}>
          <p className={styles.copy}>ME.OS SHELL READY</p>
          <p className={styles.copyDim}>M1 foundation: shared panel/fullscreen state + persisted windows.</p>
          <div className={styles.launchGrid}>
            <button type="button" className={styles.launchBtn} onClick={() => openApp('about')}>OPEN ABOUT</button>
            <button type="button" className={styles.launchBtn} onClick={() => openApp('projects')}>OPEN PROJECTS</button>
            <button type="button" className={styles.launchBtn} onClick={() => openApp('media')}>OPEN MEDIA</button>
          </div>
        </div>
      );
    }
    if (win.appId === 'about') {
      return (
        <div className={styles.docContent}>
          <p className={styles.copy}>ABOUT.TXT</p>
          <p className={styles.copyDim}>Terminal-OS portfolio shell. FileMan v2 and viewers will be layered on this shell.</p>
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
      className={styles.window}
      style={{
        left: `${win.x}px`,
        top: `${win.y}px`,
        width: `${win.width}px`,
        height: `${win.height}px`,
        zIndex: win.zIndex,
      }}
      onMouseDown={() => focusWindow(win.id)}
      aria-label={win.title}
    >
      <div className={styles.windowHeader} onMouseDown={onDragStart}>
        <span className={styles.windowTitle}>[{win.title}]</span>
        {interactive ? (
          <div className={styles.windowActions}>
            <button type="button" className={styles.windowBtn} onClick={() => minimizeWindow(win.id)} aria-label={`Minimize ${win.title}`}>_</button>
            <button type="button" className={styles.windowBtn} onClick={() => closeWindow(win.id)} aria-label={`Close ${win.title}`}>X</button>
          </div>
        ) : null}
      </div>
      <div className={styles.windowBody}>{renderContent()}</div>
    </article>
  );
};

export const MeOsViewport: React.FC<MeOsViewportProps> = ({ mode }) => {
  const { windows, openFullscreen, closeFullscreen, openApp } = useMeOs();
  const activeWindows = useMemo(
    () => windows.filter((w) => !w.minimized).sort((a, b) => a.zIndex - b.zIndex),
    [windows]
  );
  const visibleWindows = mode === 'panel' ? activeWindows.slice(-1) : activeWindows;

  return (
    <section className={`${styles.viewport} ${mode === 'panel' ? styles.panelMode : styles.fullscreenMode}`.trim()}>
      <header className={styles.chromeHeader}>
        <span className={styles.chromeTitle}>[ME.OS]</span>
        <div className={styles.chromeActions}>
          {mode === 'panel' ? (
            <button type="button" className={styles.chromeBtn} onClick={openFullscreen} aria-label="Expand ME.OS">
              EXPAND
            </button>
          ) : (
            <button type="button" className={styles.chromeBtn} onClick={closeFullscreen} aria-label="Close ME.OS fullscreen">
              CLOSE
            </button>
          )}
        </div>
      </header>

      <div className={styles.stageViewport}>
        <div className={styles.stage}>
          {visibleWindows.length === 0 ? (
            <div className={styles.emptyState}>
              <p>NO WINDOWS OPEN</p>
              <button type="button" className={styles.launchBtn} onClick={() => openApp('home')}>RESTORE HOME</button>
            </div>
          ) : (
            visibleWindows.map((w) => <MeOsWindowCard key={w.id} win={w} mode={mode} />)
          )}
        </div>
      </div>

      <footer className={styles.chromeFooter}>
        <button type="button" className={styles.startBtn} onClick={() => openApp('home')} aria-label="Open ME.OS Home">
          [ START ]
        </button>
        <span className={styles.footerInfo}>{activeWindows.length} WINDOW(S)</span>
      </footer>
    </section>
  );
};

