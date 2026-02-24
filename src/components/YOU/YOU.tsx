/**
 * YOU.EXE message board client.
 * Runtime state is service-backed via `YouProvider` (no board localStorage writes).
 */
import React, { useEffect, useMemo } from 'react';
import styles from './YOU.module.scss';
import { useYouBoard } from '../../you/YouProvider';

type YouProps = {
  mode?: 'panel' | 'fullscreen';
};

const MAX_BODY_LENGTH = 500;

const formatTimestamp = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
};

const YOU: React.FC<YouProps> = ({ mode = 'panel' }) => {
  const {
    messages,
    previewMessages,
    draftName,
    draftBody,
    loadingInitial,
    refreshing,
    loadingOlder,
    submitting,
    hasMore,
    backendAvailable,
    error,
    rateLimitedUntil,
    setDraftName,
    setDraftBody,
    submitDraft,
    clearDraft,
    loadOlder,
    openFullscreen,
    closeFullscreen,
  } = useYouBoard();

  const visibleMessages = mode === 'panel' ? previewMessages : messages;
  const hiddenCount = Math.max(0, messages.length - previewMessages.length);
  const cooldownText = useMemo(() => {
    if (!rateLimitedUntil) return null;
    const remaining = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
    return remaining > 0 ? `WAIT ${remaining}S` : null;
  }, [rateLimitedUntil]);

  useEffect(() => {
    if (mode !== 'panel') return undefined;
    const onSave = () => { void submitDraft(); };
    const onClear = () => clearDraft();
    window.addEventListener('terminalos:you:save-input', onSave as EventListener);
    window.addEventListener('terminalos:you:clear-input', onClear as EventListener);
    return () => {
      window.removeEventListener('terminalos:you:save-input', onSave as EventListener);
      window.removeEventListener('terminalos:you:clear-input', onClear as EventListener);
    };
  }, [clearDraft, mode, submitDraft]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await submitDraft();
  };

  return (
    <div className={`${styles.root} ${mode === 'fullscreen' ? styles.rootFullscreen : ''}`.trim()}>
      <div className={styles.board}>
        <div className={styles.topRow}>
          <span className={styles.stateToken}>
            {backendAvailable ? (refreshing ? 'SYNCING...' : 'ONLINE') : 'OFFLINE'}
          </span>
          {mode === 'panel' ? (
            <button type="button" className={styles.modeBtn} onClick={openFullscreen}>
              OPEN BOARD
            </button>
          ) : (
            <button type="button" className={styles.modeBtn} onClick={closeFullscreen}>
              CLOSE
            </button>
          )}
        </div>

        <form className={styles.composer} onSubmit={onSubmit}>
          <input
            className={styles.nameInput}
            type="text"
            value={draftName}
            maxLength={32}
            placeholder="NAME (OPTIONAL)"
            onChange={(event) => setDraftName(event.target.value)}
            aria-label="Display name"
          />
          <textarea
            className={styles.messageInput}
            value={draftBody}
            maxLength={MAX_BODY_LENGTH}
            placeholder="TYPE MESSAGE..."
            onChange={(event) => setDraftBody(event.target.value)}
            aria-label="Message body"
            rows={mode === 'panel' ? 2 : 3}
          />
          <div className={styles.actionRow}>
            <button type="submit" className={styles.actionBtn} disabled={submitting}>
              {submitting ? 'POSTING...' : 'POST'}
            </button>
            <button type="button" className={styles.actionBtn} onClick={clearDraft} disabled={submitting}>
              CLEAR
            </button>
            {cooldownText ? <span className={styles.cooldown}>{cooldownText}</span> : null}
          </div>
        </form>

        <div className={styles.feed} aria-live="polite" aria-atomic="false">
          {loadingInitial ? <p className={styles.empty}>LOADING BOARD...</p> : null}
          {!loadingInitial && visibleMessages.length === 0 ? <p className={styles.empty}>NO MESSAGES YET.</p> : null}
          {visibleMessages.map((message) => (
            <article key={message.id} className={styles.message}>
              <header className={styles.messageHead}>
                <span className={styles.author}>{message.isAnon ? 'ANON' : (message.displayName ?? 'ANON')}</span>
                <span className={styles.time}>{formatTimestamp(message.createdAt)}</span>
              </header>
              <p className={styles.body}>{message.body}</p>
            </article>
          ))}
        </div>

        {mode === 'panel' && hiddenCount > 0 ? (
          <p className={styles.previewHint}>{`+${hiddenCount} MORE IN FULL FEED`}</p>
        ) : null}

        {mode === 'fullscreen' && hasMore ? (
          <button type="button" className={styles.loadOlderBtn} onClick={() => void loadOlder()} disabled={loadingOlder}>
            {loadingOlder ? 'LOADING...' : 'LOAD OLDER'}
          </button>
        ) : null}

        {error ? (
          <p className={styles.errorText}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default YOU;
