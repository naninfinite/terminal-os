import { describe, expect, it } from 'vitest';
import {
  formatYouMessageTimestamp,
  getYouMessageTimestampKind,
  msUntilNextLocalMidnight,
} from './messageTimestamp';

describe('YOU message timestamp helpers', () => {
  it('returns fallback for invalid timestamps', () => {
    expect(getYouMessageTimestampKind('not-a-date')).toBe('invalid');
    expect(formatYouMessageTimestamp('not-a-date')).toBe('--:--');
  });

  it('formats same-day messages as local 24-hour time with seconds', () => {
    const now = new Date(2026, 1, 25, 15, 4, 5, 0);
    const createdAt = new Date(2026, 1, 25, 9, 8, 7, 0).toISOString();

    expect(getYouMessageTimestampKind(createdAt, now)).toBe('time');
    expect(formatYouMessageTimestamp(createdAt, { now, locale: 'en-GB' })).toBe('09:08:07');
  });

  it('flips posts from late last night to Yesterday at local midnight', () => {
    const justAfterMidnight = new Date(2026, 1, 25, 0, 0, 1, 0);
    const postedLateYesterday = new Date(2026, 1, 24, 23, 59, 59, 0).toISOString();

    expect(getYouMessageTimestampKind(postedLateYesterday, justAfterMidnight)).toBe('yesterday');
    expect(formatYouMessageTimestamp(postedLateYesterday, { now: justAfterMidnight })).toBe('Yesterday');
  });

  it('formats older messages as date-only labels', () => {
    const now = new Date(2026, 1, 26, 10, 0, 0, 0);
    const createdAt = new Date(2026, 1, 24, 12, 30, 0, 0).toISOString();

    expect(getYouMessageTimestampKind(createdAt, now)).toBe('date');
    expect(formatYouMessageTimestamp(createdAt, { now, locale: 'en-GB' })).toBe('24 Feb 2026');
  });

  it('keeps future-dated timestamps in the time bucket', () => {
    const now = new Date(2026, 1, 25, 12, 0, 0, 0);
    const createdAt = new Date(2026, 1, 26, 8, 15, 30, 0).toISOString();

    expect(getYouMessageTimestampKind(createdAt, now)).toBe('time');
    expect(formatYouMessageTimestamp(createdAt, { now, locale: 'en-GB' })).toBe('08:15:30');
  });

  it('returns the remaining delay until the next local midnight', () => {
    expect(msUntilNextLocalMidnight(new Date(2026, 1, 25, 23, 59, 59, 250))).toBe(750);
    expect(msUntilNextLocalMidnight(new Date(2026, 1, 25, 8, 0, 0, 0))).toBe(16 * 60 * 60 * 1000);
  });
});
