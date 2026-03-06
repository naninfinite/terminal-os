import React from 'react';
import { getDesktopEntryTemplate } from '../../shell/desktopEntries';
import type { MeOsWindow } from '../../shell/types';
import { useMeOsVfs } from '../../vfs/MeOsVfsProvider';
import styles from './NodeInfoWindow.module.scss';

type NodeInfoWindowProps = {
  win: MeOsWindow;
};

const formatKind = (win: MeOsWindow, nodeKind: string | undefined, isFolder: boolean): string => {
  if (isFolder) return 'Folder';
  if (nodeKind === 'game' || win.viewerKind === 'game') return 'Game';
  if (nodeKind === 'contact' || win.viewerKind === 'contact') return 'Contact Card';
  if (nodeKind === 'project' || win.viewerKind === 'project') return 'Project Document';
  if (nodeKind === 'image' || win.viewerKind === 'image') return 'Image';
  if (nodeKind === 'video' || win.viewerKind === 'video') return 'Video';
  return 'Document';
};

const NodeInfoWindow: React.FC<NodeInfoWindowProps> = ({ win }) => {
  const { getNode, getPath, getChildCount } = useMeOsVfs();
  const node = win.nodeId ? getNode(win.nodeId) : null;
  const desktopEntry = win.desktopEntryId ? getDesktopEntryTemplate(win.desktopEntryId) : undefined;
  const isAlias = Boolean(desktopEntry);
  const aliasLabel = desktopEntry?.label ?? node?.name ?? 'Unknown';

  if (!node) {
    return (
      <div className={styles.missing}>
        <p>ITEM NOT FOUND</p>
        <p>It may have been removed since this info window was opened.</p>
      </div>
    );
  }

  const path = getPath(node.id) ?? '/';
  const isFolder = node.type === 'folder';

  return (
    <div className={styles.root} data-allow-select="true">
      <div className={styles.table}>
        <div className={styles.row}>
          <span className={styles.label}>Name</span>
          <span className={styles.value}>{isAlias ? aliasLabel : node.name}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Kind</span>
          <span className={styles.value}>{formatKind(win, node.kind, isFolder)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Path</span>
          <span className={styles.value}>{path}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>{isFolder ? 'Items' : 'Viewer'}</span>
          <span className={styles.value}>
            {isFolder ? `${getChildCount(node.id)} item${getChildCount(node.id) === 1 ? '' : 's'}` : formatKind(win, node.kind, false)}
          </span>
        </div>
        {isAlias ? (
          <>
            <div className={styles.row}>
              <span className={styles.label}>Alias</span>
              <span className={styles.value}>Yes</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Opens</span>
              <span className={styles.value}>{path}</span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default NodeInfoWindow;
