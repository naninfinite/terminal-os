import React, { useMemo, useState } from 'react';
import styles from './YOU.module.scss';
import { getItemSafe, setItemSafe } from '../../utils/storage';

const STORAGE_KEY = 'terminal_os_you_input_v1';

const YOU: React.FC = () => {
  const initial = useMemo(() => getItemSafe<string>(STORAGE_KEY, ''), []);
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);

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
        className={styles.save}
        onClick={() => { setItemSafe(STORAGE_KEY, text); setSaved(true); }}
        aria-label="Save input"
      >
        [ SAVE ]
      </button>
      <div className={styles.status} aria-live="polite" aria-atomic="true">{saved ? 'SAVED' : 'READY'}</div>
    </div>
  );
};

export default YOU;



