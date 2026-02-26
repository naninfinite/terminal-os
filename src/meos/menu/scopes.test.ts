import { describe, expect, it } from 'vitest';
import { MENU_SCOPE_CONFIG, resolveMenuScope } from './scopes';

describe('menu scopes', () => {
  it('includes THIRD mode and reset commands in third scope menu', () => {
    const ids = MENU_SCOPE_CONFIG.third.items.map((item) => item.id);
    expect(ids).toContain('third_toggle_mode');
    expect(ids).toContain('third_reset_scene');
  });

  it('resolves desktop/meos/scope modes deterministically', () => {
    expect(resolveMenuScope({ displayMode: 'panel' })).toBe('desktop');
    expect(resolveMenuScope({ displayMode: 'panel', activeScope: 'third' })).toBe('third');
    expect(resolveMenuScope({ displayMode: 'fullscreen', activeScope: 'third' })).toBe('meos');
  });
});
