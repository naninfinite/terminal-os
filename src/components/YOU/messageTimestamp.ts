const DAY_MS = 24 * 60 * 60 * 1000;

export type YouMessageTimestampKind = 'time' | 'yesterday' | 'date' | 'invalid';

const getValidDate = (value: string | Date | undefined): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== 'string') return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getLocalDayOrdinal = (date: Date): number => (
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS
);

export const getYouMessageTimestampKind = (
  createdAtIso: string,
  now: Date = new Date()
): YouMessageTimestampKind => {
  const createdAt = getValidDate(createdAtIso);
  const current = getValidDate(now);
  if (!createdAt || !current) return 'invalid';

  const dayDelta = getLocalDayOrdinal(current) - getLocalDayOrdinal(createdAt);
  if (dayDelta <= 0) return 'time';
  if (dayDelta === 1) return 'yesterday';
  return 'date';
};

export const formatYouMessageTimestamp = (
  createdAtIso: string,
  options?: { now?: Date; locale?: Intl.LocalesArgument }
): string => {
  const createdAt = getValidDate(createdAtIso);
  const current = options?.now instanceof Date ? options.now : new Date();
  const kind = getYouMessageTimestampKind(createdAtIso, current);
  if (!createdAt || kind === 'invalid') return '--:--';

  if (kind === 'yesterday') return 'Yesterday';

  if (kind === 'date') {
    return new Intl.DateTimeFormat(options?.locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(createdAt);
  }

  return new Intl.DateTimeFormat(options?.locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(createdAt);
};

export const msUntilNextLocalMidnight = (now: Date = new Date()): number => {
  const current = getValidDate(now);
  if (!current) return DAY_MS;

  const nextMidnight = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate() + 1,
    0,
    0,
    0,
    0
  );
  return Math.max(1, nextMidnight.getTime() - current.getTime());
};
