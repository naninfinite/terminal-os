/**
 * ME.OS VFS service.
 *
 * Responsibilities:
 * - Versioned persistence.
 * - Deterministic seed/reset behavior.
 * - Safe migration from legacy snapshots.
 * - Small imperative wrapper around storage + immutable snapshot updates.
 */
import {
  ABOUT_DOC_ID,
  ARCHIVE_ID,
  ARCHIVE_LEGACY_ID,
  CONTACT_CARD_ID,
  HOME_ID,
  README_ID,
  ROOT_ID,
  createSeedSnapshot,
} from './seed';
import type {
  LegacyPhase3Node,
  VfsContactMeta,
  VfsDocumentLayout,
  VfsDocumentSection,
  VfsFileKind,
  VfsNode,
  VfsProjectMeta,
  VfsSnapshot,
} from './types';

export const VFS_STORAGE_KEY = 'terminalOS.meos.v1.vfs';
export const VFS_VERSION = 2 as const;
export const LEGACY_PHASE3_KEY = 'terminal_os_fs_v1';

type Listeners = Set<() => void>;
export type VfsStorageAdapter = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type SnapshotShape = {
  version: number;
  rootId: string;
  nodes: Record<string, VfsNode>;
  children: Record<string, string[]>;
};

const uid = (): string => (
  `n_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36).slice(-5)}`
);

const isValidKind = (kind: unknown): kind is VfsFileKind => (
  kind === 'text' || kind === 'image' || kind === 'video' || kind === 'project' || kind === 'contact'
);

const isDocumentLayout = (value: unknown): value is VfsDocumentLayout => (
  value === 'standard' || value === 'about'
);

const sanitizeDocumentSections = (raw: unknown): VfsDocumentSection[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const sections = raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const data = entry as Record<string, unknown>;
      const title = typeof data.title === 'string' ? data.title.trim() : '';
      const body = typeof data.body === 'string' ? data.body.trim() : '';
      if (!title || !body) return null;
      return { title, body };
    })
    .filter((entry): entry is VfsDocumentSection => entry != null);
  return sections.length > 0 ? sections : undefined;
};

const sanitizeContactMeta = (raw: unknown): VfsContactMeta | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const email = typeof data.email === 'string' && data.email.trim() ? data.email.trim() : undefined;
  const githubUrl = typeof data.githubUrl === 'string' && data.githubUrl.trim() ? data.githubUrl.trim() : undefined;
  const instagramUrl = typeof data.instagramUrl === 'string' && data.instagramUrl.trim() ? data.instagramUrl.trim() : undefined;
  const status = typeof data.status === 'string' && data.status.trim() ? data.status.trim() : undefined;
  const avatarPlaceholder = typeof data.avatarPlaceholder === 'boolean' ? data.avatarPlaceholder : undefined;
  if (!email && !githubUrl && !instagramUrl && !status && avatarPlaceholder == null) return undefined;
  return {
    email,
    githubUrl,
    instagramUrl,
    status,
    avatarPlaceholder,
  };
};

const sanitizeProjectMeta = (raw: unknown): VfsProjectMeta | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
  const stackRaw = Array.isArray(data.stack) ? data.stack : [];
  const stack = stackRaw
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (!title || !summary || stack.length === 0) return undefined;
  const demoUrl = typeof data.demoUrl === 'string' && data.demoUrl.trim() ? data.demoUrl.trim() : undefined;
  const repoUrl = typeof data.repoUrl === 'string' && data.repoUrl.trim() ? data.repoUrl.trim() : undefined;
  return { title, summary, stack, demoUrl, repoUrl };
};

const sanitizeNode = (raw: unknown): VfsNode | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const id = typeof data.id === 'string' ? data.id : '';
  const name = typeof data.name === 'string' ? data.name : '';
  const type = data.type;
  const parentId = typeof data.parentId === 'string' ? data.parentId : null;
  if (!id || !name || (type !== 'folder' && type !== 'file')) return null;
  return {
    id,
    name,
    type,
    parentId,
    kind: isValidKind(data.kind) ? data.kind : undefined,
    textContent: typeof data.textContent === 'string' ? data.textContent : undefined,
    assetSrc: typeof data.assetSrc === 'string' ? data.assetSrc : undefined,
    posterSrc: typeof data.posterSrc === 'string' ? data.posterSrc : undefined,
    projectMeta: sanitizeProjectMeta(data.projectMeta),
    documentLayout: isDocumentLayout(data.documentLayout) ? data.documentLayout : undefined,
    documentSections: sanitizeDocumentSections(data.documentSections),
    heroPlaceholder: typeof data.heroPlaceholder === 'boolean' ? data.heroPlaceholder : undefined,
    contactMeta: sanitizeContactMeta(data.contactMeta),
  };
};

