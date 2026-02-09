/**
 * `YOU` is a tiny "input + save" panel.
 * It persists visitor text in localStorage so refreshes keep prior input.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './YOU.module.scss';
import { getItemSafe, setItemSafe } from '../../utils/storage';

const STORAGE_KEY = 'terminal_os_you_input_v1';

const YOU: React.FC = () => {
  // Read once to avoid re-reading storage on each render.
  const initial = useMemo(() => getItemSafe<string>(STORAGE_KEY, ''), []);
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup any pending "SAVED" reset to avoid setting state after unmount.
      if (saveTimeoutRef.current != null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Persists current text and toggles a temporary "SAVED" state.
   * The timer is reset so rapid repeated saves still show a full 3s success state.
   */
  const persist = useCallback(() => {
    setItemSafe(STORAGE_KEY, text);
    setSaved(true);
    if (saveTimeoutRef.current != null) window.clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = window.setTimeout(() => setSaved(false), 3000) as unknown as number;
  }, [text]);

  useEffect(() => {
    const onSave = () => persist();
    const onClear = () => {
      setText('');
      setSaved(false);
      setItemSafe(STORAGE_KEY, '');
      inputRef.current?.focus();
    };

    window.addEventListener('terminalos:you:save-input', onSave as EventListener);
    window.addEventListener('terminalos:you:clear-input', onClear as EventListener);
    return () => {
      window.removeEventListener('terminalos:you:save-input', onSave as EventListener);
      window.removeEventListener('terminalos:you:clear-input', onClear as EventListener);
    };
  }, [persist]);

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <input
          ref={inputRef}
          className={styles.input}
          type="text"
          value={text}
          placeholder="TYPE HERE..."
          // Any new input exits "saved" state until persisted again.
          onChange={(e) => { setText(e.target.value); setSaved(false); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              persist();
            }
          }}
          aria-label="Visitor input"
        />
        <button
          type="button"
          className={`${styles.save} ${saved ? styles.saved : ''}`}
          onClick={persist}
          aria-label="Save input"
        >
          {saved ? 'SAVED' : 'SAVE'}
        </button>
      </div>
    </div>
  );
};

export default YOU;
