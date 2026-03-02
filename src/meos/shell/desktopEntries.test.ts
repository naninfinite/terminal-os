import { describe, expect, it } from 'vitest';
import { createSeedSnapshot } from '../vfs/seed';
import { createDesktopEntries, getDesktopEntryTemplate } from './desktopEntries';

describe('desktopEntries', () => {
  it('returns the fixed desktop entry stack', () => {
    const entries = createDesktopEntries(createSeedSnapshot());
    expect(entries.map((entry) => entry.label)).toEqual([
      'Home',
      'Media',
      'About',
      'Contact',
    ]);
  });

  it('keeps desktop aliases pointed at canonical Home items', () => {
    const entries = createDesktopEntries(createSeedSnapshot());
    const home = entries.find((entry) => entry.id === 'home');
    const media = entries.find((entry) => entry.id === 'media');
    const about = entries.find((entry) => entry.id === 'about');
    const contact = entries.find((entry) => entry.id === 'contact');

    expect(home?.alias).toBe(false);
    expect(media?.alias).toBe(true);
    expect(about?.alias).toBe(true);
    expect(contact?.alias).toBe(true);
    expect(getDesktopEntryTemplate('home')?.nodeId).toBe('home');
    expect(getDesktopEntryTemplate('media')?.nodeId).toBe('media');
    expect(getDesktopEntryTemplate('about')?.nodeId).toBe('about_doc');
    expect(getDesktopEntryTemplate('contact')?.nodeId).toBe('contact_card');
  });
});
