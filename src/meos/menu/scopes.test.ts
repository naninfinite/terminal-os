import { describe, expect, it } from 'vitest';
import { MENU_SCOPE_CONFIG, resolveMenuScope } from './scopes';

describe('menu scopes', () => {
  it('includes THIRD mode and reset commands in third scope menu', () => {
    const ids = MENU_SCOPE_CONFIG.third.items.map((item) => item.id);
    expect(ids).toContain('third_toggle_mode');
    expect(ids).toContain('third_reset_scene');
  });

  it('includes Connect quick-match and CPU actions in connect scope menu', () => {
    expect(MENU_SCOPE_CONFIG.connect.items.map((item) => item.id)).toEqual([
      'focus_connect_panel',
      'connect_quick_match',
      'connect_play_cpu',
      'toggle_theme',
    ]);
  });

  it('uses finder-style ME commands in desktop and me scopes', () => {
    expect(MENU_SCOPE_CONFIG.desktop.items.map((item) => item.id)).toEqual([
      'open_meos',
      'open_home',
      'toggle_theme',
    ]);
    expect(MENU_SCOPE_CONFIG.meos.items.map((item) => item.id)).toEqual([
      'open_home',
      'open_projects',
      'open_media',
      'open_about',
      'open_contact',
      'exit_meos',
      'toggle_theme',
    ]);
  });

  it('resolves desktop/meos/scope modes deterministically', () => {
    expect(resolveMenuScope({ displayMode: 'panel' })).toBe('desktop');
    expect(resolveMenuScope({ displayMode: 'panel', activeScope: 'third' })).toBe('third');
    expect(resolveMenuScope({ displayMode: 'fullscreen', activeScope: 'third' })).toBe('meos');
  });
});
