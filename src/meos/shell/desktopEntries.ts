import type { VfsSnapshot } from '../vfs/types';
import {
  ABOUT_DOC_ID,
  HOME_ID,
  MEDIA_ID,
  CONTACT_CARD_ID,
} from '../vfs/seed';
import type { MeOsDesktopEntry, MeOsDesktopEntryId } from './types';

type DesktopEntryTemplate = MeOsDesktopEntry;

export const DESKTOP_ENTRY_TEMPLATES: readonly DesktopEntryTemplate[] = [
  { id: 'home', label: 'Home', nodeId: HOME_ID, iconVariant: 'folder', alias: false },
  { id: 'media', label: 'Media', nodeId: MEDIA_ID, iconVariant: 'folder', alias: true },
  { id: 'about', label: 'About', nodeId: ABOUT_DOC_ID, iconVariant: 'document', alias: true },
  { id: 'contact', label: 'Contact', nodeId: CONTACT_CARD_ID, iconVariant: 'contact', alias: true },
] as const;

export const getDesktopEntryTemplate = (entryId: MeOsDesktopEntryId): DesktopEntryTemplate | undefined => (
  DESKTOP_ENTRY_TEMPLATES.find((entry) => entry.id === entryId)
);

export const createDesktopEntries = (snapshot: Pick<VfsSnapshot, 'nodes'>): MeOsDesktopEntry[] => (
  DESKTOP_ENTRY_TEMPLATES.filter((entry) => Boolean(snapshot.nodes[entry.nodeId]))
);