const cloneNode = (node: VfsNode): VfsNode => ({
  ...node,
  projectMeta: node.projectMeta
    ? { ...node.projectMeta, stack: [...node.projectMeta.stack] }
    : undefined,
  documentSections: node.documentSections?.map((section) => ({ ...section })),
  contactMeta: node.contactMeta ? { ...node.contactMeta } : undefined,
});

const cloneSnapshot = (snapshot: VfsSnapshot): VfsSnapshot => ({
  version: snapshot.version,
  rootId: snapshot.rootId,
  nodes: Object.fromEntries(Object.entries(snapshot.nodes).map(([k, v]) => [k, cloneNode(v)])),
  children: Object.fromEntries(Object.entries(snapshot.children).map(([k, v]) => [k, [...v]])),
});

const sanitizeSnapshotShape = (raw: unknown): SnapshotShape | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const version = typeof data.version === 'number' ? data.version : NaN;
  const rootId = typeof data.rootId === 'string' ? data.rootId : '';
  if (!Number.isFinite(version) || !rootId) return null;
  const rawNodes = data.nodes as Record<string, unknown> | undefined;
  if (!rawNodes || typeof rawNodes !== 'object') return null;

  const nodes: Record<string, VfsNode> = {};
  for (const [id, node] of Object.entries(rawNodes)) {
    const safeNode = sanitizeNode(node);
    if (!safeNode || safeNode.id !== id) continue;
    nodes[id] = safeNode;
  }
  if (!nodes[rootId]) return null;

  const children: Record<string, string[]> = {};
  for (const id of Object.keys(nodes)) {
    if (nodes[id]?.type === 'folder') children[id] = [];
  }

  const rawChildren = data.children as Record<string, unknown> | undefined;
  if (rawChildren && typeof rawChildren === 'object') {
    for (const [parentId, arr] of Object.entries(rawChildren)) {
      if (!nodes[parentId] || nodes[parentId].type !== 'folder' || !Array.isArray(arr)) continue;
      children[parentId] = arr.filter((value): value is string => typeof value === 'string' && Boolean(nodes[value]));
    }
  }

  return {
    version,
    rootId,
    nodes,
    children,
  };
};

const remapLegacyKind = (legacy?: LegacyPhase3Node['fileType']): VfsFileKind => {
  if (legacy === 'text' || legacy === 'about' || legacy === 'notes' || legacy === 'terminal') return 'text';
  return 'text';
};

const normalizeName = (name: string): string => name.trim().replace(/\s+/g, ' ').slice(0, 80) || 'Untitled';

const readJson = <T>(storage: VfsStorageAdapter, key: string): T | null => {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    try { storage.removeItem(key); } catch {}
    return null;
  }
};

const writeJson = <T>(storage: VfsStorageAdapter, key: string, value: T): void => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or serialization failures in UI runtime.
  }
};

const createBrowserStorage = (): VfsStorageAdapter => ({
  getItem: (key) => {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, value);
    } catch {}
  },
  removeItem: (key) => {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(key);
    } catch {}
  },
});

const ensureChild = (children: Record<string, string[]>, parentId: string, childId: string): void => {
  children[parentId] ??= [];
  if (!children[parentId].includes(childId)) children[parentId].push(childId);
};

const removeChild = (children: Record<string, string[]>, parentId: string, childId: string): void => {
  children[parentId] = (children[parentId] ?? []).filter((id) => id !== childId);
};

const ensureFolder = (snapshot: VfsSnapshot, args: { id: string; name: string; parentId: string | null }): void => {
  const existing = snapshot.nodes[args.id];
  if (existing && existing.type === 'folder') {
    existing.name = args.name;
    existing.parentId = args.parentId;
  } else {
    snapshot.nodes[args.id] = {
      id: args.id,
      name: args.name,
      type: 'folder',
      parentId: args.parentId,
    };
  }
  snapshot.children[args.id] ??= [];
  if (args.parentId != null) ensureChild(snapshot.children, args.parentId, args.id);
};

const findNodeByName = (snapshot: VfsSnapshot, parentId: string, name: string): VfsNode | undefined => (
  (snapshot.children[parentId] ?? [])
    .map((id) => snapshot.nodes[id])
    .find((node) => node?.name === name)
);

