/**
 * ME.OS visual shell.
 *
 * Rendering modes:
 * - `panel`: compact live preview for `ME.EXE` panel.
 * - `fullscreen`: full interactive shell view.
 */
import React from 'react';
import { useContextTrigger } from '../../components/shared/useContextTrigger';
import FileManWindow from '../apps/fileman/FileManWindow';
import NodeInfoWindow from '../apps/viewers/NodeInfoWindow';
import FileViewerWindow from '../apps/viewers/FileViewerWindow';
import { createDesktopEntries } from './desktopEntries';
import { useMeOs } from './MeOsProvider';
import type { MeOsDesktopEntry, MeOsDesktopEntryId, MeOsDisplayMode, MeOsWindow } from './types';
import styles from './MeOsShell.module.scss';
import { useMeOsVfs } from '../vfs/MeOsVfsProvider';
import { Icon } from '../../components/shared/Icon';
import type { AppIconName } from '../../components/shared/Icon';

type MeOsViewportProps = {
  mode: MeOsDisplayMode;
  onPanelBackgroundEnterFullscreen?: () => void;
};

type MeOsWindowCardProps = {
  win: MeOsWindow;
  mode: MeOsDisplayMode;
};

type DesktopContextMenuState = {
  left: number;
  top: number;
  nodeId: string;
  label: string;
  desktopEntryId?: MeOsDesktopEntryId;
} | null;

type DesktopEntryButtonProps = {
  entry: MeOsDesktopEntry;
  active: boolean;
  columnCount: number;
  onSelect: (entryId: MeOsDesktopEntryId) => void;
  onOpen: (entry: MeOsDesktopEntry) => void;
  onGetInfo: (entry: MeOsDesktopEntry) => void;
  onMoveSelection: (offset: number) => void;
  onContextOpen: (args: { x: number; y: number; entry: MeOsDesktopEntry }) => void;
  registerRef: (entryId: MeOsDesktopEntryId, element: HTMLButtonElement | null) => void;
};

type ResizeHandle = 'n' | 'e' | 's' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

const PANEL_DOUBLE_TAP_MS = 300;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const getEntryIcon = (entry: MeOsDesktopEntry): AppIconName => {
  if (entry.id === 'home') return 'home';
  if (entry.id === 'media') return 'media';
  if (entry.id === 'projects') return 'projects';
  if (entry.iconVariant === 'folder') return 'folder';
  if (entry.iconVariant === 'contact') return 'contact';
  return 'file';
};

const DesktopEntryButton: React.FC<DesktopEntryButtonProps> = ({
  entry,
  active,
  columnCount,
  onSelect,
  onOpen,
  onGetInfo,
  onMoveSelection,
  onContextOpen,
  registerRef,
}) => {
  const ignoreClickRef = React.useRef(false);
  const contextTrigger = useContextTrigger<HTMLButtonElement>({
    suppressInteractiveTargets: false,
    onOpen: ({ x, y }) => {
      onSelect(entry.id);
      onContextOpen({ x, y, entry });
    },
  });
  const iconName = getEntryIcon(entry);

  return (
    <button
      ref={(element) => registerRef(entry.id, element)}
      type="button"
      data-desktop-entry={entry.id}
      className={[
        styles.desktopEntry,
        active ? styles.desktopEntryActive : '',
      ].filter(Boolean).join(' ')}
      onFocus={() => onSelect(entry.id)}
      onClick={() => {
        if (ignoreClickRef.current) {
          ignoreClickRef.current = false;
          return;
        }
        onSelect(entry.id);
      }}
      onDoubleClick={() => onOpen(entry)}
      onContextMenu={contextTrigger.onContextMenu}
      onPointerDown={contextTrigger.onPointerDown}
      onPointerMove={contextTrigger.onPointerMove}
      onPointerUp={(event) => {
        contextTrigger.onPointerUp(event);
        if (event.pointerType !== 'touch') return;
        ignoreClickRef.current = true;
        onOpen(entry);
      }}
      onPointerCancel={contextTrigger.onPointerCancel}
      onTouchStart={contextTrigger.onTouchStart}
      onTouchMove={contextTrigger.onTouchMove}
      onTouchEnd={contextTrigger.onTouchEnd}
      onTouchCancel={contextTrigger.onTouchCancel}
      onClickCapture={contextTrigger.onClickCapture}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(entry);
          return;
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          onMoveSelection(1);
          return;
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onMoveSelection(-1);
          return;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          onMoveSelection(columnCount);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          onMoveSelection(-columnCount);
          return;
        }
        const previousDefaultPrevented = event.defaultPrevented;
        contextTrigger.onKeyDown(event);
        if (!previousDefaultPrevented && event.defaultPrevented) {
          onGetInfo(entry);
        }
      }}
    >
      <span className={styles.desktopEntryIcon} aria-hidden="true">
        <Icon className={styles.desktopEntryIconGlyph} fixedWidth name={iconName} size="lg" />
      </span>
      <span className={styles.desktopEntryLabel}>{entry.label}</span>
    </button>
  );
};

