import type { VfsNode, VfsSnapshot } from './types';

/**
 * Canonical seed for M2 VFS.
 * This is intentionally minimal and portfolio-focused.
 */
const seedNodes: VfsNode[] = [
  { id: 'root', name: '/', type: 'folder', parentId: null },
  { id: 'home', name: 'Home', type: 'folder', parentId: 'root' },
  { id: 'projects', name: 'Projects', type: 'folder', parentId: 'root' },
  { id: 'media', name: 'Media', type: 'folder', parentId: 'root' },
  { id: 'about', name: 'About', type: 'folder', parentId: 'root' },
  { id: 'contact', name: 'Contact', type: 'folder', parentId: 'root' },
  { id: 'archive', name: 'Archive', type: 'folder', parentId: 'root' },
  {
    id: 'readme_txt',
    name: 'README.txt',
    type: 'file',
    parentId: 'home',
    kind: 'text',
    textContent: [
      'Welcome to ME.OS.',
      '',
      'This environment is the portfolio layer for Terminal-OS.',
      'Use FILEMAN.EXE to browse folders and open files.',
      '',
      'Current milestone:',
      '- FileMan list/grid navigation',
      '- Viewer windows for text, image, video, and project cards',
    ].join('\n'),
  },
  {
    id: 'about_txt',
    name: 'ABOUT.txt',
    type: 'file',
    parentId: 'about',
    kind: 'text',
    textContent: [
      'Naninfinite / Terminal-OS',
      '',
      'Creative developer exploring OS-style web interfaces,',
      'interactive systems, and visual storytelling.',
      '',
      'Open Projects and Media for deeper work samples.',
    ].join('\n'),
  },
  {
    id: 'portrait_png',
    name: 'Portrait.png',
    type: 'file',
    parentId: 'media',
    kind: 'image',
    assetSrc: '',
    textContent: 'Primary portrait asset placeholder. Swap `assetSrc` with bundled media when available.',
  },
  {
    id: 'reel_mp4',
    name: 'Reel.mp4',
    type: 'file',
    parentId: 'media',
    kind: 'video',
    assetSrc: '',
    posterSrc: '',
    textContent: 'Showreel slot. Attach a video source URL/path in `assetSrc` when media is available.',
  },
  {
    id: 'project_terminalos',
    name: 'Terminal-OS.card',
    type: 'file',
    parentId: 'projects',
    kind: 'project',
    projectMeta: {
      title: 'Terminal-OS',
      summary: 'Pseudo operating-system portfolio shell with panel/fullscreen subsystem runtime and FileMan workflows.',
      stack: ['React', 'TypeScript', 'SCSS', 'Vite'],
      repoUrl: 'https://github.com/naninfinite/terminal-os',
    },
  },
  {
    id: 'project_prozilla',
    name: 'ProzillaOS.card',
    type: 'file',
    parentId: 'projects',
    kind: 'project',
    projectMeta: {
      title: 'ProzillaOS',
      summary: 'Prior OS-interface experiment used as a reference for explorer interaction patterns and event-driven UI updates.',
      stack: ['React', 'TypeScript'],
      repoUrl: 'https://github.com/naninfinite/ProzillaOS',
    },
  },
];

export const createSeedSnapshot = (): VfsSnapshot => {
  const nodes: Record<string, VfsNode> = {};
  const children: Record<string, string[]> = {};

  for (const node of seedNodes) {
    nodes[node.id] = { ...node };
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
    version: 1,
    rootId: 'root',
    nodes,
    children,
  };
};
