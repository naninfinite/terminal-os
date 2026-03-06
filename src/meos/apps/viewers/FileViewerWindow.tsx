/**
 * File-backed viewer window.
 * Renders directly from VFS node metadata instead of name-based placeholders.
 */
import React, { useRef, useState } from 'react';
import { useMeOs } from '../../shell/MeOsProvider';
import type { MeOsWindow } from '../../shell/types';
import { useMeOsVfs } from '../../vfs/MeOsVfsProvider';
import {
  ABOUT_DOC_ID,
  MEDIA_ID,
  PROJECTS_ID,
} from '../../vfs/seed';
import styles from './FileViewerWindow.module.scss';
import { useTheme } from '../../../theme/ThemeProvider';
import naninfinitePortrait from '../../../assets/images/NaNinfinite.jpg';
import { resolveImagePreviewSrc, resolveVideoPosterSrc } from './mediaPreview';
import { resolvePortraitImageViewerSize } from './imageViewerSizing';

type FileViewerWindowProps = {
  win: MeOsWindow;
};

const fallbackText = (name: string): string => `No inline text content configured for "${name}".`;

const getKindLabel = (kind: string): string => {
  switch (kind) {
    case 'image':
      return 'STILL';
    case 'video':
      return 'REEL';
    case 'project':
      return 'PROJECT DOSSIER';
    case 'contact':
      return 'CONTACT CARD';
    case 'game':
      return 'PLAY SURFACE';
    case 'text':
    default:
      return 'FIELD NOTE';
  }
};

const formatVideoTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

