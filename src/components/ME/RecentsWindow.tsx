import React, { useMemo } from 'react';
import { getItemSafe } from '../../utils/storage';
import FileBrowser from './FileBrowser';

const RECENTS_KEY = 'terminal_os_filebrowser_recents_v1';

const RecentsWindow: React.FC = () => {
  const recentIds = useMemo(() => getItemSafe<string[]>(RECENTS_KEY, []), []);
  return (
    <div>
      <div style={{ marginBottom: 6 }}>RECENTS</div>
      {recentIds.length === 0 ? (
        <p>No recent files.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
          {recentIds.map(id => (
            <li key={id} style={{ border: '1px solid rgba(0,255,102,0.12)', padding: 6 }}>
              <span>{id}</span>
            </li>
          ))}
        </ul>
      )}
      <div style={{ marginTop: 10, opacity: 0.9, fontSize: 12 }}>Use the File Browser to open recent files.</div>
    </div>
  );
};

export default RecentsWindow;


