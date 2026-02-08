/**
 * Core ME.OS VFS schema and API contracts.
 */

export type VfsNodeType = 'folder' | 'file';

export type VfsFileKind = 'text' | 'image' | 'video' | 'project';

export type VfsProjectMeta = {
  title: string;
  summary: string;
  stack: string[];
  demoUrl?: string;
  repoUrl?: string;
};

export type VfsNode = {
  id: string;
  name: string;
  type: VfsNodeType;
  parentId: string | null;
  kind?: VfsFileKind;
  textContent?: string;
  assetSrc?: string;
  posterSrc?: string;
  projectMeta?: VfsProjectMeta;
};

export type VfsSnapshot = {
  version: 1;
  rootId: string;
  nodes: Record<string, VfsNode>;
  children: Record<string, string[]>;
};

export type LegacyPhase3Node = {
  id: string;
  name: string;
  type: 'folder' | 'file';
  fileType?: 'notes' | 'about' | 'terminal' | 'text';
  children?: LegacyPhase3Node[];
};
