import { describe, expect, it } from 'vitest';
import { FONT_AWESOME_ICONS, getFontAwesomeIcon } from './fontAwesomeIcons';

describe('fontAwesomeIcons', () => {
  it('resolves registry entries by app icon name', () => {
    expect(getFontAwesomeIcon('folder')).toBe(FONT_AWESOME_ICONS.folder);
    expect(getFontAwesomeIcon('close')).toBe(FONT_AWESOME_ICONS.close);
    expect(getFontAwesomeIcon('settings')).toBe(FONT_AWESOME_ICONS.settings);
  });

  it('keeps the starter icon set stable for shared usage', () => {
    expect(Object.keys(FONT_AWESOME_ICONS)).toEqual([
      'close',
      'contact',
      'download',
      'file',
      'folder',
      'home',
      'image',
      'info',
      'mail',
      'maximize',
      'menu',
      'minimize',
      'more',
      'reset',
      'restore',
      'search',
      'settings',
      'trash',
      'upload',
      'user',
      'video',
      'warning',
    ]);
  });
});
