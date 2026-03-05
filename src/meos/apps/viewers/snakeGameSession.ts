import { cloneSnakeGameState, type SnakeGameState } from './snakeGame';

export type SnakeGameSessionSnapshot = {
  game: SnakeGameState;
  autoResumePending: boolean;
};

const sessions = new Map<string, SnakeGameSessionSnapshot>();
const clearedWindowIds = new Set<string>();

export const loadSnakeGameSession = (windowId: string): SnakeGameSessionSnapshot | null => {
  clearedWindowIds.delete(windowId);
  const session = sessions.get(windowId);
  if (!session) return null;
  return {
    game: cloneSnakeGameState(session.game),
    autoResumePending: session.autoResumePending,
  };
};

export const saveSnakeGameSession = (windowId: string, snapshot: SnakeGameSessionSnapshot): void => {
  if (clearedWindowIds.has(windowId)) return;
  sessions.set(windowId, {
    game: cloneSnakeGameState(snapshot.game),
    autoResumePending: snapshot.autoResumePending,
  });
};

export const clearSnakeGameSession = (windowId: string): void => {
  sessions.delete(windowId);
  clearedWindowIds.add(windowId);
};
