import React, { useCallback, useMemo, useRef, useState, useEffect, useContext } from 'react';
import { getItemSafe, setItemSafe } from '../../utils/storage';
import { runCommand } from '../../utils/commandRegistry';
import { WindowManagerContext } from '../Windowing/WindowManager';
import { loadWindowRect } from '../../utils/windowRectStorage';
import NotesWindow from './NotesWindow';
import HomeWindow from './HomeWindow';
import AboutWindow from './AboutWindow';
import FileBrowser from './FileBrowser';
import THIRD from '../THIRD/THIRD';
import YOU from '../YOU/YOU';

type Entry = { type: 'out' | 'in'; text: string };

const HISTORY_KEY = 'terminal_os_terminal_history_v1';

const TerminalApp: React.FC = () => {
  const initial = useMemo(() => getItemSafe<Entry[]>(HISTORY_KEY, [{ type: 'out', text: 'Terminal-OS v0.1 — type "help"' }]), []);
  const [entries, setEntries] = useState<Entry[]>(initial);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);
  const wm = useContext(WindowManagerContext);

  useEffect(() => {
    setItemSafe(HISTORY_KEY, entries);
  }, [entries]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries]);

  const openApp = useCallback((id: string, opts?: { maximize?: boolean }) => {
    if (!wm) return;
    const winId = `home_${id}`;
    const existing = wm.windows.find(w => w.id === winId);
    const defaultRect = { x: 40, y: 40, width: 420, height: 280 } as const;
    if (existing) {
      wm.restoreWindow(winId);
      wm.focusWindow(winId);
      if (opts?.maximize && !existing.maximized) wm.toggleMaximize(winId);
      return;
    }
    const rect = loadWindowRect(winId, defaultRect as any);
    const content = id === 'home' ? (
      <HomeWindow />
    ) : id === 'notes' ? (
      <NotesWindow />
    ) : id === 'terminal' ? (
      <div>Terminal</div>
    ) : id === 'about' ? (
      <AboutWindow />
    ) : id === 'browser' ? (
      <FileBrowser />
    ) : id === 'dimension' ? (
      <THIRD />
    ) : id === 'connect' ? (
      <YOU />
    ) : (
      <div>Unknown app: {id}</div>
    );
    wm.openWindow({ id: winId, title: `${id.toUpperCase()}.EXE`, rect: rect as any, content });
    if (opts?.maximize) wm.toggleMaximize(winId);
  }, [wm]);

  const run = useCallback((cmd: string) => {
    const out = (text: string) => setEntries(prev => [...prev, { type: 'out', text }]);
    setEntries(prev => [...prev, { type: 'in', text: cmd }]);
    const trimmed = cmd.trim();
    if (!trimmed) return;
    if (trimmed === 'clear') { setEntries([]); return; }
    if (trimmed.startsWith('echo ')) { out(trimmed.slice(5)); return; }
    if (trimmed === 'date') { out(new Date().toString()); return; }
    runCommand(trimmed, {
      out,
      env: (import.meta as any).env?.MODE || 'development',
      api: { openApp },
    });
  }, [openApp]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: 4, fontFamily: 'inherit', fontSize: '12px', letterSpacing: '0.05em' }} aria-live="polite">
        {entries.map((e, i) => (
          <div key={i}>
            {e.type === 'in' ? 
              (<span>&gt; {e.text}</span>) : 
              (<span>{e.text}</span>)}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(ev) => { ev.preventDefault(); const v = input; setInput(''); run(v); }}
        style={{ display: 'flex', gap: 6, padding: 4 }}
        aria-label="Terminal input form"
      >
        <span aria-hidden>&gt;</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Command input"
          style={{ flex: 1, background: 'black', color: '#00ff66', border: '1px solid #00ff66', padding: '2px 6px', fontFamily: 'inherit', fontSize: '12px', letterSpacing: '0.05em' }}
          placeholder="Type a command (help)"
        />
        <button type="submit" style={{ background: 'transparent', color: 'inherit', border: '1px solid #00ff66', padding: '2px 8px' }} aria-label="Run command">RUN</button>
      </form>
    </div>
  );
};

export default TerminalApp;


