import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { WindowManagerContext } from '../Windowing/WindowManager';
import NotesWindow from './NotesWindow';
import AboutWindow from './AboutWindow';
import TerminalApp from './TerminalApp';
import { FileNode, loadFileSystem, saveFileSystem } from './homeModel';

type FsNode = FileNode;

// root FS is loaded from persisted storage via loadFileSystem()

const renderIcon = (node: FsNode) => {
  if (node.type === 'folder') return '▢';
  if (node.fileType === 'notes') return '🗒';
  if (node.fileType === 'terminal') return '▸';
  return '•';
};

import { getItemSafe, setItemSafe } from '../../utils/storage';
import styles from './FileBrowser.module.scss';
const LB_KEY = 'terminal_os_filebrowser_last_path_v1';
const RECENTS_KEY = 'terminal_os_filebrowser_recents_v1';

const FileBrowser: React.FC<{ startPathIds?: string[] }> = ({ startPathIds }) => {
  const ctx = useContext(WindowManagerContext);
  const persistedRoot = loadFileSystem();
  const [root, setRoot] = useState<FsNode>(() => persistedRoot);
  const [path, setPath] = useState<FsNode[]>(() => {
    const saved = getItemSafe<string[]>(LB_KEY, []);
    const ids = (startPathIds && startPathIds.length > 0) ? startPathIds : saved;
    if (!ids || ids.length === 0) return [root];
    const collected: FsNode[] = [root];
    let cur: FsNode | undefined = root;
    for (const id of ids) {
      const nextNode: FsNode | undefined = cur?.children?.find((c: FsNode) => c.id === id);
      if (!nextNode) break;
      collected.push(nextNode);
      cur = nextNode;
    }
    return collected;
  });
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedIdx, setFocusedIdx] = useState(0);

  const node = path[path.length - 1];

  const openFolderInNewWindow = (n: FsNode) => {
    if (!ctx || n.type !== 'folder') return;
    const winId = `folder_${n.id}`;
    const existing = ctx.windows.find(w => w.id === winId);
    if (existing) { ctx.restoreWindow(winId); ctx.focusWindow(winId); return; }
    const rect = { x: 80, y: 80, width: 420, height: 300 };
    ctx.openWindow({ id: winId, title: n.name, rect, content: <FileBrowser startPathIds={[n.id]} /> });
  };

  const openNode = (n: FsNode) => {
    if (n.type === 'folder') {
      setPath(p => [...p, n]);
      return;
    }
    if (!ctx) return;
    const winId = `file_${n.id}`;
    const existing = ctx.windows.find(w => w.id === winId);
    if (existing) {
      ctx.restoreWindow(winId); ctx.focusWindow(winId); return;
    }
    const rect = { x: 60, y: 60, width: 420, height: 300 };
    let content: React.ReactNode = <div>{n.name}</div>;
    if (n.fileType === 'notes') content = <NotesWindow />;
    else if (n.fileType === 'about') content = <AboutWindow />;
    else if (n.fileType === 'terminal') content = <TerminalApp />;
    ctx.openWindow({ id: winId, title: n.name, rect, content });
    const recents = getItemSafe<string[]>(RECENTS_KEY, []);
    const updatedRecents = [n.id, ...recents.filter(rid => rid !== n.id)].slice(0, 10);
    setItemSafe(RECENTS_KEY, updatedRecents);
  };

  const goUp = () => {
    setPath(p => (p.length > 1 ? p.slice(0, -1) : p));
  };

  const renameEntry = (idx: number) => {
    const cur = entries[idx]; if (!cur) return;
    const nextName = window.prompt('Rename', cur.name);
    if (!nextName || nextName === cur.name) return;
    if (!node.children) return;
    node.children = node.children.map((c) => c.id === cur.id ? { ...c, name: nextName } : c);
    setRoot({ ...root });
    saveFileSystem(root);
    setPath([...path]);
  };

  const deleteEntry = (idx: number) => {
    const cur = entries[idx]; if (!cur) return;
    if (!node.children) return;
    const ok = window.confirm(`Delete ${cur.name}?`);
    if (!ok) return;
    node.children = node.children.filter(c => c.id !== cur.id);
    setRoot({ ...root });
    saveFileSystem(root);
    setFocusedIdx(Math.max(0, Math.min(focusedIdx, (node.children?.length || 1) - 1)));
    setPath([...path]);
  };

  const entries = useMemo(() => node.children ?? [], [node]);
  const pathIds = useMemo(() => path.slice(1).map(n => n.id), [path]);
  useEffect(() => { setItemSafe(LB_KEY, pathIds); }, [pathIds]);

  return (
    <div className={styles.root}>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <div className={styles.controls}>
          <button type="button" onClick={goUp} aria-label="Up" className={styles.btn}>UP</button>
        </div>
        {path.map((p, i) => (
          <button key={p.id} type="button" onClick={() => setPath(path.slice(0, i + 1))} aria-current={i === path.length - 1 ? 'page' : undefined}>{p.name}</button>
        ))}
      </nav>
      <div className={styles.grid} role="listbox" aria-label="Files">
        {entries.map((e, idx) => (
          <div key={e.id} className={styles.entry} role="option" aria-selected={focusedIdx === idx}>
            <button ref={(el) => { itemRefs.current[idx] = el; }} type="button" onClick={() => openNode(e)} onContextMenu={(cmEv) => {
                cmEv.preventDefault();
                const menu = document.createElement('div');
                menu.style.position = 'fixed';
                menu.style.left = `${cmEv.clientX}px`;
                menu.style.top = `${cmEv.clientY}px`;
                menu.style.background = '#000';
                menu.style.border = '1px solid #00ff66';
                menu.style.padding = '4px';
                menu.style.zIndex = '2';
                const addItem = (label: string, onClick: () => void) => {
                  const btn = document.createElement('button');
                  btn.setAttribute('role', 'menuitem');
                  btn.tabIndex = 0;
                  btn.textContent = label;
                  btn.style.display = 'block';
                  btn.style.background = 'transparent';
                  btn.style.color = '#00ff66';
                  btn.style.border = 'none';
                  btn.style.width = '100%';
                  btn.style.textAlign = 'left';
                  btn.onclick = () => { onClick(); cleanup(); };
                  menu.appendChild(btn);
                  return btn;
                };
                menu.setAttribute('role', 'menu');
                const firstBtn = addItem('Open', () => openNode(e));
                if (e.type === 'folder') addItem('Open in new window', () => openFolderInNewWindow(e));
                addItem('Rename', () => renameEntry(idx));
                addItem('Delete', () => deleteEntry(idx));
                const cleanup = () => { try { document.body.removeChild(menu); } catch {} document.removeEventListener('click', cleanup); document.removeEventListener('keydown', onKeyDown); };
                const onKeyDown = (ev: KeyboardEvent) => {
                  if (ev.key === 'Escape') { ev.preventDefault(); cleanup(); return; }
                  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
                    ev.preventDefault();
                    const buttons = Array.from(menu.querySelectorAll('button')) as HTMLButtonElement[];
                    if (buttons.length === 0) return;
                    const active = document.activeElement as HTMLElement | null;
                    const idxBtn = buttons.indexOf(active as HTMLButtonElement);
                    let next = 0;
                    if (ev.key === 'ArrowDown') next = (idxBtn + 1) % buttons.length;
                    else next = (idxBtn - 1 + buttons.length) % buttons.length;
                    buttons[next].focus();
                  }
                };
                document.addEventListener('click', cleanup, { once: true });
                document.addEventListener('keydown', onKeyDown);
                document.body.appendChild(menu);
                // focus first menu item
                setTimeout(() => { try { firstBtn.focus(); } catch {} }, 0);
              }} onKeyDown={(ev) => {
                if (ev.key === 'Enter' && ev.shiftKey && e.type === 'folder') { ev.preventDefault(); openFolderInNewWindow(e); return; }
                if (ev.key === 'Enter') { openNode(e); return; }
                if (ev.key === 'F2') { ev.preventDefault(); renameEntry(idx); return; }
                if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); deleteEntry(idx); return; }
                let next = focusedIdx;
                if (ev.key === 'ArrowDown') next = Math.min(entries.length - 1, focusedIdx + 1);
                else if (ev.key === 'ArrowUp') next = Math.max(0, focusedIdx - 1);
                if (next !== focusedIdx) {
                  ev.preventDefault(); setFocusedIdx(next); itemRefs.current[next]?.focus();
                }
              }} onFocus={() => setFocusedIdx(idx)} aria-label={`Open ${e.name}`} style={{ background: 'transparent', color: 'inherit', border: 'none', display: 'flex', gap: 8, alignItems: 'center', width: '100%', textAlign: 'left' }}>
              <div className={styles.icon}>{renderIcon(e)}</div>
              <div>
                <div className={styles.name}>{e.name}</div>
                <div className={styles.meta}>{e.fileType ?? ''}</div>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileBrowser;