const moveNode = (snapshot: VfsSnapshot, nodeId: string, nextParentId: string): void => {
  const node = snapshot.nodes[nodeId];
  if (!node) return;
  if (node.parentId != null) removeChild(snapshot.children, node.parentId, nodeId);
  node.parentId = nextParentId;
  ensureChild(snapshot.children, nextParentId, nodeId);
};

const ensureFile = (snapshot: VfsSnapshot, node: VfsNode): void => {
  snapshot.nodes[node.id] = cloneNode(node);
  ensureChild(snapshot.children, node.parentId as string, node.id);
};

const findFirstTextFile = (snapshot: VfsSnapshot, folderId: string): VfsNode | undefined => (
  (snapshot.children[folderId] ?? [])
    .map((id) => snapshot.nodes[id])
    .find((node) => node?.type === 'file' && node.kind === 'text')
);

export const buildVfsNodePath = (snapshot: Pick<VfsSnapshot, 'nodes'>, nodeId: string): string => {
  const names: string[] = [];
  let cursor: string | null = nodeId;
  while (cursor) {
    const node: VfsNode | undefined = snapshot.nodes[cursor];
    if (!node) break;
    if (node.parentId != null) names.push(node.name);
    cursor = node.parentId;
  }
  return names.length === 0 ? '/' : `/${names.reverse().join('/')}`;
};

const createLegacyFolderIfNeeded = (snapshot: VfsSnapshot): void => {
  ensureFolder(snapshot, {
    id: ARCHIVE_ID,
    name: 'Archive',
    parentId: ROOT_ID,
  });
  ensureFolder(snapshot, {
    id: ARCHIVE_LEGACY_ID,
    name: 'Legacy',
    parentId: ARCHIVE_ID,
  });
};

const ensureCanonicalHomeDocs = (snapshot: VfsSnapshot): void => {
  const seed = createSeedSnapshot();
  const legacyAboutFolder = snapshot.nodes.about?.type === 'folder' ? snapshot.nodes.about : undefined;
  const legacyContactFolder = snapshot.nodes.contact?.type === 'folder' ? snapshot.nodes.contact : undefined;
  const legacyAboutText = legacyAboutFolder ? findFirstTextFile(snapshot, legacyAboutFolder.id) : undefined;

  ensureFolder(snapshot, { id: ROOT_ID, name: '/', parentId: null });
  ensureFolder(snapshot, { id: HOME_ID, name: 'Home', parentId: ROOT_ID });
  ensureFolder(snapshot, { id: 'projects', name: 'Projects', parentId: ROOT_ID });
  ensureFolder(snapshot, { id: 'media', name: 'Media', parentId: ROOT_ID });
  ensureFolder(snapshot, { id: ARCHIVE_ID, name: 'Archive', parentId: ROOT_ID });

  const seedAbout = seed.nodes[ABOUT_DOC_ID];
  const seedContact = seed.nodes[CONTACT_CARD_ID];
  const seedReadme = seed.nodes[README_ID];

  const existingReadme = snapshot.nodes[README_ID] ?? findNodeByName(snapshot, HOME_ID, 'README.txt');
  if (existingReadme && existingReadme.type === 'file') {
    existingReadme.name = 'README.txt';
    existingReadme.parentId = HOME_ID;
    existingReadme.kind = 'text';
    existingReadme.documentLayout = 'standard';
    existingReadme.textContent = existingReadme.textContent || seedReadme.textContent;
    if (existingReadme.id !== README_ID && !snapshot.nodes[README_ID]) {
      snapshot.nodes[README_ID] = { ...existingReadme, id: README_ID };
      delete snapshot.nodes[existingReadme.id];
      removeChild(snapshot.children, HOME_ID, existingReadme.id);
      ensureChild(snapshot.children, HOME_ID, README_ID);
    } else {
      ensureChild(snapshot.children, HOME_ID, existingReadme.id);
    }
  } else {
    ensureFile(snapshot, seedReadme);
  }

  const existingAbout = snapshot.nodes[ABOUT_DOC_ID] ?? findNodeByName(snapshot, HOME_ID, 'About');
  if (existingAbout && existingAbout.type === 'file') {
    existingAbout.name = 'About';
    existingAbout.parentId = HOME_ID;
    existingAbout.kind = 'text';
    existingAbout.documentLayout = 'about';
    existingAbout.heroPlaceholder = true;
    existingAbout.textContent = existingAbout.textContent || legacyAboutText?.textContent || seedAbout.textContent;
    existingAbout.documentSections = existingAbout.documentSections?.length
      ? existingAbout.documentSections
      : seedAbout.documentSections;
    if (existingAbout.id !== ABOUT_DOC_ID && !snapshot.nodes[ABOUT_DOC_ID]) {
      snapshot.nodes[ABOUT_DOC_ID] = { ...existingAbout, id: ABOUT_DOC_ID };
      delete snapshot.nodes[existingAbout.id];
      removeChild(snapshot.children, HOME_ID, existingAbout.id);
      ensureChild(snapshot.children, HOME_ID, ABOUT_DOC_ID);
    } else {
      ensureChild(snapshot.children, HOME_ID, existingAbout.id);
    }
  } else {
    ensureFile(snapshot, {
      ...seedAbout,
      textContent: legacyAboutText?.textContent || seedAbout.textContent,
    });
  }

  const existingContact = snapshot.nodes[CONTACT_CARD_ID] ?? findNodeByName(snapshot, HOME_ID, 'Contact');
  if (existingContact && existingContact.type === 'file') {
    existingContact.name = 'Contact';
    existingContact.parentId = HOME_ID;
    existingContact.kind = 'contact';
    existingContact.contactMeta = {
      ...seedContact.contactMeta,
      ...existingContact.contactMeta,
    };
    existingContact.textContent = existingContact.textContent || seedContact.textContent;
    if (existingContact.id !== CONTACT_CARD_ID && !snapshot.nodes[CONTACT_CARD_ID]) {
      snapshot.nodes[CONTACT_CARD_ID] = { ...existingContact, id: CONTACT_CARD_ID };
      delete snapshot.nodes[existingContact.id];
      removeChild(snapshot.children, HOME_ID, existingContact.id);
      ensureChild(snapshot.children, HOME_ID, CONTACT_CARD_ID);
    } else {
      ensureChild(snapshot.children, HOME_ID, existingContact.id);
    }
  } else {
    ensureFile(snapshot, seedContact);
  }

  if (legacyAboutFolder) {
    createLegacyFolderIfNeeded(snapshot);
    moveNode(snapshot, legacyAboutFolder.id, ARCHIVE_LEGACY_ID);
  }
  if (legacyContactFolder) {
    createLegacyFolderIfNeeded(snapshot);
    moveNode(snapshot, legacyContactFolder.id, ARCHIVE_LEGACY_ID);
  }
};