type VideoPlayerProps = {
  source: string;
  poster: string;
  name: string;
};

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  source,
  poster,
  name,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const hasDuration = duration > 0;
  const seekMax = hasDuration ? duration : 1;
  const seekValue = hasDuration ? Math.min(currentTime, duration) : 0;

  const updateDuration = (value: number) => {
    setDuration(Number.isFinite(value) && value > 0 ? value : 0);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      const playResult = video.play();
      if (playResult && typeof playResult.catch === 'function') {
        void playResult.catch(() => setIsPlaying(false));
      }
      return;
    }
    video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = Number(event.currentTarget.value);
    if (!Number.isFinite(nextTime)) return;
    const video = videoRef.current;
    if (video) {
      video.currentTime = nextTime;
    }
    setCurrentTime(nextTime);
  };

  return (
    <div className={styles.videoPlayer}>
      <div className={styles.videoStage}>
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          preload="metadata"
          poster={poster}
          onClick={togglePlay}
          onLoadedMetadata={(event) => {
            updateDuration(event.currentTarget.duration);
            setCurrentTime(event.currentTarget.currentTime || 0);
            setIsMuted(event.currentTarget.muted);
          }}
          onDurationChange={(event) => updateDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onVolumeChange={(event) => setIsMuted(event.currentTarget.muted)}
        >
          <source src={source} type="video/mp4" />
        </video>
      </div>

      <div className={styles.videoControls}>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={togglePlay}
          aria-label={isPlaying ? `Pause ${name}` : `Play ${name}`}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <input
          className={styles.timeline}
          type="range"
          min={0}
          max={seekMax}
          step={0.1}
          value={seekValue}
          onChange={handleSeek}
          disabled={!hasDuration}
          aria-label={`Seek ${name}`}
        />
        <span className={styles.timecode}>
          {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
        </span>
        <button
          type="button"
          className={styles.controlBtn}
          onClick={toggleMute}
          aria-label={isMuted ? `Unmute ${name}` : `Mute ${name}`}
        >
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
      </div>
    </div>
  );
};

const FileViewerWindow: React.FC<FileViewerWindowProps> = ({ win }) => {
  const { openNode, resizeWindow } = useMeOs();
  const { resolvedTheme } = useTheme();
  const { snapshot } = useMeOsVfs();
  const node = win.nodeId ? snapshot.nodes[win.nodeId] : null;
  const portraitAdjustedRef = useRef(false);

  React.useEffect(() => {
    portraitAdjustedRef.current = false;
  }, [node?.id]);

  if (!node || node.type !== 'file') {
    return (
      <div className={styles.viewer}>
        <div className={styles.missing}>
          <p>FILE NOT FOUND</p>
          <p>It may have been deleted or moved.</p>
        </div>
      </div>
    );
  }

  const kind = node.kind ?? win.viewerKind ?? 'text';
  const projectArtifact = node.projectMeta?.artifactUrl
    ? {
      label: node.projectMeta.artifactLabel ?? 'OPEN ARTIFACT',
      url: node.projectMeta.artifactUrl,
    }
    : node.projectMeta?.demoUrl
      ? {
        label: 'OPEN DEMO',
        url: node.projectMeta.demoUrl,
      }
      : node.projectMeta?.repoUrl
        ? {
          label: 'OPEN REPOSITORY',
          url: node.projectMeta.repoUrl,
        }
        : null;

  if (kind === 'image') {
    const source = resolveImagePreviewSrc(node, resolvedTheme);
    return (
      <div className={styles.viewer}>
        <header className={styles.viewerHeader}>
          <span className={styles.viewerKind}>{getKindLabel(kind)}</span>
          <span className={styles.viewerName}>{node.name}</span>
        </header>
        <div className={styles.mediaWrap}>
          <img
            className={styles.image}
            src={source}
            alt={node.name}
            onLoad={(event) => {
              if (portraitAdjustedRef.current) return;
              const { naturalWidth, naturalHeight } = event.currentTarget;
              const nextSize = resolvePortraitImageViewerSize(naturalWidth, naturalHeight);
              if (!nextSize) return;
              portraitAdjustedRef.current = true;
              resizeWindow(win.id, nextSize);
            }}
          />
        </div>
      </div>
    );
  }

  if (kind === 'video') {
    const source = node.assetSrc?.trim();
    const poster = resolveVideoPosterSrc(node, resolvedTheme);
    if (!source) {
      return (
        <div className={styles.viewer}>
          <header className={styles.viewerHeader}>
            <span className={styles.viewerKind}>{getKindLabel(kind)}</span>
            <span className={styles.viewerName}>{node.name}</span>
          </header>
          <div className={styles.videoFallback}>
            <img className={styles.poster} src={poster} alt={`${node.name} poster`} />
            <p className={styles.metaTitle}>{node.name}</p>
            <p className={styles.metaCopy}>{node.textContent || 'No video source configured yet.'}</p>
          </div>
        </div>
      );
    }
    return (
      <div className={styles.viewer}>
        <header className={styles.viewerHeader}>
          <span className={styles.viewerKind}>{getKindLabel(kind)}</span>
          <span className={styles.viewerName}>{node.name}</span>
        </header>
        <div className={`${styles.mediaWrap} ${styles.mediaWrapVideo}`.trim()}>
          <VideoPlayer
            source={source}
            poster={poster}
            name={node.name}
          />
        </div>
      </div>
    );
  }

  if (kind === 'project') {
    const card = node.projectMeta;
    return (
      <div className={styles.viewer}>
        <header className={styles.viewerHeader}>
          <span className={styles.viewerKind}>{getKindLabel(kind)}</span>
          <span className={styles.viewerName}>{node.name}</span>
        </header>
        <article className={styles.projectCard}>
          <p className={styles.projectLabel}>WORLD ARTIFACT</p>
          <h3 className={styles.projectTitle}>{card?.title || node.name}</h3>
          <p className={styles.metaCopy}>{card?.summary || 'Project summary not configured yet.'}</p>
          <div className={styles.projectMetaBlock}>
            <p className={styles.metaEyebrow}>WHY IT MATTERS</p>
            <p className={styles.metaCopy}>
              {card?.whyItMatters || 'This artifact still needs a reason for being written into the world.'}
            </p>
          </div>
          <div className={styles.stack}>
            {(card?.stack ?? []).map((item) => (
              <span key={item} className={styles.stackItem}>{item}</span>
            ))}
          </div>
          {projectArtifact ? (
            <a className={styles.link} href={projectArtifact.url} target="_blank" rel="noreferrer">
              {projectArtifact.label}
            </a>
          ) : null}
        </article>
      </div>
    );
  }

  if (kind === 'contact') {
    const contact = node.contactMeta;
    const contactLinks = [
      contact?.email ? {
        label: 'Email',
        value: contact.email,
        href: `mailto:${contact.email}`,
      } : null,
      contact?.githubUrl ? {
        label: 'GitHub',
        value: contact.githubUrl,
        href: contact.githubUrl,
      } : null,
      contact?.instagramUrl ? {
        label: 'Instagram',
        value: contact.instagramUrl,
        href: contact.instagramUrl,
      } : null,
    ].filter((item): item is { label: string; value: string; href: string } => item != null);

    return (
      <div className={styles.viewer}>
        <article className={styles.contactCard} data-allow-select="true">
          <div className={styles.contactHero}>
            <div className={styles.contactAvatarFrame}>
              <img
                className={styles.contactAvatarImage}
                src={naninfinitePortrait}
                alt="Naninfinite portrait"
              />
            </div>
            <div className={styles.contactIntro}>
              <p className={styles.projectLabel}>CONTACT CARD</p>
              <h2 className={styles.contactTitle}>{node.name}</h2>
              <p className={styles.metaCopy}>
                {contact?.status || 'No active contact channel is configured yet.'}
              </p>
            </div>
          </div>
          <p className={styles.metaCopy}>{node.textContent || fallbackText(node.name)}</p>
          {contactLinks.length > 0 ? (
            <div className={styles.contactActions}>
              {contactLinks.map((item) => (
                <a
                  key={item.label}
                  className={styles.linkCard}
                  href={item.href}
                  target={item.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel={item.href.startsWith('mailto:') ? undefined : 'noreferrer'}
                >
                  <span className={styles.linkCardLabel}>{item.label}</span>
                  <span className={styles.linkCardValue}>{item.value}</span>
                </a>
              ))}
            </div>
          ) : (
            <p className={styles.metaCopy}>No external channels are published on this card yet.</p>
          )}
        </article>
      </div>
    );
  }

  if (node.documentLayout === 'hub') {
    return (
      <div className={styles.viewer}>
        <header className={styles.viewerHeader}>
          <span className={styles.viewerKind}>WORLD HUB</span>
          <span className={styles.viewerName}>{node.name}</span>
        </header>
        <article className={styles.hubDoc} data-allow-select="true">
          <section className={styles.hubHero}>
            <p className={styles.projectLabel}>START HERE</p>
            <h2 className={styles.contactTitle}>ME.EXE World Hub</h2>
            <p className={styles.metaCopy}>{node.textContent || fallbackText(node.name)}</p>
          </section>
          <section className={styles.hubActions} aria-label="Recommended next opens">
            <button type="button" className={styles.actionCard} onClick={() => openNode(PROJECTS_ID)}>
              <span className={styles.actionCardLabel}>OPEN PROJECTS</span>
              <span className={styles.actionCardValue}>Follow the systems, experiments, and interface artefacts.</span>
            </button>
            <button type="button" className={styles.actionCard} onClick={() => openNode(MEDIA_ID)}>
              <span className={styles.actionCardLabel}>OPEN MEDIA</span>
              <span className={styles.actionCardValue}>Take the faster atmospheric path through stills, motion, and the reel.</span>
            </button>
            <button type="button" className={styles.actionCard} onClick={() => openNode(ABOUT_DOC_ID)}>
              <span className={styles.actionCardLabel}>OPEN ABOUT</span>
              <span className={styles.actionCardValue}>Read the interface practice and the logic behind the shell.</span>
            </button>
          </section>
        </article>
      </div>
    );
  }

  if (node.documentLayout === 'about') {
    return (
      <div className={styles.viewer}>
        <article className={styles.aboutDoc} data-allow-select="true">
          <section className={styles.aboutHero}>
            <div className={styles.aboutHeroPlaceholder} aria-hidden="true">
              <span>ME.EXE</span>
            </div>
            <div className={styles.aboutHeroCopy}>
              <p className={styles.projectLabel}>WORLD NOTE</p>
              <h2 className={styles.contactTitle}>{node.name}</h2>
              <p className={styles.metaCopy}>{node.textContent || fallbackText(node.name)}</p>
            </div>
          </section>
          <section className={styles.aboutSections}>
            {(node.documentSections ?? []).map((section) => (
              <article key={section.title} className={styles.aboutSection}>
                <h3 className={styles.aboutSectionTitle}>{section.title}</h3>
                <p className={styles.metaCopy}>{section.body}</p>
              </article>
            ))}
          </section>
        </article>
      </div>
    );
  }

  return (
    <div className={styles.viewer}>
      <article className={styles.document} data-allow-select="true">
        <p className={styles.metaTitle}>{node.name}</p>
        <pre className={styles.pre}>{node.textContent || fallbackText(node.name)}</pre>
      </article>
    </div>
  );
};

export default FileViewerWindow;
