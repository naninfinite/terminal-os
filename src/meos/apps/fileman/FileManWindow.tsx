import React from 'react';
import { useContextTrigger } from '../../../components/shared/useContextTrigger';
import { useTheme } from '../../../theme/ThemeProvider';
import { useMeOs } from '../../shell/MeOsProvider';
import type { MeOsWindow } from '../../shell/types';
import { useMeOsVfs } from '../../vfs/MeOsVfsProvider';
import type { VfsNode } from '../../vfs/types';
import { HOME_ID, MEDIA_ID, PHOTOS_ID, PROJECTS_ID, VIDEOS_ID } from '../../vfs/seed';
import styles from './FileManWindow.module.scss';
import { Icon } from '../../../components/shared/Icon';
import type { AppIconName } from '../../../components/shared/Icon';
import type { ResolvedTheme } from '../../../theme/types';
import {
  resolveConfiguredVideoPosterSrc,
  resolveImagePreviewSrc,
  resolveVideoPosterSrc,
} from '../viewers/mediaPreview';

type FileManWindowProps = {
  win: MeOsWindow;
};

type ContextMenuState = {
  nodeId: string;
  label: string;
  left: number;
  top: number;
} | null;

type FolderEntryButtonProps = {
  node: VfsNode;
  active: boolean;
  gridColumns: number;
  dragging: boolean;
  dropTarget: boolean;
  theme: ResolvedTheme;
  onSelect: (nodeId: string) => void;
  onOpen: (node: VfsNode) => void;
  onGetInfo: (node: VfsNode) => void;
  onMoveSelection: (offset: number) => void;
  onContextOpen: (args: { x: number; y: number; node: VfsNode }) => void;
  registerRef: (nodeId: string, element: HTMLButtonElement | null) => void;
  onDragStart: (nodeId: string, event: React.DragEvent<HTMLButtonElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: React.DragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
};

const sortEntries = (entries: VfsNode[]): VfsNode[] => [...entries].sort((a, b) => {
  if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
  return a.name.localeCompare(b.name);
});

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const getGridColumnCount = (element: HTMLElement | null): number => {
  if (!element) return 1;
  const template = window.getComputedStyle(element).gridTemplateColumns;
  const count = template.split(' ').filter((segment) => segment.trim().length > 0).length;
  return count > 0 ? count : 1;
};

const getEntryIcon = (node: VfsNode): AppIconName => {
  if (node.id === HOME_ID) return 'home';
  if (node.id === MEDIA_ID) return 'media';
  if (node.id === PROJECTS_ID) return 'projects';
  if (node.id === PHOTOS_ID) return 'image';
  if (node.id === VIDEOS_ID) return 'video';
  if (node.type === 'folder') return 'folder';
  if (node.kind === 'contact') return 'contact';
  if (node.kind === 'image') return 'image';
  if (node.kind === 'video') return 'video';
  return 'file';
};

const isMediaFile = (node: VfsNode): boolean => (
  node.type === 'file' && (node.kind === 'image' || node.kind === 'video')
);

const FolderEntryVisual: React.FC<{ node: VfsNode; theme: ResolvedTheme }> = ({ node, theme }) => {
  const iconName = getEntryIcon(node);
  const [videoReady, setVideoReady] = React.useState(false);

  React.useEffect(() => {
    setVideoReady(false);
  }, [node.id]);

  if (node.type === 'file' && node.kind === 'image') {
    return (
      <span className={`${styles.entryIcon} ${styles.entryThumb}`.trim()} aria-hidden="true">
        <span className={styles.entryThumbFrame}>
          <img className={styles.entryThumbImage} src={resolveImagePreviewSrc(node, theme)} alt="" />
        </span>
      </span>
    );
  }

  if (node.type === 'file' && node.kind === 'video') {
    const source = node.assetSrc?.trim();
    const configuredPoster = resolveConfiguredVideoPosterSrc(node);
    const poster = resolveVideoPosterSrc(node, theme);
    return (
      <span className={`${styles.entryIcon} ${styles.entryThumb}`.trim()} aria-hidden="true">
        <span className={styles.entryThumbFrame}>
          {configuredPoster ? (
            <img className={styles.entryThumbImage} src={configuredPoster} alt="" />
          ) : source ? (
            <video
              className={[
                styles.entryThumbVideo,
                videoReady ? styles.entryThumbVideoReady : '',
              ].filter(Boolean).join(' ')}
              muted
              playsInline
              preload="metadata"
              onLoadedData={() => setVideoReady(true)}
              onCanPlay={() => setVideoReady(true)}
              onError={() => setVideoReady(false)}
            >
              <source src={source} type="video/mp4" />
            </video>
          ) : null}
          {!videoReady ? (
            <img className={styles.entryThumbFallback} src={poster} alt="" />
          ) : null}
        </span>
      </span>
    );
  }

  return (
    <span className={styles.entryIcon} aria-hidden="true">
      <Icon className={styles.entryIconGlyph} fixedWidth name={iconName} size="lg" />
    </span>
  );
};

const FolderEntryButton: React.FC<FolderEntryButtonProps> = ({
  node,
  active,
  gridColumns,
  dragging,
  dropTarget,
  theme,
  onSelect,
  onOpen,
  onGetInfo,
  onMoveSelection,
  onContextOpen,
  registerRef,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const ignoreClickRef = React.useRef(false);
  const contextTrigger = useContextTrigger<HTMLButtonElement>({
    suppressInteractiveTargets: false,
    onOpen: ({ x, y }) => {
      onSelect(node.id);
      onContextOpen({ x, y, node });
    },
  });

  return (
    <button
      ref={(element) => registerRef(node.id, element)}
      type="button"
      draggable
      className={[
        styles.entry,
        isMediaFile(node) ? styles.entryMediaFile : '',
        active ? styles.entryActive : '',
        dragging ? styles.entryDragging : '',
        dropTarget ? styles.entryDropTarget : '',
      ].filter(Boolean).join(' ')}
      data-drop-target={dropTarget ? 'true' : 'false'}
      onFocus={() => onSelect(node.id)}
      onClick={() => {
        if (ignoreClickRef.current) {
          ignoreClickRef.current = false;
          return;
        }
        onSelect(node.id);
      }}
      onDoubleClick={() => onOpen(node)}
      onDragStart={(event) => onDragStart(node.id, event)}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onContextMenu={contextTrigger.onContextMenu}
      onPointerDown={contextTrigger.onPointerDown}
      onPointerMove={contextTrigger.onPointerMove}
      onPointerUp={(event) => {
        contextTrigger.onPointerUp(event);
        if (event.pointerType !== 'touch') return;
        ignoreClickRef.current = true;
        onOpen(node);
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
          onOpen(node);
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
          onMoveSelection(gridColumns);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          onMoveSelection(-gridColumns);
          return;
        }
        const previousDefaultPrevented = event.defaultPrevented;
        contextTrigger.onKeyDown(event);
        if (!previousDefaultPrevented && event.defaultPrevented) {
          onGetInfo(node);
        }
      }}
    >
      <FolderEntryVisual node={node} theme={theme} />
      <span className={styles.entryLabel}>{node.name}</span>
    </button>
  );
};

const FileManWindow: React.FC<FileManWindowProps> = ({ win }) => {
  const { resolvedTheme } = useTheme();
  const { getNode, getPath, listChildren } = useMeOsVfs();
  const { openNode, openInfo, getSurfaceItemOrder, reorderSurfaceItem } = useMeOs();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [menu, setMenu] = React.useState<ContextMenuState>(null);
  const [gridColumns, setGridColumns] = React.useState(1);
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const entryRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const folder = win.nodeId ? getNode(win.nodeId) : null;
  const surfaceKey = folder?.type === 'folder' ? `folder:${folder.id}` as const : null;
  const defaultEntries = React.useMemo(
    () => (folder?.type === 'folder' ? sortEntries(listChildren(folder.id)) : []),
    [folder, listChildren]
  );
  const entries = React.useMemo(() => {
    if (!surfaceKey) return defaultEntries;
    const orderedIds = getSurfaceItemOrder(surfaceKey, defaultEntries.map((node) => node.id));
    const entriesById = new Map(defaultEntries.map((node) => [node.id, node] as const));
    return orderedIds
      .map((nodeId) => entriesById.get(nodeId))
      .filter((node): node is VfsNode => node != null);
  }, [defaultEntries, getSurfaceItemOrder, surfaceKey]);
  const path = folder?.type === 'folder' ? (getPath(folder.id) ?? '/') : '/';

  React.useEffect(() => {
    if (selectedId && entries.some((node) => node.id === selectedId)) return;
    setSelectedId(entries[0]?.id ?? null);
  }, [entries, selectedId]);

  React.useEffect(() => {
    if (!menu) return;
    const onPointerDown = () => setMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    window.addEventListener('pointerdown', onPointerDown, { once: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menu]);

  React.useEffect(() => {
    const target = listRef.current;
    if (!target) return;
    const update = () => setGridColumns(getGridColumnCount(target));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(target);
    return () => observer.disconnect();
  }, [entries.length]);

  const focusEntry = React.useCallback((nodeId: string) => {
    window.requestAnimationFrame(() => {
      entryRefs.current[nodeId]?.focus();
    });
  }, []);

  const moveSelection = React.useCallback((offset: number) => {
    if (entries.length === 0) return;
    const currentIndex = entries.findIndex((node) => node.id === selectedId);
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = clamp(startIndex + offset, 0, entries.length - 1);
    const nextNode = entries[nextIndex];
    if (!nextNode) return;
    setSelectedId(nextNode.id);
    focusEntry(nextNode.id);
  }, [entries, focusEntry, selectedId]);

  const openTarget = React.useCallback((node: VfsNode) => {
    openNode(node.id);
    setMenu(null);
  }, [openNode]);

  const openInfoForNode = React.useCallback((node: VfsNode) => {
    openInfo({ nodeId: node.id, label: node.name });
    setMenu(null);
  }, [openInfo]);

  const clearDragState = React.useCallback(() => {
    setDraggedId(null);
    setDropIndex(null);
  }, []);

  const commitDrop = React.useCallback((targetIndex: number) => {
    if (!surfaceKey || !draggedId) return;
    reorderSurfaceItem(surfaceKey, draggedId, targetIndex);
    setSelectedId(draggedId);
    focusEntry(draggedId);
    clearDragState();
  }, [clearDragState, draggedId, focusEntry, reorderSurfaceItem, surfaceKey]);

  if (!folder || folder.type !== 'folder') {
    return (
      <div className={styles.missing}>
        <p className={styles.missingTitle}>FOLDER NOT FOUND</p>
        <p className={styles.missingCopy}>This folder may have been moved or removed.</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div
        className={[
          styles.contents,
          draggedId && dropIndex === entries.length ? styles.contentsDropTarget : '',
        ].filter(Boolean).join(' ')}
        ref={listRef}
        onDragOver={(event) => {
          if (!draggedId) return;
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          setDropIndex(entries.length);
        }}
        onDragLeave={(event) => {
          if (event.target !== event.currentTarget) return;
          setDropIndex(null);
        }}
        onDrop={(event) => {
          if (!draggedId) return;
          if (event.target !== event.currentTarget) return;
          event.preventDefault();
          commitDrop(entries.length);
        }}
      >
        {entries.map((node, index) => (
          <FolderEntryButton
            key={node.id}
            node={node}
            active={selectedId === node.id}
            gridColumns={gridColumns}
            dragging={draggedId === node.id}
            dropTarget={dropIndex === index && draggedId !== node.id}
            theme={resolvedTheme}
            onSelect={setSelectedId}
            onOpen={openTarget}
            onGetInfo={openInfoForNode}
            onMoveSelection={moveSelection}
            onDragStart={(nodeId, event) => {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', nodeId);
              setSelectedId(nodeId);
              setMenu(null);
              setDraggedId(nodeId);
              setDropIndex(index);
            }}
            onDragOver={(event) => {
              if (!draggedId) return;
              event.preventDefault();
              event.stopPropagation();
              setDropIndex(index);
            }}
            onDrop={(event) => {
              if (!draggedId) return;
              event.preventDefault();
              event.stopPropagation();
              commitDrop(index);
            }}
            onDragEnd={clearDragState}
            onContextOpen={({ x, y, node: targetNode }) => {
              setMenu({
                nodeId: targetNode.id,
                label: targetNode.name,
                left: x,
                top: y,
              });
            }}
            registerRef={(nodeId, element) => {
              entryRefs.current[nodeId] = element;
            }}
          />
        ))}
        {entries.length === 0 ? (
          <div className={styles.empty}>EMPTY FOLDER</div>
        ) : null}
      </div>
      <footer className={styles.status}>
        <span>{`${entries.length} item${entries.length === 1 ? '' : 's'}`}</span>
        <span aria-hidden="true">|</span>
        <span className={styles.path}>{path}</span>
      </footer>
      {menu ? (
        <div
          className={styles.contextMenu}
          role="menu"
          style={{ left: menu.left, top: menu.top }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={styles.contextAction}
            onClick={() => {
              const node = entries.find((entry) => entry.id === menu.nodeId);
              if (node) openTarget(node);
            }}
          >
            OPEN
          </button>
          <button
            type="button"
            className={styles.contextAction}
            onClick={() => {
              const node = entries.find((entry) => entry.id === menu.nodeId);
              if (node) openInfoForNode(node);
            }}
          >
            GET INFO
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default FileManWindow;
