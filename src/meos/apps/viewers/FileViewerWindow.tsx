/**
 * Basic file viewer window for M3.
 * Uses VFS metadata to render text/image/video previews.
 */
import React from 'react';
import type { MeOsWindow } from '../../shell/types';
import { useMeOsVfs } from '../../vfs/MeOsVfsProvider';
import styles from './FileViewerWindow.module.scss';

type FileViewerWindowProps = {
  win: MeOsWindow;
};

const getImageSource = (name: string): string => {
  if (/portrait/i.test(name)) return '/assets/me.png';
  return '/assets/me.png';
};

const getVideoSource = (_name: string): string => '/assets/landing-bg.mp4';

const getTextPreview = (name: string): string => {
  if (/readme/i.test(name)) {
    return 'Welcome to ME.OS FileMan. This is a placeholder text preview for M3.';
  }
  return `No inline content stored for "${name}" yet.`;
};

const FileViewerWindow: React.FC<FileViewerWindowProps> = ({ win }) => {
  const { snapshot } = useMeOsVfs();
  const node = win.nodeId ? snapshot.nodes[win.nodeId] : null;

  if (!node || node.type !== 'file') {
    return (
      <div className={styles.missing}>
        <p>FILE NOT FOUND</p>
        <p>It may have been deleted or moved.</p>
      </div>
    );
  }

  const kind = node.kind ?? win.viewerKind ?? 'text';

  if (kind === 'image') {
    return (
      <div className={styles.mediaWrap}>
        <img className={styles.image} src={getImageSource(node.name)} alt={node.name} />
      </div>
    );
  }

  if (kind === 'video') {
    return (
      <div className={styles.mediaWrap}>
        <video className={styles.video} controls playsInline poster="/assets/landing-poster.jpg">
          <source src={getVideoSource(node.name)} type="video/mp4" />
        </video>
      </div>
    );
  }

  return (
    <div className={styles.textWrap}>
      <p className={styles.title}>{node.name}</p>
      <pre className={styles.pre}>{getTextPreview(node.name)}</pre>
    </div>
  );
};

export default FileViewerWindow;

