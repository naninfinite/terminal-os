/**
 * ME.OS VFS service.
 *
 * M2 goals:
 * - Versioned persistence.
 * - Deterministic seed/reset behavior.
 * - Safe migration from legacy Phase 3 FS key.
 * - Pure-ish operations with a small imperative wrapper for storage.
 */
import { createSeedSnapshot } from './seed';
import type { LegacyPhase3Node, VfsFileKind, VfsNode, VfsSnapshot } from './types';

export const VFS_STORAGE_KEY = 'terminalOS.meos.v1.vfs';
export const VFS_VERSION = 1 as const;
export const LEGACY_PHASE3_KEY = 'terminal_os_fs_v1';

type Listeners = Set<() => void>;
export type VfsStorageAdapter = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const uid = (): string => (
  `n_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36).slice(-5)}`
);

const isValidKind = (kind: unknown): kind is VfsFileKind => (
  kind === 'text' || kind === 'image' || kind === 'video'
);

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
  };
};

const sanitizeSnapshot = (raw: unknown): VfsSnapshot | null => {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (data.version !== VFS_VERSION) return null;
  const rootId = typeof data.rootId === 'string' ? data.rootId : '';
  if (!rootId) return null;
  const rawNodes = data.nodes as Record<string, unknown> | undefined;
  if (!rawNodes || typeof rawNodes !== 'object') return null;

  const nodes: Record<string, VfsNode> = {};
  for (const [id, node] of Object.entries(rawNodes)) {
    const safeNode = sanitizeNode(node);
    if (!safeNode || safeNode.id !== id) continue;
    nodes[id] = safeNode;
  }
  if (!nodes[rootId]) return null;

  const rawChildren = data.children as Record<string, unknown> | undefined;
  const children: Record<string, string[]> = {};
  for (const id of Object.keys(nodes)) {
    children[id] = [];
  }
  if (rawChildren && typeof rawChildren === 'object') {
    for (const [parentId, arr] of Object.entries(rawChildren)) {
      if (!nodes[parentId] || nodes[parentId].type !== 'folder') continue;
      if (!Array.isArray(arr)) continue;
      children[parentId] = arr.filter((v): v is string => typeof v === 'string' && Boolean(nodes[v]));
    }
  }

  return {
    version: VFS_VERSION,
    rootId,
    nodes,
    children,
  };
};

const cloneSnapshot = (snapshot: VfsSnapshot): VfsSnapshot => ({
  version: snapshot.version,
  rootId: snapshot.rootId,
  nodes: Object.fromEntries(Object.entries(snapshot.nodes).map(([k, v]) => [k, { ...v }])),
  children: Object.fromEntries(Object.entries(snapshot.children).map(([k, v]) => [k, [...v]])),
});

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

const migrateLegacyPhase3 = (legacyRoot: LegacyPhase3Node): VfsSnapshot => {
  const snapshot = createSeedSnapshot();
  const nodes = snapshot.nodes;
  const children = snapshot.children;
  const parentFolder = snapshot.rootId;

  const inject = (node: LegacyPhase3Node, parentId: string): void => {
    const id = nodes[node.id] ? uid() : node.id;
    const safe: VfsNode = {
      id,
      name: normalizeName(node.name || 'Untitled'),
      type: node.type,
      parentId,
      kind: node.type === 'file' ? remapLegacyKind(node.fileType) : undefined,
    };
    nodes[id] = safe;
    children[parentId] ??= [];
    children[parentId].push(id);
    if (safe.type === 'folder') {
      children[id] = [];
      for (const child of node.children ?? []) {
        inject(child, id);
      }
    }
  };

  for (const child of legacyRoot.children ?? []) {
    inject(child, parentFolder);
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
    const persisted = sanitizeSnapshot(readJson<unknown>(this.storage, VFS_STORAGE_KEY));
    if (persisted) return persisted;

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

  listChildren(parentId: string): VfsNode[] {
    const ids = this.snapshot.children[parentId] ?? [];
    return ids.map((id) => this.snapshot.nodes[id]).filter(Boolean);
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
    return node;
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
    return node;
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
