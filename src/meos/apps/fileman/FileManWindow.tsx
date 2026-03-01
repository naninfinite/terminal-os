import React from 'react';
import { useContextTrigger } from '../../../components/shared/useContextTrigger';
import { useMeOs } from '../../shell/MeOsProvider';
import type { MeOsWindow } from '../../shell/types';
import { useMeOsVfs } from '../../vfs/MeOsVfsProvider';
import type { VfsNode } from '../../vfs/types';
import styles from './FileManWindow.module.scss';

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
  onSelect: (nodeId: string) => void;
  onOpen: (node: VfsNode) => void;
  onGetInfo: (node: VfsNode) => void;
  onMoveSelection: (offset: number) => void;
  onContextOpen: (args: { x: number; y: number; node: VfsNode }) => void;
  registerRef: (nodeId: string, element: HTMLButtonElement | null) => void;
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

const getFolderGlyph = (node: VfsNode): { primary: string; secondary: string } => {
  if (node.type === 'folder') return { primary: '[]', secondary: 'DIR' };
  if (node.kind === 'contact') return { primary: 'ID', secondary: 'CARD' };
  return { primary: '--', secondary: 'DOC' };
};

const FolderEntryButton: React.FC<FolderEntryButtonProps> = ({
  node,
  active,
  gridColumns,
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
      onSelect(node.id);
      onContextOpen({ x, y, node });
    },
  });
  const glyph = getFolderGlyph(node);

  return (
    <button
      ref={(element) => registerRef(node.id, element)}
      type="button"
      className={`${styles.entry} ${active ? styles.entryActive : ''}`.trim()}
      onFocus={() => onSelect(node.id)}
      onClick={() => {
        if (ignoreClickRef.current) {
          ignoreClickRef.current = false;
          return;
        }
        onSelect(node.id);
      }}
      onDoubleClick={() => onOpen(node)}
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
      <span className={styles.entryIcon} aria-hidden="true">
        <span className={styles.entryGlyph}>{glyph.primary}</span>
        <span className={styles.entryType}>{glyph.secondary}</span>
      </span>
      <span className={styles.entryLabel}>{node.name}</span>
    </button>
  );
};

const FileManWindow: React.FC<FileManWindowProps> = ({ win }) => {
  const { getNode, getPath, listChildren } = useMeOsVfs();
  const { openNode, openInfo } = useMeOs();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [menu, setMenu] = React.useState<ContextMenuState>(null);
  const [gridColumns, setGridColumns] = React.useState(1);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const entryRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  const folder = win.nodeId ? getNode(win.nodeId) : null;
  const entries = React.useMemo(
    () => (folder?.type === 'folder' ? sortEntries(listChildren(folder.id)) : []),
    [folder, listChildren]
  );
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
      <div className={styles.contents} ref={listRef}>
        {entries.map((node) => (
          <FolderEntryButton
            key={node.id}
            node={node}
            active={selectedId === node.id}
            gridColumns={gridColumns}
            onSelect={setSelectedId}
            onOpen={openTarget}
            onGetInfo={openInfoForNode}
            onMoveSelection={moveSelection}
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