export const migrateSnapshotV1ToV2 = (shape: SnapshotShape): VfsSnapshot => {
  const base: VfsSnapshot = {
    version: VFS_VERSION,
    rootId: shape.rootId || ROOT_ID,
    nodes: Object.fromEntries(Object.entries(shape.nodes).map(([id, node]) => [id, cloneNode(node)])),
    children: Object.fromEntries(Object.entries(shape.children).map(([id, childIds]) => [id, [...childIds]])),
  };
  ensureCanonicalHomeDocs(base);
  return base;
};

const normalizeSnapshot = (shape: SnapshotShape): VfsSnapshot | null => {
  if (shape.version === VFS_VERSION) {
    const snapshot: VfsSnapshot = {
      version: VFS_VERSION,
      rootId: shape.rootId,
      nodes: Object.fromEntries(Object.entries(shape.nodes).map(([id, node]) => [id, cloneNode(node)])),
      children: Object.fromEntries(Object.entries(shape.children).map(([id, childIds]) => [id, [...childIds]])),
    };
    ensureCanonicalHomeDocs(snapshot);
    return snapshot;
  }
  if (shape.version === 1) {
    return migrateSnapshotV1ToV2(shape);
  }
  return null;
};

const migrateLegacyPhase3 = (legacyRoot: LegacyPhase3Node): VfsSnapshot => {
  const snapshot = createSeedSnapshot();

  const inject = (node: LegacyPhase3Node, parentId: string): void => {
    const id = snapshot.nodes[node.id] ? uid() : node.id;
    const safe: VfsNode = {
      id,
      name: normalizeName(node.name || 'Untitled'),
      type: node.type,
      parentId,
      kind: node.type === 'file' ? remapLegacyKind(node.fileType) : undefined,
    };
    snapshot.nodes[id] = safe;
    if (safe.type === 'folder') snapshot.children[id] = [];
    ensureChild(snapshot.children, parentId, id);
    if (safe.type === 'folder') {
      for (const child of node.children ?? []) inject(child, id);
    }
  };

  for (const child of legacyRoot.children ?? []) {
    inject(child, snapshot.rootId);
  }

  return snapshot;
};

export class MeOsVfsService {
  private snapshot: VfsSnapshot;
  private listeners: Listeners = new Set();
  private storage: VfsStorageAdapter;

