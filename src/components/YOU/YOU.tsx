/**
 * YOU.EXE message board client.
 * Runtime state is service-backed via `YouProvider` (no board localStorage writes).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './YOU.module.scss';
import { useYouBoard } from '../../you/YouProvider';
import { formatYouMessageTimestamp, msUntilNextLocalMidnight } from './messageTimestamp';
import { PANEL_PREVIEW_DEFAULT_COUNT, derivePanelPreviewFit, type PanelPreviewFit } from './panelPreview';
import type { YouMessage } from '../../you/types';

type YouProps = {
  mode?: 'panel' | 'fullscreen';
};

const MAX_BODY_LENGTH = 500;
const PANEL_MESSAGE_SELECTOR = '[data-you-panel-message="true"]';
const DEFAULT_PANEL_PREVIEW_FIT: PanelPreviewFit = {
  visibleCount: PANEL_PREVIEW_DEFAULT_COUNT,
  usedHeightPx: 0,
  hasSpareSpace: false,
};

const readLengthPx = (value: string): number => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const isSamePanelPreviewFit = (left: PanelPreviewFit, right: PanelPreviewFit): boolean => (
  left.visibleCount === right.visibleCount
  && left.usedHeightPx === right.usedHeightPx
  && left.hasSpareSpace === right.hasSpareSpace
);

const MessageCard: React.FC<{ message: YouMessage; nowForTimestamp: Date }> = ({
  message,
  nowForTimestamp,
}) => (
  <article className={styles.message} data-you-panel-message="true">
    <header className={styles.messageHead}>
      <span className={styles.author}>{message.isAnon ? 'ANON' : (message.displayName ?? 'ANON')}</span>
      <span className={styles.time}>{formatYouMessageTimestamp(message.createdAt, { now: nowForTimestamp })}</span>
    </header>
    <p className={styles.body}>{message.body}</p>
  </article>
);

const YOU: React.FC<YouProps> = ({ mode = 'panel' }) => {
  const {
    displayMode,
    messages,
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

  const panelFeedFrameRef = useRef<HTMLDivElement | null>(null);
  const panelMeasureFeedRef = useRef<HTMLDivElement | null>(null);
  const panelAutoBackfillKeyRef = useRef<string | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [nowForTimestamp, setNowForTimestamp] = useState<Date>(() => new Date());
  const [panelPreviewFit, setPanelPreviewFit] = useState<PanelPreviewFit>(DEFAULT_PANEL_PREVIEW_FIT);
  const isPanelMode = mode === 'panel';
  const panelVisibleCount = isPanelMode
    ? Math.min(messages.length, panelPreviewFit.visibleCount)
    : messages.length;
  const visibleMessages = isPanelMode
    ? messages.slice(0, panelVisibleCount)
    : messages;
  const hiddenCount = Math.max(0, messages.length - panelVisibleCount);
  const oldestLoadedMessageId = messages[messages.length - 1]?.id ?? null;
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

  useEffect(() => {
    const onTypeMessage = () => {
      const activeMode = displayMode === 'fullscreen' ? 'fullscreen' : 'panel';
      if (activeMode !== mode) return;
      const input = messageInputRef.current;
      if (!input) return;
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    };
    window.addEventListener('terminalos:you:type-message', onTypeMessage as EventListener);
    return () => {
      window.removeEventListener('terminalos:you:type-message', onTypeMessage as EventListener);
    };
  }, [displayMode, mode]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setNowForTimestamp(new Date());
    }, msUntilNextLocalMidnight(nowForTimestamp));

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setNowForTimestamp(new Date());
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [nowForTimestamp]);

  useEffect(() => {
    if (!isPanelMode) {
      panelAutoBackfillKeyRef.current = null;
      setPanelPreviewFit((previous) => (
        isSamePanelPreviewFit(previous, DEFAULT_PANEL_PREVIEW_FIT)
          ? previous
          : DEFAULT_PANEL_PREVIEW_FIT
      ));
      return undefined;
    }

    const feedFrameNode = panelFeedFrameRef.current;
    const measureFeedNode = panelMeasureFeedRef.current;
    if (!feedFrameNode || !measureFeedNode) return undefined;

    let rafId: number | null = null;
    const updatePreviewFit = () => {
      if (rafId != null) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        const measuredItems = Array.from(
          measureFeedNode.querySelectorAll<HTMLElement>(PANEL_MESSAGE_SELECTOR)
        );
        const computedFeedStyles = window.getComputedStyle(measureFeedNode);
        const nextFit = derivePanelPreviewFit({
          feedHeightPx: feedFrameNode.clientHeight,
          itemHeightsPx: measuredItems.map((item) => item.offsetHeight),
          gapPx: readLengthPx(computedFeedStyles.rowGap || computedFeedStyles.gap),
          paddingTopPx: readLengthPx(computedFeedStyles.paddingTop),
          paddingBottomPx: readLengthPx(computedFeedStyles.paddingBottom),
        });

        setPanelPreviewFit((previous) => (
          isSamePanelPreviewFit(previous, nextFit)
            ? previous
            : nextFit
        ));
      });
    };

    updatePreviewFit();

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updatePreviewFit())
      : null;
    resizeObserver?.observe(feedFrameNode);
    window.addEventListener('resize', updatePreviewFit);
    window.addEventListener('orientationchange', updatePreviewFit);

    return () => {
      window.removeEventListener('resize', updatePreviewFit);
      window.removeEventListener('orientationchange', updatePreviewFit);
      resizeObserver?.disconnect();
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, [isPanelMode, messages]);

  useEffect(() => {
    if (
      !isPanelMode
      || !panelPreviewFit.hasSpareSpace
      || panelVisibleCount < messages.length
      || !hasMore
    ) {
      panelAutoBackfillKeyRef.current = null;
      return;
    }

    if (loadingInitial || loadingOlder || messages.length === 0 || !oldestLoadedMessageId) return;

    const nextAutoBackfillKey = `${oldestLoadedMessageId}:${panelVisibleCount}`;
    if (panelAutoBackfillKeyRef.current === nextAutoBackfillKey) return;

    panelAutoBackfillKeyRef.current = nextAutoBackfillKey;
    void loadOlder();
  }, [
    hasMore,
    isPanelMode,
    loadOlder,
    loadingInitial,
    loadingOlder,
    messages.length,
    oldestLoadedMessageId,
    panelPreviewFit.hasSpareSpace,
    panelVisibleCount,
  ]);

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
            ref={messageInputRef}
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

        <div className={styles.feedFrame} ref={panelFeedFrameRef}>
          <div
            className={`${styles.feed} ${isPanelMode ? styles.feedPanel : styles.feedFullscreen}`.trim()}
            aria-live="polite"
            aria-atomic="false"
          >
            {loadingInitial ? <p className={styles.empty}>LOADING BOARD...</p> : null}
            {!loadingInitial && visibleMessages.length === 0 ? <p className={styles.empty}>NO MESSAGES YET.</p> : null}
            {visibleMessages.map((message) => (
              <MessageCard key={message.id} message={message} nowForTimestamp={nowForTimestamp} />
            ))}
          </div>

          {isPanelMode ? (
            <div
              ref={panelMeasureFeedRef}
              className={`${styles.feed} ${styles.measurementFeed}`.trim()}
              aria-hidden="true"
            >
              {messages.map((message) => (
                <MessageCard key={`measure-${message.id}`} message={message} nowForTimestamp={nowForTimestamp} />
              ))}
            </div>
          ) : null}
        </div>

        {isPanelMode && hiddenCount > 0 ? (
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
