import { cloneRuntimeState } from './state';
import type { ThirdRuntimeState } from './types';

export const THIRD_HISTORY_LIMIT = 80;
export const THIRD_TRANSFORM_COALESCE_MS = 450;

export type ThirdHistoryStore = {
  present: ThirdRuntimeState;
  undoStack: ThirdRuntimeState[];
  redoStack: ThirdRuntimeState[];
  coalesceKey: string | null;
  coalesceAtMs: number;
};

export type ApplyThirdHistoryMutationArgs = {
  mutate: (state: ThirdRuntimeState) => ThirdRuntimeState;
  track?: boolean;
  coalesceKey?: string;
  coalesceWindowMs?: number;
  nowMs?: number;
};

export type ReplaceThirdHistoryStateArgs = {
  next: ThirdRuntimeState;
  clearHistory?: boolean;
};

const cloneStackSnapshot = (snapshot: ThirdRuntimeState): ThirdRuntimeState => (
  cloneRuntimeState(snapshot)
);

const withBoundedStack = (stack: ThirdRuntimeState[]): ThirdRuntimeState[] => (
  stack.length <= THIRD_HISTORY_LIMIT
    ? stack
    : stack.slice(stack.length - THIRD_HISTORY_LIMIT)
);

export const createThirdHistoryStore = (initialState: ThirdRuntimeState): ThirdHistoryStore => ({
  present: cloneRuntimeState(initialState),
  undoStack: [],
  redoStack: [],
  coalesceKey: null,
  coalesceAtMs: 0,
});

export const applyThirdHistoryMutation = (
  store: ThirdHistoryStore,
  args: ApplyThirdHistoryMutationArgs
): ThirdHistoryStore => {
  const next = args.mutate(store.present);
  if (next === store.present) return store;

  const tracked = args.track !== false;
  if (!tracked) {
    return {
      ...store,
      present: next,
      coalesceKey: null,
      coalesceAtMs: 0,
    };
  }

  const coalesceKey = args.coalesceKey ?? null;
  const nowMs = args.nowMs ?? 0;
  const coalesceWindowMs = args.coalesceWindowMs ?? 0;
  const withinCoalesceWindow = (
    coalesceKey != null
    && store.coalesceKey === coalesceKey
    && nowMs - store.coalesceAtMs <= coalesceWindowMs
  );

  const undoStack = withinCoalesceWindow
    ? store.undoStack
    : withBoundedStack([
      ...store.undoStack,
      cloneStackSnapshot(store.present),
    ]);

  return {
    present: next,
    undoStack,
    redoStack: [],
    coalesceKey,
    coalesceAtMs: coalesceKey ? nowMs : 0,
  };
};

export const undoThirdHistory = (store: ThirdHistoryStore): ThirdHistoryStore => {
  if (store.undoStack.length === 0) return store;
  const previous = store.undoStack[store.undoStack.length - 1];
  const undoStack = store.undoStack.slice(0, -1);
  const redoStack = withBoundedStack([
    ...store.redoStack,
    cloneStackSnapshot(store.present),
  ]);

  return {
    present: cloneStackSnapshot(previous),
    undoStack,
    redoStack,
    coalesceKey: null,
    coalesceAtMs: 0,
  };
};

export const redoThirdHistory = (store: ThirdHistoryStore): ThirdHistoryStore => {
  if (store.redoStack.length === 0) return store;
  const next = store.redoStack[store.redoStack.length - 1];
  const redoStack = store.redoStack.slice(0, -1);
  const undoStack = withBoundedStack([
    ...store.undoStack,
    cloneStackSnapshot(store.present),
  ]);

  return {
    present: cloneStackSnapshot(next),
    undoStack,
    redoStack,
    coalesceKey: null,
    coalesceAtMs: 0,
  };
};

export const replaceThirdHistoryState = (
  store: ThirdHistoryStore,
  args: ReplaceThirdHistoryStateArgs
): ThirdHistoryStore => {
  if (args.clearHistory === true) {
    return {
      present: cloneRuntimeState(args.next),
      undoStack: [],
      redoStack: [],
      coalesceKey: null,
      coalesceAtMs: 0,
    };
  }
  return {
    ...store,
    present: cloneRuntimeState(args.next),
    coalesceKey: null,
    coalesceAtMs: 0,
  };
};
