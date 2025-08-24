import React, { useMemo, useRef, useState, useEffect } from 'react';
import { getItemSafe, setItemSafe } from '../../utils/storage';

const STORAGE_KEY = 'terminal_os_notes_text_v1';

const NotesWindow: React.FC = () => {
  const initial = useMemo(() => getItemSafe<string>(STORAGE_KEY, ''), []);
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current != null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>NOTES</div>
        <button
          type="button"
          onClick={() => {
            setItemSafe(STORAGE_KEY, text);
            setSaved(true);
            if (saveTimeoutRef.current != null) window.clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = window.setTimeout(() => setSaved(false), 3000) as unknown as number;
          }}
          aria-label="Save notes"
          style={{ background: 'transparent', color: 'inherit', border: '1px solid #00ff66', padding: '2px 8px' }}
        >
          {saved ? 'SAVED' : 'SAVE'}
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(false); }}
        aria-label="Notes text"
        style={{
          width: '100%',
          minHeight: 140,
          background: 'black',
          color: '#00ff66',
          border: '1px solid #00ff66',
          fontFamily: 'inherit',
          fontSize: '12px',
          letterSpacing: '0.05em',
          padding: 6,
          resize: 'vertical',
        }}
        placeholder="Type your notes here..."
      />
    </div>
  );
};

export default NotesWindow;