const MeOsWindowCard: React.FC<MeOsWindowCardProps> = ({ win, mode }) => {
  const { focusWindow, moveWindow, resizeWindow, minimizeWindow, toggleMaximizeWindow, closeWindow } = useMeOs();
  const interactive = mode === 'fullscreen' || mode === 'panel';

  const stopHeaderInteraction = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  };

  const onDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || win.maximized || event.button !== 0) return;
    if (event.target instanceof HTMLElement && event.target.closest('[data-window-action="true"]')) return;
    event.preventDefault();
    focusWindow(win.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const startWinX = win.x;
    const startWinY = win.y;

    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      moveWindow(win.id, startWinX + dx, startWinY + dy);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
  };

  const onResizeStart = (handle: ResizeHandle) => (event: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || win.maximized || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    focusWindow(win.id);
    const startX = event.clientX;
    const startY = event.clientY;
    const startWinX = win.x;
    const startWinY = win.y;
    const startWidth = win.width;
    const startHeight = win.height;

    const onMove = (moveEvent: MouseEvent) => {
      const dw = moveEvent.clientX - startX;
      const dh = moveEvent.clientY - startY;
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
    if (win.appId === 'folder') {
      return <FileManWindow win={win} />;
    }
    if (win.appId === 'info') {
      return <NodeInfoWindow win={win} />;
    }
    return <FileViewerWindow win={win} />;
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
        <span className={styles.windowHeaderSpacer} aria-hidden="true" />
        <span className={styles.windowTitle}>{win.title}</span>
        <div className={styles.windowActions} onMouseDown={stopHeaderInteraction} data-window-action="true">
          <button
            type="button"
            className={styles.windowBtn}
            data-window-action="true"
            onMouseDown={stopHeaderInteraction}
            onClick={() => closeWindow(win.id)}
            aria-label={`Close ${win.title}`}
          >
            <Icon className={styles.windowBtnIcon} fixedWidth name="close" size="sm" />
          </button>
          <button
            type="button"
            className={styles.windowBtn}
            data-window-action="true"
            onMouseDown={stopHeaderInteraction}
            onClick={() => minimizeWindow(win.id)}
            aria-label={`Minimize ${win.title}`}
          >
            <Icon className={styles.windowBtnIcon} fixedWidth name="minimize" size="sm" />
          </button>
          <button
            type="button"
            className={styles.windowBtn}
            data-window-action="true"
            onMouseDown={stopHeaderInteraction}
            onClick={() => toggleMaximizeWindow(win.id)}
            aria-label={`${win.maximized ? 'Restore' : 'Zoom'} ${win.title}`}
          >
            <Icon className={styles.windowBtnIcon} fixedWidth name="expand" size="sm" />
          </button>
        </div>
      </div>
      <div className={styles.windowBody}>{renderContent()}</div>
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
  const { snapshot } = useMeOsVfs();
  const { windows, closeFullscreen, openNode, openInfo } = useMeOs();
  const [selectedDesktopEntryId, setSelectedDesktopEntryId] = React.useState<MeOsDesktopEntryId | null>(null);
  const [desktopMenu, setDesktopMenu] = React.useState<DesktopContextMenuState>(null);
  const isFullscreen = mode === 'fullscreen';
  const isPanel = mode === 'panel';
  const panelTapAtRef = React.useRef<number | null>(null);
  const entryRefs = React.useRef<Partial<Record<MeOsDesktopEntryId, HTMLButtonElement | null>>>({});
  const entries = React.useMemo(() => createDesktopEntries(snapshot), [snapshot]);
  const activeWindows = React.useMemo(
    () => windows.filter((win) => !win.minimized).sort((a, b) => a.zIndex - b.zIndex),
    [windows]
  );

  React.useEffect(() => {
    if (selectedDesktopEntryId && entries.some((entry) => entry.id === selectedDesktopEntryId)) return;
    setSelectedDesktopEntryId(entries[0]?.id ?? null);
  }, [entries, selectedDesktopEntryId]);

  React.useEffect(() => {
    if (!desktopMenu) return;
    const onPointerDown = () => setDesktopMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDesktopMenu(null);
    };
    window.addEventListener('pointerdown', onPointerDown, { once: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [desktopMenu]);

  const focusEntry = React.useCallback((entryId: MeOsDesktopEntryId) => {
    window.requestAnimationFrame(() => {
      entryRefs.current[entryId]?.focus();
    });
  }, []);

  const moveDesktopSelection = React.useCallback((offset: number) => {
    if (entries.length === 0) return;
    const currentIndex = entries.findIndex((entry) => entry.id === selectedDesktopEntryId);
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = clamp(startIndex + offset, 0, entries.length - 1);
    const nextEntry = entries[nextIndex];
    if (!nextEntry) return;
    setSelectedDesktopEntryId(nextEntry.id);
    focusEntry(nextEntry.id);
  }, [entries, focusEntry, selectedDesktopEntryId]);

  const openDesktopEntry = React.useCallback((entry: MeOsDesktopEntry) => {
    openNode(entry.nodeId);
    setDesktopMenu(null);
  }, [openNode]);

  const openInfoForDesktopEntry = React.useCallback((entry: MeOsDesktopEntry) => {
    openInfo({ nodeId: entry.nodeId, desktopEntryId: entry.id, label: entry.label });
    setDesktopMenu(null);
  }, [openInfo]);

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
    <section className={`${styles.viewport} ${isPanel ? styles.panelMode : styles.fullscreenMode}`.trim()}>
      {isFullscreen ? (
        <header className={styles.chromeHeader}>
          <span className={styles.chromeTitle}>ME.EXE</span>
          <button
            type="button"
            className={styles.chromeBtn}
            onClick={closeFullscreen}
            aria-label="Close ME.EXE fullscreen"
          >
            CLOSE
          </button>
        </header>
      ) : null}

      <div className={styles.stageViewport}>
        <div
          className={styles.stage}
          onDoubleClick={onPanelBackgroundDoubleClick}
          onPointerUp={onPanelBackgroundPointerUp}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            setSelectedDesktopEntryId(null);
            setDesktopMenu(null);
          }}
          tabIndex={0}
          onKeyDown={(event) => {
            if (!isPanel || !onPanelBackgroundEnterFullscreen) return;
            if (event.target !== event.currentTarget) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            onPanelBackgroundEnterFullscreen();
          }}
        >
          <div className={styles.desktopSurface}>
            {entries.map((entry) => (
              <DesktopEntryButton
                key={entry.id}
                entry={entry}
                active={selectedDesktopEntryId === entry.id}
                columnCount={1}
                onSelect={setSelectedDesktopEntryId}
                onOpen={openDesktopEntry}
                onGetInfo={openInfoForDesktopEntry}
                onMoveSelection={moveDesktopSelection}
                onContextOpen={({ x, y, entry: targetEntry }) => {
                  setDesktopMenu({
                    left: x,
                    top: y,
                    nodeId: targetEntry.nodeId,
                    label: targetEntry.label,
                    desktopEntryId: targetEntry.id,
                  });
                }}
                registerRef={(entryId, element) => {
                  entryRefs.current[entryId] = element;
                }}
              />
            ))}
          </div>

          {activeWindows.map((win) => (
            <MeOsWindowCard
              key={win.id}
              win={win}
              mode={mode}
            />
          ))}

          {desktopMenu ? (
            <div
              className={styles.desktopContextMenu}
              role="menu"
              style={{ left: desktopMenu.left, top: desktopMenu.top }}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className={styles.desktopContextAction}
                onClick={() => {
                  const entry = entries.find((candidate) => candidate.id === desktopMenu.desktopEntryId);
                  if (entry) openDesktopEntry(entry);
                }}
              >
                OPEN
              </button>
              <button
                type="button"
                className={styles.desktopContextAction}
                onClick={() => {
                  const entry = entries.find((candidate) => candidate.id === desktopMenu.desktopEntryId);
                  if (entry) openInfoForDesktopEntry(entry);
                }}
              >
                GET INFO
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};
