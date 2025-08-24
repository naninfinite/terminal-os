import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import styles from './ME.module.scss';
import { WindowManagerContext } from '../Windowing/WindowManager';
import { ITEMS_UPDATED_EVENT, loadHomeItems } from './homeModel';
import { loadWindowRect } from '../../utils/windowRectStorage';
import NotesWindow from './NotesWindow';
import TerminalWindow from './TerminalWindow';
import HomeWindow from './HomeWindow';
import FileBrowser from './FileBrowser';
import RecentsWindow from './RecentsWindow';
import AboutWindow from './AboutWindow';

const ME: React.FC = () => {
  const ctx = useContext(WindowManagerContext);
  const [items, setItems] = useState(() => loadHomeItems());
  const gridRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  useEffect(() => {
    const onUpdate = () => setItems(loadHomeItems());
    window.addEventListener(ITEMS_UPDATED_EVENT, onUpdate as EventListener);
    return () => window.removeEventListener(ITEMS_UPDATED_EVENT, onUpdate as EventListener);
  }, []);
  return (
    <div className={styles.root}>
      <img
        className={styles.img}
        src="/assets/me.png"
        alt="Profile"
        onError={(e) => {
          const el = e.currentTarget;
          if (el.dataset.fallback === '1') return;
          el.dataset.fallback = '1';
          el.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>
               <rect width='100%' height='100%' fill='black'/>
               <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#00ff66' font-family='monospace' font-size='10'>NO IMAGE</text>
             </svg>`
          );
        }}
      />
      <div className={styles.text}>
        TERMINAL-OS <br/> HOME
      </div>
      <div ref={gridRef} className={styles.grid} role="list" aria-label="Home items">
        {items.map((it, idx) => (
          <div key={it.id} className={styles.item} role="listitem">
            <button
              ref={(el) => { itemRefs.current[idx] = el; }}
              className={styles.itemButton}
              tabIndex={focusedIdx === idx ? 0 : -1}
              onClick={() => {
                if (!ctx) return;
                const windowId = `home_${it.id}`;
                const existing = ctx.windows.find(w => w.id === windowId);
                if (existing) {
                  ctx.restoreWindow(windowId);
                  ctx.focusWindow(windowId);
                  return;
                }
                const defaultRect = { x: 40 + idx * 12, y: 40 + idx * 12, width: 380, height: 260 } as const;
                const rect = loadWindowRect(windowId, defaultRect as any);
                ctx.openWindow({ id: windowId, title: it.name, rect: rect as any,
                  content: (
                    it.id === 'notes' ? <NotesWindow /> : it.id === 'terminal' ? <TerminalWindow /> : it.id === 'home' ? <HomeWindow /> : it.id === 'about' ? <AboutWindow /> : it.id === 'browser' ? <FileBrowser startPathIds={[]} /> : it.id === 'recents' ? <RecentsWindow /> : (<div><p>{it.preview ?? '—'}</p></div>)
                  )
                });
              }}
              onDoubleClick={() => {
                if (!ctx) return;
                const windowId = `home_${it.id}`;
                const defaultRect = { x: 0, y: 0, width: 800, height: 600 } as const;
                const rect = loadWindowRect(windowId, defaultRect as any);
                ctx.openWindow({ id: windowId, title: it.name, rect: rect as any, content: (it.id === 'notes' ? <NotesWindow /> : it.id === 'terminal' ? <TerminalWindow /> : it.id === 'home' ? <HomeWindow /> : it.id === 'about' ? <AboutWindow /> : it.id === 'browser' ? <FileBrowser startPathIds={[]} /> : it.id === 'recents' ? <RecentsWindow /> : (<div><p>{it.preview ?? '—'}</p></div>)) });
                ctx.toggleMaximize(`home_${it.id}`);
              }}
              onKeyDown={(e) => {
                const cols = 2;
                if (e.key === 'Enter') { (e.currentTarget as HTMLButtonElement).click(); return; }
                let next = focusedIdx;
                if (e.key === 'ArrowRight') next = Math.min(items.length - 1, focusedIdx + 1);
                else if (e.key === 'ArrowLeft') next = Math.max(0, focusedIdx - 1);
                else if (e.key === 'ArrowDown') next = Math.min(items.length - 1, focusedIdx + cols);
                else if (e.key === 'ArrowUp') next = Math.max(0, focusedIdx - cols);
                if (next !== focusedIdx) {
                  e.preventDefault();
                  setFocusedIdx(next);
                  const el = itemRefs.current[next];
                  if (el) el.focus();
                }
              }}
              onFocus={() => setFocusedIdx(idx)}
              aria-label={`Open ${it.name}`}
            >
              <div className={styles.thumb}>{it.kind === 'app' ? 'APP' : 'DOC'}</div>
              <div className={styles.meta}>
                <div className={styles.name}>{it.name}</div>
                <div className={styles.preview}>{it.preview}</div>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ME;



