/**
 * File-backed viewer window.
 * Renders directly from VFS node metadata instead of name-based placeholders.
 */
import React, { useRef, useState } from 'react';
import type { MeOsWindow } from '../../shell/types';
import { useMeOsVfs } from '../../vfs/MeOsVfsProvider';
import styles from './FileViewerWindow.module.scss';
import { useTheme } from '../../../theme/ThemeProvider';
import type { ResolvedTheme } from '../../../theme/types';
import { RUNTIME_THEME_PALETTE } from '../../../theme/runtimePalette';

type FileViewerWindowProps = {
  win: MeOsWindow;
};

const FALLBACK_SVG_THEME: Record<ResolvedTheme, {
  background: string;
  frameStroke: string;
  titleColor: string;
  bodyColor: string;
}> = {
  dark: {
    background: RUNTIME_THEME_PALETTE.dark.background,
    frameStroke: RUNTIME_THEME_PALETTE.dark.accent,
    titleColor: RUNTIME_THEME_PALETTE.dark.text,
    bodyColor: RUNTIME_THEME_PALETTE.dark.text,
  },
  light: {
    background: RUNTIME_THEME_PALETTE.light.background,
    frameStroke: RUNTIME_THEME_PALETTE.light.accent,
    titleColor: RUNTIME_THEME_PALETTE.light.text,
    bodyColor: RUNTIME_THEME_PALETTE.light.text,
  },
};

const createFallbackImage = (label: string, theme: ResolvedTheme): string => {
  const safe = label.replace(/[<>&]/g, '');
  const palette = FALLBACK_SVG_THEME[theme];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <rect width="1280" height="720" fill="${palette.background}" />
      <rect x="24" y="24" width="1232" height="672" fill="none" stroke="${palette.frameStroke}" stroke-opacity="0.3" stroke-width="2" />
      <text x="72" y="128" font-family="monospace" font-size="38" fill="${palette.titleColor}">ME.EXE IMAGE PREVIEW</text>
      <text x="72" y="190" font-family="monospace" font-size="24" fill="${palette.bodyColor}" fill-opacity="0.85">${safe}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const fallbackText = (name: string): string => `No inline text content configured for "${name}".`;
const getKindLabel = (kind: string): string => kind.toUpperCase();

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
  const { resolvedTheme } = useTheme();
  const { snapshot } = useMeOsVfs();
  const node = win.nodeId ? snapshot.nodes[win.nodeId] : null;

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

  if (kind === 'image') {
    const source = node.assetSrc?.trim() || createFallbackImage(node.name, resolvedTheme);
    return (
      <div className={styles.viewer}>
        <header className={styles.viewerHeader}>
          <span className={styles.viewerKind}>{getKindLabel(kind)}</span>
          <span className={styles.viewerName}>{node.name}</span>
        </header>
        <div className={styles.mediaWrap}>
          <img className={styles.image} src={source} alt={node.name} />
        </div>
      </div>
    );
  }

  if (kind === 'video') {
    const source = node.assetSrc?.trim();
    const poster = node.posterSrc?.trim() || createFallbackImage(`${node.name} (poster)`, resolvedTheme);
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
      </div>
    );
  }

  if (kind === 'contact') {
    const contact = node.contactMeta;
    return (
      <div className={styles.viewer}>
        <article className={styles.contactCard} data-allow-select="true">
          <div className={styles.contactHero}>
            <div className={styles.contactAvatarPlaceholder} aria-hidden="true">
              <span>AV</span>
            </div>
            <div className={styles.contactIntro}>
              <p className={styles.projectLabel}>CONTACT CARD</p>
              <h2 className={styles.contactTitle}>{node.name}</h2>
              <p className={styles.metaCopy}>
                {contact?.status || 'Add status copy for this contact card.'}
              </p>
            </div>
          </div>
          <p className={styles.metaCopy}>{node.textContent || fallbackText(node.name)}</p>
          <div className={styles.contactActions}>
            <a className={styles.linkCard} href={`mailto:${contact?.email || 'add-email@example.com'}`}>
              <span className={styles.linkCardLabel}>Email</span>
              <span className={styles.linkCardValue}>{contact?.email || 'add-email@example.com'}</span>
            </a>
            <a className={styles.linkCard} href={contact?.githubUrl || 'https://github.com/your-handle'} target="_blank" rel="noreferrer">
              <span className={styles.linkCardLabel}>GitHub</span>
              <span className={styles.linkCardValue}>{contact?.githubUrl || 'https://github.com/your-handle'}</span>
            </a>
            <a className={styles.linkCard} href={contact?.instagramUrl || 'https://instagram.com/your-handle'} target="_blank" rel="noreferrer">
              <span className={styles.linkCardLabel}>Instagram</span>
              <span className={styles.linkCardValue}>{contact?.instagramUrl || 'https://instagram.com/your-handle'}</span>
            </a>
          </div>
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
              <span>PORTRAIT</span>
            </div>
            <div className={styles.aboutHeroCopy}>
              <p className={styles.projectLabel}>ABOUT</p>
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
