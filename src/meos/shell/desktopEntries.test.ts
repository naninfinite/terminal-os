import { describe, expect, it } from 'vitest';
import { createSeedSnapshot } from '../vfs/seed';
import { createDesktopEntries, getDesktopEntryTemplate } from './desktopEntries';

describe('desktopEntries', () => {
  it('returns the canonical desktop order', () => {
    const entries = createDesktopEntries(createSeedSnapshot());
    expect(entries.map((entry) => entry.label)).toEqual([
      'Home',
      'Projects',
      'Media',
      'About',
      'Contact',
      'Archive',
      'README.txt',
    ]);
  });

  it('keeps aliases pointed at canonical Home documents', () => {
    const entries = createDesktopEntries(createSeedSnapshot());
    const about = entries.find((entry) => entry.id === 'about');
    const contact = entries.find((entry) => entry.id === 'contact');
    const readme = entries.find((entry) => entry.id === 'readme');

    expect(about?.alias).toBe(true);
    expect(contact?.alias).toBe(true);
    expect(readme?.alias).toBe(true);
    expect(getDesktopEntryTemplate('about')?.nodeId).toBe('about_doc');
    expect(getDesktopEntryTemplate('contact')?.nodeId).toBe('contact_card');
    expect(getDesktopEntryTemplate('readme')?.nodeId).toBe('readme_txt');
  });
});
