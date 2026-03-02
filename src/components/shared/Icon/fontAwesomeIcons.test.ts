import { describe, expect, it } from 'vitest';
import { FONT_AWESOME_ICONS, getFontAwesomeIcon } from './fontAwesomeIcons';

describe('fontAwesomeIcons', () => {
  it('resolves registry entries by app icon name', () => {
    expect(getFontAwesomeIcon('close')).toBe(FONT_AWESOME_ICONS.close);
    expect(getFontAwesomeIcon('contact')).toBe(FONT_AWESOME_ICONS.contact);
    expect(getFontAwesomeIcon('expand')).toBe(FONT_AWESOME_ICONS.expand);
    expect(getFontAwesomeIcon('file')).toBe(FONT_AWESOME_ICONS.file);
    expect(getFontAwesomeIcon('folder')).toBe(FONT_AWESOME_ICONS.folder);
    expect(getFontAwesomeIcon('home')).toBe(FONT_AWESOME_ICONS.home);
    expect(getFontAwesomeIcon('image')).toBe(FONT_AWESOME_ICONS.image);
    expect(getFontAwesomeIcon('media')).toBe(FONT_AWESOME_ICONS.media);
    expect(getFontAwesomeIcon('minimize')).toBe(FONT_AWESOME_ICONS.minimize);
    expect(getFontAwesomeIcon('projects')).toBe(FONT_AWESOME_ICONS.projects);
    expect(getFontAwesomeIcon('video')).toBe(FONT_AWESOME_ICONS.video);
  });

  it('keeps the current starter icon set stable', () => {
    expect(Object.keys(FONT_AWESOME_ICONS)).toEqual([
      'close',
      'contact',
      'expand',
      'file',
      'folder',
      'home',
      'image',
      'media',
      'minimize',
      'projects',
      'video',
    ]);
  });
});




















/*import { describe, expect, it } from 'vitest';
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
*/
