import React, { useContext } from 'react';
import { WindowManagerContext } from './WindowManager';

export const Dock: React.FC = () => {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) return null;
  const { windows, restoreWindow, focusWindow } = ctx;
  const minimized = windows.filter(w => w.minimized);
  if (minimized.length === 0) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 36, display: 'flex', gap: 8, alignItems: 'center', padding: '4px 8px', borderTop: '1px solid #00ff66', background: 'rgba(0,0,0,0.8)' }}>
      {minimized.map(w => (
        <button
          key={w.id}
          type="button"
          onClick={() => { restoreWindow(w.id); focusWindow(w.id); }}
          style={{ background: 'transparent', color: '#00ff66', border: '1px solid #00ff66', padding: '2px 8px' }}
          aria-label={`Restore ${w.title}`}
        >
          [{w.title}]
        </button>
      ))}
    </div>
  );
};


