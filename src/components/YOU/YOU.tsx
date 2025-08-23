import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './YOU.module.scss';
import { getItemSafe, setItemSafe } from '../../utils/storage';

const STORAGE_KEY = 'terminal_os_you_input_v1';

const YOU: React.FC = () => {
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
    <div className={styles.root}>
      <input
        className={styles.input}
        type="text"
        value={text}
        placeholder="TYPE HERE..."
        onChange={(e) => { setText(e.target.value); setSaved(false); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setItemSafe(STORAGE_KEY, text);
            setSaved(true);
          }
        }}
        aria-label="Visitor input"
      />
      <button
        type="button"
        className={`${styles.save} ${saved ? styles.saved : ''}`}
        onClick={() => {
          setItemSafe(STORAGE_KEY, text);
          setSaved(true);
          if (saveTimeoutRef.current != null) window.clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = window.setTimeout(() => setSaved(false), 3000) as unknown as number;
        }}
        aria-label="Save input"
      >
        {saved ? 'SAVED' : 'SAVE'}
      </button>
    </div>
  );
};

export default YOU;



