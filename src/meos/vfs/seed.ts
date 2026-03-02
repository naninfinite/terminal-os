import type { VfsContactMeta, VfsDocumentSection, VfsNode, VfsSnapshot } from './types';

export const ROOT_ID = 'root';
export const HOME_ID = 'home';
export const PROJECTS_ID = 'projects';
export const MEDIA_ID = 'media';
export const PHOTOS_ID = 'photos';
export const VIDEOS_ID = 'videos';
export const ARCHIVE_ID = 'archive';
export const ABOUT_DOC_ID = 'about_doc';
export const CONTACT_CARD_ID = 'contact_card';
export const README_ID = 'readme_txt';
export const PORTRAIT_ID = 'portrait_png';
export const DSC00479_ID = 'dsc00479_jpg';
export const IDG_20250710_004909_371_ID = 'idg_20250710_004909_371_jpg';
export const IMG_0285_ID = 'img_0285_jpg';
export const REEL_ID = 'reel_mp4';
export const PROJECT_TERMINAL_OS_ID = 'project_terminalos';
export const PROJECT_PROZILLA_ID = 'project_prozilla';
export const ARCHIVE_LEGACY_ID = 'archive_legacy';
export const REEL_THUMBNAIL_ID = 'reel_cover';

const ABOUT_SECTIONS: VfsDocumentSection[] = [
  {
    title: 'Practice',
    body: 'Building interface systems that feel authored, tactile, and slightly strange without losing clarity.',
  },
  {
    title: 'Systems',
    body: 'Exploring browser-based operating systems, durable UI metaphors, and playful interaction patterns that still behave predictably.',
  },
  {
    title: 'Current Focus',
    body: 'Sharpening Terminal-OS into a portfolio surface that feels closer to a real desktop than a stack of panels.',
  },
];

const CONTACT_META: VfsContactMeta = {
  email: 'add-email@example.com',
  githubUrl: 'https://github.com/your-handle',
  instagramUrl: 'https://instagram.com/your-handle',
  status: 'Available for projects and collaborations.',
  avatarPlaceholder: true,
};

const seedNodes: VfsNode[] = [
  { id: ROOT_ID, name: '/', type: 'folder', parentId: null },
  { id: HOME_ID, name: 'Home', type: 'folder', parentId: ROOT_ID },
  { id: PROJECTS_ID, name: 'Projects', type: 'folder', parentId: HOME_ID },
  { id: MEDIA_ID, name: 'Media', type: 'folder', parentId: HOME_ID },
  { id: PHOTOS_ID, name: 'Photos', type: 'folder', parentId: MEDIA_ID },
  { id: VIDEOS_ID, name: 'Videos', type: 'folder', parentId: MEDIA_ID },
  { id: ARCHIVE_ID, name: 'Archive', type: 'folder', parentId: HOME_ID },
  {
    id: ABOUT_DOC_ID,
    name: 'About',
    type: 'file',
    parentId: HOME_ID,
    kind: 'text',
    documentLayout: 'about',
    heroPlaceholder: true,
    textContent: 'Creative developer building interface systems, interactive environments, and OS-flavored web work.',
    documentSections: ABOUT_SECTIONS,
  },
  {
    id: CONTACT_CARD_ID,
    name: 'Contact',
    type: 'file',
    parentId: HOME_ID,
    kind: 'contact',
    textContent: 'Reach out through the channels below. Replace placeholders with final values when ready.',
    contactMeta: CONTACT_META,
  },
  {
    id: README_ID,
    name: 'README.txt',
    type: 'file',
    parentId: HOME_ID,
    kind: 'text',
    documentLayout: 'standard',
    textContent: [
      'Welcome to ME.EXE.',
      '',
      'This desktop is the portfolio layer for Terminal-OS.',
      'Open folders and documents directly from the desktop to browse the work.',
      '',
      'Current milestone:',
      '- Finder-style desktop entry model',
      '- Folder and document windows',
      '- Existing image, video, and project viewers preserved',
    ].join('\n'),
  },
  {
    id: PORTRAIT_ID,
    name: 'Portrait.png',
    type: 'file',
    parentId: PHOTOS_ID,
    kind: 'image',
    assetSrc: 'src/assets/images/DSC00056.JPG',
    textContent: 'Portrait reference image.',
  },
  {
    id: DSC00479_ID,
    name: 'DSC00479.jpg',
    type: 'file',
    parentId: PHOTOS_ID,
    kind: 'image',
    assetSrc: 'src/assets/images/DSC00479.jpg',
    textContent: 'Seed photo asset.',
  },
  {
    id: IDG_20250710_004909_371_ID,
    name: 'IDG_20250710_004909_371.jpg',
    type: 'file',
    parentId: PHOTOS_ID,
    kind: 'image',
    assetSrc: 'src/assets/images/IDG_20250710_004909_371.jpg',
    textContent: 'Seed photo asset.',
  },
  {
    id: IMG_0285_ID,
    name: 'IMG_0285.jpg',
    type: 'file',
    parentId: PHOTOS_ID,
    kind: 'image',
    assetSrc: 'src/assets/images/IMG_0285.jpg',
    textContent: 'Seed photo asset.',
  },
  {
    id: REEL_ID,
    name: 'Reel.mp4',
    type: 'file',
    parentId: VIDEOS_ID,
    kind: 'video',
    assetSrc: 'src/assets/videos/mp4/juno-echo_web.mp4',
    posterSrc: '',
    videoThumbnailId: REEL_THUMBNAIL_ID,
    textContent: 'Showreel slot. Attach a different `assetSrc` when a final reel is ready.',
  },
  {
    id: PROJECT_TERMINAL_OS_ID,
    name: 'Terminal-OS.card',
    type: 'file',
    parentId: PROJECTS_ID,
    kind: 'project',
    projectMeta: {
      title: 'Terminal-OS',
      summary: 'Pseudo operating-system portfolio shell with panel/fullscreen subsystem runtime and folder-document workflows.',
      stack: ['React', 'TypeScript', 'SCSS', 'Vite'],
      repoUrl: 'https://github.com/naninfinite/terminal-os',
    },
  },
  {
    id: PROJECT_PROZILLA_ID,
    name: 'ProzillaOS.card',
    type: 'file',
    parentId: PROJECTS_ID,
    kind: 'project',
    projectMeta: {
      title: 'ProzillaOS',
      summary: 'Earlier OS-interface experiment used as a reference for windowing, explorer behavior, and desktop structure.',
      stack: ['React', 'TypeScript'],
      repoUrl: 'https://github.com/naninfinite/ProzillaOS',
    },
  },
];

export const createSeedSnapshot = (): VfsSnapshot => {
  const nodes: Record<string, VfsNode> = {};
  const children: Record<string, string[]> = {};

  for (const node of seedNodes) {
    nodes[node.id] = {
      ...node,
      documentSections: node.documentSections?.map((section) => ({ ...section })),
      contactMeta: node.contactMeta ? { ...node.contactMeta } : undefined,
      projectMeta: node.projectMeta
        ? { ...node.projectMeta, stack: [...node.projectMeta.stack] }
        : undefined,
    };
    if (node.type === 'folder') {
      children[node.id] = [];
    }
  }

  for (const node of seedNodes) {
    if (!node.parentId) continue;
    children[node.parentId] ??= [];
    children[node.parentId].push(node.id);
  }

  return {
    version: 3,
    rootId: ROOT_ID,
    nodes,
    children,
  };
};
