/**
 * FileMan v2 core window.
 *
 * M3 responsibilities:
 * - Directory navigation (path, back/forward/up, quick access).
 * - Core filesystem actions (new folder/file, rename, delete, reset).
 * - Keyboard interactions and contextual actions.
 * - Viewer launch flow for files.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMeOsVfs } from '../../vfs/MeOsVfsProvider';
import type { VfsNode, VfsSnapshot } from '../../vfs/types';
import { useMeOs } from '../../shell/MeOsProvider';
import styles from './FileManWindow.module.scss';

type NavState = {
  history: string[];
  index: number;
};

type ContextMenuState = {
  nodeId: string;
  x: number;
  y: number;
} | null;

type ViewMode = 'list' | 'grid';

const sortEntries = (entries: VfsNode[]): VfsNode[] => [...entries].sort((a, b) => {
  if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
  return a.name.localeCompare(b.name);
});

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

// Reads the live CSS grid template so keyboard vertical movement matches rendered columns.
const getGridColumnCount = (element: HTMLElement | null): number => {
  if (!element) return 1;
  const template = window.getComputedStyle(element).gridTemplateColumns;
  const count = template.split(' ').filter((segment) => segment.trim().length > 0).length;
  return count > 0 ? count : 1;
};

const buildPathString = (snapshot: VfsSnapshot, folderId: string): string => {
  const names: string[] = [];
  let cursor: string | null = folderId;
  while (cursor) {
    const node: VfsNode | undefined = snapshot.nodes[cursor];
    if (!node) break;
    if (node.parentId != null) names.push(node.name);
    cursor = node.parentId;
  }
  return names.length === 0 ? '/' : `/${names.reverse().join('/')}`;
};

const resolveFolderPath = (snapshot: VfsSnapshot, currentFolderId: string, rawPath: string): string | null => {
  const input = rawPath.trim();
  if (!input) return currentFolderId;

  let cursor = input.startsWith('/') ? snapshot.rootId : currentFolderId;
  const segments = input.split('/');

  for (const segmentRaw of segments) {
    const segment = segmentRaw.trim();
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      const parent = snapshot.nodes[cursor]?.parentId;
      if (parent) cursor = parent;
      continue;
    }

    const children = snapshot.children[cursor] ?? [];
    const match = children
      .map((id) => snapshot.nodes[id])
      .find((node) => node?.type === 'folder' && node.name === segment);
    if (!match) return null;
    cursor = match.id;
  }
  return cursor;
};

const getQuickAccess = (snapshot: VfsSnapshot): VfsNode[] => (
  (snapshot.children[snapshot.rootId] ?? [])
    .map((id) => snapshot.nodes[id])
    .filter((n): n is VfsNode => Boolean(n) && n.type === 'folder')
);

const isEnter = (event: React.KeyboardEvent): boolean => event.key === 'Enter';

const getNodeIcon = (node: VfsNode): string => {
  if (node.type === 'folder') return 'FOLDER';
  if (node.kind === 'image') return 'IMG';
  if (node.kind === 'video') return 'VID';
  if (node.kind === 'project') return 'PRJ';
  return 'TXT';
};

const FileManWindow: React.FC = () => {
  const { snapshot, listChildren, createFolder, createFile, rename, deleteNode, reset } = useMeOsVfs();
  const { openViewer } = useMeOs();

  const [nav, setNav] = useState<NavState>(() => ({ history: [snapshot.rootId], index: 0 }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [pathInput, setPathInput] = useState('/');
  const [menu, setMenu] = useState<ContextMenuState>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [gridColumns, setGridColumns] = useState(1);
  const listRef = useRef<HTMLDivElement | null>(null);

  const currentFolderId = nav.history[nav.index] ?? snapshot.rootId;
  const currentFolder = snapshot.nodes[currentFolderId];

  const entries = useMemo(
    () => sortEntries(listChildren(currentFolderId)),
    [currentFolderId, listChildren]
  );

  const quickAccess = useMemo(() => getQuickAccess(snapshot), [snapshot]);
  const pathString = useMemo(() => buildPathString(snapshot, currentFolderId), [currentFolderId, snapshot]);

  useEffect(() => {
    setPathInput(pathString);
  }, [pathString]);

  useEffect(() => {
    if (!currentFolder || currentFolder.type !== 'folder') {
      setNav({ history: [snapshot.rootId], index: 0 });
      setSelectedId(null);
    }
  }, [currentFolder, snapshot.rootId]);

  useEffect(() => {
    if (selectedId && entries.some((e) => e.id === selectedId)) return;
    setSelectedId(entries[0]?.id ?? null);
  }, [entries, selectedId]);

  useEffect(() => {
    if (!menu) return;
    const onClick = () => setMenu(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    window.addEventListener('click', onClick, { once: true });
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  useEffect(() => {
    if (viewMode !== 'grid') {
      setGridColumns(1);
      return;
    }

    const target = listRef.current;
    if (!target) return;

    const updateColumns = () => setGridColumns(getGridColumnCount(target));
    updateColumns();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateColumns);
    observer.observe(target);
    return () => observer.disconnect();
  }, [viewMode, entries.length]);

  const navigateTo = (folderId: string) => {
    setNav((prev) => {
      const current = prev.history[prev.index];
      if (current === folderId) return prev;
      const base = prev.history.slice(0, prev.index + 1);
      return { history: [...base, folderId], index: base.length };
    });
    setEditingId(null);
    setSelectedId(null);
  };

  const goBack = () => setNav((prev) => (
    prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev
  ));
  const goForward = () => setNav((prev) => (
    prev.index < prev.history.length - 1 ? { ...prev, index: prev.index + 1 } : prev
  ));
  const goUp = () => {
    if (!currentFolder || currentFolder.parentId == null) return;
    navigateTo(currentFolder.parentId);
  };

  const startRename = (nodeId: string) => {
    const node = snapshot.nodes[nodeId];
    if (!node) return;
    setEditingId(nodeId);
    setEditingValue(node.name);
  };

  const commitRename = () => {
    if (!editingId) return;
    rename(editingId, editingValue);
    setEditingId(null);
    setEditingValue('');
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const handleDelete = (nodeId: string) => {
    const node = snapshot.nodes[nodeId];
    if (!node) return;
    const ok = window.confirm(`Delete ${node.name}?`);
    if (!ok) return;
    deleteNode(nodeId);
    setSelectedId(null);
    setMenu(null);
  };

  const openNode = (node: VfsNode) => {
    if (node.type === 'folder') {
      navigateTo(node.id);
      return;
    }
    openViewer({
      nodeId: node.id,
      title: node.name,
      kind: node.kind ?? 'text',
    });
  };

  const selectedIndex = entries.findIndex((e) => e.id === selectedId);

  // Centralized selection movement keeps list and grid keyboard behavior consistent.
  const moveSelection = (offset: number) => {
    if (entries.length === 0) return;
    const startIndex = selectedIndex >= 0 ? selectedIndex : 0;
    const nextIndex = clamp(startIndex + offset, 0, entries.length - 1);
    const target = entries[nextIndex];
    if (target) setSelectedId(target.id);
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (editingId) return;

    if (viewMode === 'grid') {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveSelection(1);
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveSelection(-1);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveSelection(gridColumns);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveSelection(-gridColumns);
        return;
      }
    } else {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveSelection(1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveSelection(-1);
        return;
      }
    }

    if (event.key === 'F2' && selectedId) {
      event.preventDefault();
      startRename(selectedId);
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
      event.preventDefault();
      handleDelete(selectedId);
      return;
    }
    if (event.key === 'Enter' && selectedId) {
      event.preventDefault();
      const target = entries.find((e) => e.id === selectedId);
      if (target) openNode(target);
    }
  };

  const onPathSubmit = () => {
    const resolved = resolveFolderPath(snapshot, currentFolderId, pathInput);
    if (!resolved) {
      setPathInput(pathString);
      return;
    }
    navigateTo(resolved);
  };

  const createDefaultFolder = () => {
    const folder = createFolder(currentFolderId, 'New Folder');
    if (!folder) return;
    setSelectedId(folder.id);
    startRename(folder.id);
  };

  const createDefaultFile = () => {
    const file = createFile(currentFolderId, 'New File.txt', 'text');
    if (!file) return;
    setSelectedId(file.id);
    startRename(file.id);
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.btn} onClick={goBack} disabled={nav.index <= 0}>BACK</button>
        <button type="button" className={styles.btn} onClick={goForward} disabled={nav.index >= nav.history.length - 1}>FWD</button>
        <button type="button" className={styles.btn} onClick={goUp} disabled={!currentFolder || currentFolder.parentId == null}>UP</button>
        <input
          className={styles.path}
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={(e) => { if (isEnter(e)) onPathSubmit(); }}
          aria-label="Path"
        />
        <button type="button" className={styles.btn} onClick={createDefaultFolder}>NEW FOLDER</button>
        <button type="button" className={styles.btn} onClick={createDefaultFile}>NEW FILE</button>
        <button
          type="button"
          className={`${styles.btn} ${viewMode === 'list' ? styles.btnActive : ''}`.trim()}
          onClick={() => setViewMode('list')}
        >
          LIST
        </button>
        <button
          type="button"
          className={`${styles.btn} ${viewMode === 'grid' ? styles.btnActive : ''}`.trim()}
          onClick={() => setViewMode('grid')}
        >
          GRID
        </button>
        <button type="button" className={styles.btn} onClick={reset}>RESET</button>
      </div>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <button type="button" className={styles.navBtn} onClick={() => navigateTo(snapshot.rootId)}>ROOT</button>
          {quickAccess.map((node) => (
            <button key={node.id} type="button" className={styles.navBtn} onClick={() => navigateTo(node.id)}>
              {node.name}
            </button>
          ))}
        </aside>

        <section className={styles.main}>
          <div className={styles.pathReadout}>{pathString}</div>
          <div
            className={`${styles.list} ${viewMode === 'grid' ? styles.listGrid : styles.listList}`.trim()}
            tabIndex={0}
            role="listbox"
            aria-label="Directory listing"
            onKeyDown={handleListKeyDown}
            ref={listRef}
          >
            {entries.map((node) => {
              const active = selectedId === node.id;
              const editing = editingId === node.id;
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`${styles.row} ${viewMode === 'grid' ? styles.rowGrid : styles.rowList} ${active ? styles.rowActive : ''}`.trim()}
                  onClick={() => setSelectedId(node.id)}
                  onDoubleClick={() => openNode(node)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setSelectedId(node.id);
                    setMenu({ nodeId: node.id, x: event.clientX, y: event.clientY });
                  }}
                >
                  <span className={styles.icon}>
                    <span className={styles.iconGlyph}>{getNodeIcon(node)}</span>
                    <span className={styles.iconType}>{node.type === 'folder' ? 'DIR' : 'FILE'}</span>
                  </span>
                  {editing ? (
                    <input
                      className={styles.renameInput}
                      value={editingValue}
                      autoFocus
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        if (e.key === 'Escape') cancelRename();
                      }}
                    />
                  ) : (
                    <span className={styles.name}>{node.name}</span>
                  )}
                  <span className={styles.kind}>{node.type === 'file' ? (node.kind ?? 'text') : ''}</span>
                </button>
              );
            })}
            {entries.length === 0 ? <div className={styles.empty}>EMPTY DIRECTORY</div> : null}
          </div>
        </section>
      </div>

      {menu ? (
        <div className={styles.contextMenu} style={{ left: `${menu.x}px`, top: `${menu.y}px` }} role="menu">
          <button type="button" onClick={() => {
            const node = snapshot.nodes[menu.nodeId];
            if (node) openNode(node);
            setMenu(null);
          }}>
            OPEN
          </button>
          <button type="button" onClick={() => {
            startRename(menu.nodeId);
            setMenu(null);
          }}>
            RENAME
          </button>
          <button type="button" onClick={() => handleDelete(menu.nodeId)}>
            DELETE
          </button>
          <button type="button" onClick={() => {
            const node = snapshot.nodes[menu.nodeId];
            if (node) {
              window.alert(`Name: ${node.name}\nType: ${node.type}${node.kind ? `\nKind: ${node.kind}` : ''}`);
            }
            setMenu(null);
          }}>
            PROPERTIES
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default FileManWindow;
