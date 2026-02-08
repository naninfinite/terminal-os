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
  { id: 'readme_txt', name: 'README.txt', type: 'file', parentId: 'home', kind: 'text' },
  { id: 'portrait_png', name: 'Portrait.png', type: 'file', parentId: 'media', kind: 'image' },
  { id: 'reel_mp4', name: 'Reel.mp4', type: 'file', parentId: 'media', kind: 'video' },
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

