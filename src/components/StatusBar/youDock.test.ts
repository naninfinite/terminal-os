import { describe, expect, it } from 'vitest';
import {
  countUnreadMessages,
  deriveYouDockState,
  getLatestMessageAt,
  hasYouDraft,
} from './youDock';

const messages = [
  { createdAt: '2026-02-25T12:03:00.000Z' },
  { createdAt: '2026-02-25T12:02:00.000Z' },
  { createdAt: '2026-02-25T12:01:00.000Z' },
];

describe('youDock helpers', () => {
  it('detects trimmed draft state', () => {
    expect(hasYouDraft('')).toBe(false);
    expect(hasYouDraft('   ')).toBe(false);
    expect(hasYouDraft('hello')).toBe(true);
  });

  it('returns latest timestamp from message list', () => {
    expect(getLatestMessageAt(messages)).toBe('2026-02-25T12:03:00.000Z');
    expect(getLatestMessageAt([])).toBeNull();
  });

  it('counts only messages newer than last seen timestamp', () => {
    expect(countUnreadMessages(messages, null)).toBe(0);
    expect(countUnreadMessages(messages, '2026-02-25T12:01:30.000Z')).toBe(2);
    expect(countUnreadMessages(messages, '2026-02-25T12:03:00.000Z')).toBe(0);
  });

  it('derives default label with no draft and no unread', () => {
    const state = deriveYouDockState({
      draftBody: '',
      lastSeenAt: '2026-02-25T12:03:00.000Z',
      messages,
    });
    expect(state.label).toBe('YOU.EXE');
    expect(state.showCombinedDot).toBe(false);
  });

  it('derives draft-only label', () => {
    const state = deriveYouDockState({
      draftBody: 'working note',
      lastSeenAt: '2026-02-25T12:03:00.000Z',
      messages,
    });
    expect(state.label).toBe('YOU.EXE (•)');
    expect(state.unreadCount).toBe(0);
    expect(state.showCombinedDot).toBe(false);
  });

  it('derives unread-only label', () => {
    const state = deriveYouDockState({
      draftBody: '',
      lastSeenAt: '2026-02-25T12:00:30.000Z',
      messages,
    });
    expect(state.label).toBe('YOU.EXE (3)');
    expect(state.unreadCount).toBe(3);
    expect(state.showCombinedDot).toBe(false);
  });

  it('derives combined unread + draft state with dot flag', () => {
    const state = deriveYouDockState({
      draftBody: 'still writing',
      lastSeenAt: '2026-02-25T12:00:30.000Z',
      messages,
    });
    expect(state.label).toBe('YOU.EXE (3)');
    expect(state.unreadCount).toBe(3);
    expect(state.showCombinedDot).toBe(true);
  });
});
