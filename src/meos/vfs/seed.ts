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
    body: 'Building interface systems that feel authored, tactile, and a little haunted without collapsing into novelty for its own sake.',
  },
  {
    title: 'Worldbuilding',
    body: 'Using browser-based operating systems, scene spaces, and dense interface rituals to make portfolio work feel like a place instead of a gallery.',
  },
  {
    title: 'Current Focus',
    body: 'Sharpening Terminal-OS until the shell, the archive, and the strange edges all feel like parts of one coherent world.',
  },
];

const CONTACT_META: VfsContactMeta = {
  githubUrl: 'https://github.com/naninfinite',
  status: 'GitHub is the active contact point while the rest of the signal chain is being rebuilt.',
  avatarPlaceholder: false,
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
    textContent: 'This space is built around interface fiction, tactile systems, and portfolio work that behaves more like a place than a slide deck.',
    documentSections: ABOUT_SECTIONS,
  },
  {
    id: CONTACT_CARD_ID,
    name: 'Contact',
    type: 'file',
    parentId: HOME_ID,
    kind: 'contact',
    textContent: 'The fastest route in right now is GitHub. The rest of the contact surface will return once the shell settles.',
    contactMeta: CONTACT_META,
  },
  {
    id: README_ID,
    name: 'README.txt',
    type: 'file',
    parentId: HOME_ID,
    kind: 'text',
    documentLayout: 'hub',
    textContent: [
      'Terminal OS is a world-first portfolio shell.',
      '',
      'Start here if you want the fastest route through the archive: projects for the systems, media for the atmosphere, and about for the operating logic underneath it.',
      '',
      'The OS metaphor is not decoration. It is the navigation model that turns the work into a place you move through.',
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
      summary: 'A browser-built operating-system shell for turning portfolio work into a navigable world.',
      stack: ['React', 'TypeScript', 'SCSS', 'Vite'],
      artifactLabel: 'VIEW REPOSITORY',
      artifactUrl: 'https://github.com/naninfinite/terminal-os',
      whyItMatters: 'It is the current proving ground for shell UX, authored interaction, and how far a fictional desktop can carry real work.',
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
      summary: 'An earlier OS-interface experiment that mapped out the desktop language this project is now rebuilding with more rigor.',
      stack: ['React', 'TypeScript'],
      artifactLabel: 'OPEN ARCHIVE',
      artifactUrl: 'https://github.com/naninfinite/ProzillaOS',
      whyItMatters: 'It carries the early windowing and explorer instincts that still inform the current shell, but in a rougher, more volatile form.',
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
