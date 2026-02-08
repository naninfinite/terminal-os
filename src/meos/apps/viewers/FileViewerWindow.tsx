/**
 * File-backed viewer window for M4.
 * Renders directly from VFS node metadata instead of name-based placeholders.
 */
import React from 'react';
import type { MeOsWindow } from '../../shell/types';
import { useMeOsVfs } from '../../vfs/MeOsVfsProvider';
import styles from './FileViewerWindow.module.scss';

type FileViewerWindowProps = {
  win: MeOsWindow;
};

const createFallbackImage = (label: string): string => {
  const safe = label.replace(/[<>&]/g, '');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <rect width="1280" height="720" fill="#060906" />
      <rect x="24" y="24" width="1232" height="672" fill="none" stroke="#00ff66" stroke-opacity="0.3" stroke-width="2" />
      <text x="72" y="128" font-family="monospace" font-size="38" fill="#00ff66">ME.OS IMAGE PREVIEW</text>
      <text x="72" y="190" font-family="monospace" font-size="24" fill="#00ff66" fill-opacity="0.85">${safe}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const fallbackText = (name: string): string => `No inline text content configured for "${name}".`;

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
    const source = node.assetSrc?.trim() || createFallbackImage(node.name);
    return (
      <div className={styles.mediaWrap}>
        <img className={styles.image} src={source} alt={node.name} />
      </div>
    );
  }

  if (kind === 'video') {
    const source = node.assetSrc?.trim();
    const poster = node.posterSrc?.trim() || createFallbackImage(`${node.name} (poster)`);
    if (!source) {
      return (
        <div className={styles.videoFallback}>
          <img className={styles.poster} src={poster} alt={`${node.name} poster`} />
          <p className={styles.metaTitle}>{node.name}</p>
          <p className={styles.metaCopy}>{node.textContent || 'No video source configured yet.'}</p>
        </div>
      );
    }
    return (
      <div className={styles.mediaWrap}>
        <video className={styles.video} controls playsInline poster={poster}>
          <source src={source} type="video/mp4" />
        </video>
      </div>
    );
  }

  if (kind === 'project') {
    const card = node.projectMeta;
    return (
      <article className={styles.projectCard}>
        <p className={styles.projectLabel}>PROJECT CARD</p>
        <h3 className={styles.projectTitle}>{card?.title || node.name}</h3>
        <p className={styles.metaCopy}>{card?.summary || 'Project summary not configured yet.'}</p>
        <div className={styles.stack}>
          {(card?.stack ?? []).map((item) => (
            <span key={item} className={styles.stackItem}>{item}</span>
          ))}
        </div>
        {card?.demoUrl ? (
          <a className={styles.link} href={card.demoUrl} target="_blank" rel="noreferrer">OPEN DEMO</a>
        ) : null}
        {card?.repoUrl ? (
          <a className={styles.link} href={card.repoUrl} target="_blank" rel="noreferrer">OPEN REPO</a>
        ) : null}
      </article>
    );
  }

  return (
    <div className={styles.textWrap}>
      <p className={styles.metaTitle}>{node.name}</p>
      <pre className={styles.pre}>{node.textContent || fallbackText(node.name)}</pre>
    </div>
  );
};

export default FileViewerWindow;
