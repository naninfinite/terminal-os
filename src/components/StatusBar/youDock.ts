type YouDockMessage = {
  createdAt: string;
};

type YouDockInput = {
  draftBody: string;
  lastSeenAt: string | null;
  messages: ReadonlyArray<YouDockMessage>;
};

export type YouDockState = {
  hasDraft: boolean;
  latestMessageAt: string | null;
  unreadCount: number;
  label: string;
  showCombinedDot: boolean;
};

const toMs = (value: string): number | null => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const hasYouDraft = (draftBody: string): boolean => draftBody.trim().length > 0;

export const getLatestMessageAt = (messages: ReadonlyArray<YouDockMessage>): string | null => {
  let latestAt: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;

  messages.forEach((message) => {
    const ms = toMs(message.createdAt);
    if (ms == null || ms <= latestMs) return;
    latestMs = ms;
    latestAt = message.createdAt;
  });

  return latestAt;
};

export const countUnreadMessages = (
  messages: ReadonlyArray<YouDockMessage>,
  lastSeenAt: string | null
): number => {
  if (!lastSeenAt) return 0;
  const seenMs = toMs(lastSeenAt);
  if (seenMs == null) return 0;

  return messages.reduce((count, message) => {
    const createdAtMs = toMs(message.createdAt);
    if (createdAtMs == null || createdAtMs <= seenMs) return count;
    return count + 1;
  }, 0);
};

export const getYouDockLabel = (args: { hasDraft: boolean; unreadCount: number }): string => {
  const { hasDraft, unreadCount } = args;
  if (unreadCount > 0) return `YOU.EXE (${unreadCount})`;
  if (hasDraft) return 'YOU.EXE (•)';
  return 'YOU.EXE';
};

export const shouldShowCombinedDot = (args: { hasDraft: boolean; unreadCount: number }): boolean => (
  args.hasDraft && args.unreadCount > 0
);

export const deriveYouDockState = (args: YouDockInput): YouDockState => {
  const hasDraft = hasYouDraft(args.draftBody);
  const latestMessageAt = getLatestMessageAt(args.messages);
  const unreadCount = countUnreadMessages(args.messages, args.lastSeenAt);
  return {
    hasDraft,
    latestMessageAt,
    unreadCount,
    label: getYouDockLabel({ hasDraft, unreadCount }),
    showCombinedDot: shouldShowCombinedDot({ hasDraft, unreadCount }),
  };
};
