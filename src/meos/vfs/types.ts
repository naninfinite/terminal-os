/**
 * Core ME.OS VFS schema and API contracts.
 */

export type VfsNodeType = 'folder' | 'file';

export type VfsFileKind = 'text' | 'image' | 'video' | 'project' | 'contact' | 'game';

export type VfsDocumentLayout = 'standard' | 'about';

export type VfsDocumentSection = {
  title: string;
  body: string;
};

export type VfsProjectMeta = {
  title: string;
  summary: string;
  stack: string[];
  demoUrl?: string;
  repoUrl?: string;
};

export type VfsContactMeta = {
  email?: string;
  githubUrl?: string;
  instagramUrl?: string;
  status?: string;
  avatarPlaceholder?: boolean;
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
  videoThumbnailId?: string;
  projectMeta?: VfsProjectMeta;
  documentLayout?: VfsDocumentLayout;
  documentSections?: VfsDocumentSection[];
  heroPlaceholder?: boolean;
  contactMeta?: VfsContactMeta;
};

export type VfsSnapshot = {
  version: 3;
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