  constructor(storage?: VfsStorageAdapter) {
    this.storage = storage ?? createBrowserStorage();
    this.snapshot = this.load();
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  private persist(next: VfsSnapshot) {
    this.snapshot = next;
    writeJson<VfsSnapshot>(this.storage, VFS_STORAGE_KEY, next);
    this.emit();
  }

  private load(): VfsSnapshot {
    const rawSnapshot = readJson<unknown>(this.storage, VFS_STORAGE_KEY);
    const shape = sanitizeSnapshotShape(rawSnapshot);
    if (shape) {
      const normalized = normalizeSnapshot(shape);
      if (normalized) {
        writeJson<VfsSnapshot>(this.storage, VFS_STORAGE_KEY, normalized);
        return normalized;
      }
    }

    const legacy = readJson<LegacyPhase3Node | null>(this.storage, LEGACY_PHASE3_KEY);
    if (legacy && legacy.type === 'folder') {
      const migrated = migrateLegacyPhase3(legacy);
      writeJson<VfsSnapshot>(this.storage, VFS_STORAGE_KEY, migrated);
      return migrated;
    }

    const seeded = createSeedSnapshot();
    writeJson<VfsSnapshot>(this.storage, VFS_STORAGE_KEY, seeded);
    return seeded;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getSnapshot(): VfsSnapshot {
    return cloneSnapshot(this.snapshot);
  }

  getNode(nodeId: string): VfsNode | null {
    const node = this.snapshot.nodes[nodeId];
    return node ? cloneNode(node) : null;
  }

  getPath(nodeId: string): string | null {
    return this.snapshot.nodes[nodeId] ? buildVfsNodePath(this.snapshot, nodeId) : null;
  }

  getChildCount(nodeId: string): number {
    return this.snapshot.nodes[nodeId]?.type === 'folder'
      ? (this.snapshot.children[nodeId] ?? []).length
      : 0;
  }

  listChildren(parentId: string): VfsNode[] {
    const ids = this.snapshot.children[parentId] ?? [];
    return ids.map((id) => this.snapshot.nodes[id]).filter(Boolean).map(cloneNode);
  }

  createFolder(parentId: string, name: string): VfsNode | null {
    const parent = this.snapshot.nodes[parentId];
    if (!parent || parent.type !== 'folder') return null;
    const node: VfsNode = {
      id: uid(),
      name: normalizeName(name),
      type: 'folder',
      parentId,
    };
    const next = cloneSnapshot(this.snapshot);
    next.nodes[node.id] = node;
    next.children[node.id] = [];
    next.children[parentId] = [...(next.children[parentId] ?? []), node.id];
    this.persist(next);
    return cloneNode(node);
  }

  createFile(parentId: string, name: string, kind: VfsFileKind = 'text'): VfsNode | null {
    const parent = this.snapshot.nodes[parentId];
    if (!parent || parent.type !== 'folder') return null;
    const node: VfsNode = {
      id: uid(),
      name: normalizeName(name),
      type: 'file',
      parentId,
      kind,
    };
    const next = cloneSnapshot(this.snapshot);
    next.nodes[node.id] = node;
    next.children[parentId] = [...(next.children[parentId] ?? []), node.id];
    this.persist(next);
    return cloneNode(node);
  }

  rename(nodeId: string, name: string): boolean {
    if (!this.snapshot.nodes[nodeId]) return false;
    const next = cloneSnapshot(this.snapshot);
    next.nodes[nodeId].name = normalizeName(name);
    this.persist(next);
    return true;
  }

  deleteNode(nodeId: string): boolean {
    const node = this.snapshot.nodes[nodeId];
    if (!node || node.parentId == null) return false;

    const next = cloneSnapshot(this.snapshot);
    const removeRecursive = (id: string) => {
      const target = next.nodes[id];
      if (!target) return;
      if (target.type === 'folder') {
        for (const childId of next.children[id] ?? []) {
          removeRecursive(childId);
        }
        delete next.children[id];
      }
      delete next.nodes[id];
    };

    removeRecursive(nodeId);
    next.children[node.parentId] = (next.children[node.parentId] ?? []).filter((id) => id !== nodeId);
    this.persist(next);
    return true;
  }

  reset(): void {
    this.persist(createSeedSnapshot());
  }
}

let singleton: MeOsVfsService | null = null;

export const getMeOsVfsService = (): MeOsVfsService => {
  if (!singleton) singleton = new MeOsVfsService();
  return singleton;
};
