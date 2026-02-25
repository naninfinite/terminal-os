import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { YouApiClient, YouApiError, mergeYouMessages } from './service';
import type { YouDisplayMode, YouMessage } from './types';

const PREVIEW_LIMIT = 5;
const PAGE_LIMIT = 30;
const POLL_INTERVAL_MS = 10_000;
const CLIENT_RATE_LIMIT_MS = 8_000;
const CLIENT_KEY_STORAGE_KEY = 'terminalOS.you.v1.clientKey';

type YouContextValue = {
  displayMode: YouDisplayMode;
  messages: YouMessage[];
  previewMessages: YouMessage[];
  draftName: string;
  draftBody: string;
  loadingInitial: boolean;
  refreshing: boolean;
  loadingOlder: boolean;
  submitting: boolean;
  hasMore: boolean;
  backendAvailable: boolean;
  error: string | null;
  rateLimitedUntil: number | null;
  setDraftName: (value: string) => void;
  setDraftBody: (value: string) => void;
  submitDraft: () => Promise<boolean>;
  clearDraft: () => void;
  refresh: () => Promise<void>;
  loadOlder: () => Promise<void>;
  openFullscreen: () => void;
  closeFullscreen: () => void;
};

const YouContext = createContext<YouContextValue | null>(null);

const createClientKey = (): string => (
  `you_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`
);

const getClientKey = (): string => {
  try {
    if (typeof sessionStorage === 'undefined') return createClientKey();
    const existing = sessionStorage.getItem(CLIENT_KEY_STORAGE_KEY);
    if (existing) return existing;
    const next = createClientKey();
    sessionStorage.setItem(CLIENT_KEY_STORAGE_KEY, next);
    return next;
  } catch {
    return createClientKey();
  }
};

const messageFromError = (error: unknown): string => {
  if (error instanceof YouApiError) {
    if (error.status === 400) return error.message || 'Message input is invalid.';
    if (error.status === 429) return error.message || 'You are posting too quickly. Please wait.';
    if (typeof error.status === 'number' && error.status >= 500) return 'Service unavailable.';
    if (error.message) return error.message;
  }
  return 'Service unavailable.';
};

const isBackendAvailableFromError = (error: unknown): boolean => (
  error instanceof YouApiError
  && typeof error.status === 'number'
  && error.status < 500
);

export const YouProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const api = useMemo(() => new YouApiClient(), []);
  const clientKeyRef = useRef<string>(getClientKey());
  const initializedRef = useRef(false);

  const [displayMode, setDisplayMode] = useState<YouDisplayMode>('panel');
  const [messages, setMessages] = useState<YouMessage[]>([]);
  const [draftName, setDraftName] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const firstLoad = !initializedRef.current;
    setRefreshing(true);
    if (firstLoad) setLoadingInitial(true);

    try {
      const latest = await api.listMessages({ limit: PAGE_LIMIT });
      setMessages((prev) => (firstLoad ? latest : mergeYouMessages(prev, latest)));
      if (firstLoad) {
        initializedRef.current = true;
        setHasMore(latest.length >= PAGE_LIMIT);
      }
      setBackendAvailable(true);
      setError(null);
    } catch (err) {
      setBackendAvailable(isBackendAvailableFromError(err));
      setError(messageFromError(err));
    } finally {
      setRefreshing(false);
      setLoadingInitial(false);
    }
  }, [api]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    const before = messages[messages.length - 1]?.createdAt;
    if (!before) {
      setLoadingOlder(false);
      return;
    }

    try {
      const older = await api.listMessages({ before, limit: PAGE_LIMIT });
      setMessages((prev) => mergeYouMessages(prev, older));
      setHasMore(older.length >= PAGE_LIMIT);
      setBackendAvailable(true);
      setError(null);
    } catch (err) {
      setBackendAvailable(isBackendAvailableFromError(err));
      setError(messageFromError(err));
    } finally {
      setLoadingOlder(false);
    }
  }, [api, hasMore, loadingOlder, messages]);

  const submitDraft = useCallback(async (): Promise<boolean> => {
    if (submitting) return false;

    const now = Date.now();
    if (rateLimitedUntil && now < rateLimitedUntil) {
      setError(`Please wait ${Math.ceil((rateLimitedUntil - now) / 1000)}s before posting again.`);
      return false;
    }

    setSubmitting(true);
    try {
      const created = await api.createMessage(
        { body: draftBody, displayName: draftName || undefined },
        { clientKey: clientKeyRef.current }
      );
      setMessages((prev) => mergeYouMessages(prev, [created]));
      setDraftBody('');
      setRateLimitedUntil(Date.now() + CLIENT_RATE_LIMIT_MS);
      setBackendAvailable(true);
      setError(null);
      return true;
    } catch (err) {
      if (err instanceof YouApiError && err.status === 429) {
        setRateLimitedUntil(Date.now() + CLIENT_RATE_LIMIT_MS);
      }
      setBackendAvailable(isBackendAvailableFromError(err));
      setError(messageFromError(err));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [api, draftBody, draftName, rateLimitedUntil, submitting]);

  const clearDraft = useCallback(() => {
    setDraftName('');
    setDraftBody('');
    setError(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void refresh();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const previewMessages = useMemo(
    () => messages.slice(0, PREVIEW_LIMIT),
    [messages]
  );

  const openFullscreen = useCallback(() => setDisplayMode('fullscreen'), []);
  const closeFullscreen = useCallback(() => setDisplayMode('panel'), []);

  const value = useMemo<YouContextValue>(() => ({
    displayMode,
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
    refresh,
    loadOlder,
    openFullscreen,
    closeFullscreen,
  }), [
    backendAvailable,
    clearDraft,
    closeFullscreen,
    displayMode,
    draftBody,
    draftName,
    error,
    hasMore,
    loadOlder,
    loadingInitial,
    loadingOlder,
    messages,
    openFullscreen,
    previewMessages,
    rateLimitedUntil,
    refresh,
    refreshing,
    submitDraft,
    submitting,
  ]);

  return <YouContext.Provider value={value}>{children}</YouContext.Provider>;
};

export const useYouBoard = (): YouContextValue => {
  const ctx = useContext(YouContext);
  if (!ctx) throw new Error('useYouBoard must be used within <YouProvider>.');
  return ctx;
};
