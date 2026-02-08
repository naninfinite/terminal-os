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
import { useMeOsVfs } from '../vfs/MeOsVfsProvider';
import FileManWindow from '../apps/fileman/FileManWindow';
import FileViewerWindow from '../apps/viewers/FileViewerWindow';

type MeOsViewportProps = {
  mode: MeOsDisplayMode;
};

type MeOsWindowCardProps = {
  win: MeOsWindow;
  mode: MeOsDisplayMode;
};

const MeOsWindowCard: React.FC<MeOsWindowCardProps> = ({ win, mode }) => {
  const { focusWindow, moveWindow, minimizeWindow, closeWindow, openApp } = useMeOs();
  const { listChildren, snapshot, reset } = useMeOsVfs();
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
      const rootEntries = listChildren(snapshot.rootId);
      return (
        <div className={styles.homeContent}>
          <p className={styles.copy}>ME.EXE SHELL READY</p>
          <p className={styles.copyDim}>M3 foundation: FileMan v2 shell app and viewer window routing.</p>
          <div className={styles.dirList}>
            {rootEntries.map((entry) => (
              <div key={entry.id} className={styles.dirRow}>
                <span>{entry.type === 'folder' ? '[DIR]' : '[FILE]'}</span>
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
          <div className={styles.launchGrid}>
            <button type="button" className={styles.launchBtn} onClick={() => openApp('fileman')}>OPEN FILEMAN</button>
            <button type="button" className={styles.launchBtn} onClick={() => openApp('about')}>OPEN ABOUT</button>
            <button type="button" className={styles.launchBtn} onClick={() => openApp('projects')}>OPEN PROJECTS</button>
            <button type="button" className={styles.launchBtn} onClick={() => openApp('media')}>OPEN MEDIA</button>
            {interactive ? (
              <button type="button" className={styles.launchBtn} onClick={reset}>RESET VFS</button>
            ) : null}
          </div>
        </div>
      );
    }

    if (win.appId === 'fileman') {
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
      <div className={`${styles.windowBody} ${win.appId === 'fileman' ? styles.windowBodyNoScroll : ''}`.trim()}>
        {renderContent()}
      </div>
    </article>
  );
};

export const MeOsViewport: React.FC<MeOsViewportProps> = ({ mode }) => {
  const { windows, closeFullscreen, openApp } = useMeOs();
  const activeWindows = useMemo(
    () => windows.filter((w) => !w.minimized).sort((a, b) => a.zIndex - b.zIndex),
    [windows]
  );
  const visibleWindows = mode === 'panel' ? activeWindows.slice(-1) : activeWindows;

  return (
    <section className={`${styles.viewport} ${mode === 'panel' ? styles.panelMode : styles.fullscreenMode}`.trim()}>
      {mode === 'fullscreen' ? (
        <header className={styles.chromeHeader}>
          <span className={styles.chromeTitle}>[ME.EXE]</span>
          <div className={styles.chromeActions}>
            <button type="button" className={styles.chromeBtn} onClick={closeFullscreen} aria-label="Close ME.EXE fullscreen">
              CLOSE
            </button>
          </div>
        </header>
      ) : null}

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

      {mode === 'fullscreen' ? (
        <footer className={styles.chromeFooter}>
          <span className={styles.footerInfo}>{activeWindows.length} WINDOW(S)</span>
        </footer>
      ) : null}
    </section>
  );
};
