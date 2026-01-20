import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ME.module.scss';

type MediaType = 'image' | 'video';

type PortfolioItem = {
  id: string;
  title: string;
  type: MediaType;
  src: string;
  poster?: string;
  description?: string;
  linkHref?: string;
  linkLabel?: string;
};

export type MEProps = {
  variant?: 'compact' | 'full';
};

function requestOpenApp(app: 'ME' | 'YOU' | 'THIRD' | 'CONNECT') {
  try {
    window.dispatchEvent(new CustomEvent('terminalos:open-app', { detail: { app } }));
  } catch {
    // ignore
  }
}

const ME: React.FC<MEProps> = ({ variant = 'compact' }) => {
  const items: PortfolioItem[] = useMemo(
    () => [
      {
        id: 'reel',
        title: 'REEL.MP4',
        type: 'video',
        src: '/assets/landing-bg.mp4',
        poster: '/assets/landing-poster.jpg',
        description: 'SHORT REEL / PLACEHOLDER. REPLACE WITH YOUR OWN VIDEO.',
      },
      {
        id: 'portrait',
        title: 'PORTRAIT.PNG',
        type: 'image',
        src: '/assets/me.png',
        description: 'PROFILE IMAGE / PLACEHOLDER.',
        linkHref: 'https://github.com/naninfinite',
        linkLabel: 'OPEN SOURCE',
      },
    ],
    []
  );

  const [activeId, setActiveId] = useState(items[0]?.id ?? '');
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const active = useMemo(() => items.find((x) => x.id === activeId) ?? items[0], [activeId, items]);

  const formatTime = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  };

  useEffect(() => {
    // Stop playback when switching away from video.
    const v = videoRef.current;
    if (!v) return;
    if (active?.type !== 'video') {
      try {
        v.pause();
        v.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }, [active?.type]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active?.type !== 'video') return;

    const onLoaded = () => {
      setVideoDuration(Number.isFinite(v.duration) ? v.duration : 0);
      setVideoTime(Number.isFinite(v.currentTime) ? v.currentTime : 0);
    };
    const onTime = () => setVideoTime(Number.isFinite(v.currentTime) ? v.currentTime : 0);
    const onPlay = () => setVideoPlaying(true);
    const onPause = () => setVideoPlaying(false);

    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    // Prime state (in case metadata is already available)
    onLoaded();
    onPause();

    return () => {
      v.removeEventListener('loadedmetadata', onLoaded);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
    };
  }, [active?.type, activeId]);

  if (variant === 'compact') {
    return (
      <div className={styles.panelView} aria-label="ME portfolio (compact)">
        <img
          className={styles.thumb}
          src="/assets/me.png"
          alt="Profile"
          onError={(e) => {
            const el = e.currentTarget;
            if (el.dataset.fallback === '1') return;
            el.dataset.fallback = '1';
            el.src =
              'data:image/svg+xml;utf8,' +
              encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'>
                  <rect width='100%' height='100%' fill='black'/>
                  <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#00ff66' font-family='monospace' font-size='10'>NO IMAGE</text>
                </svg>`
              );
          }}
        />
        <div className={styles.panelMeta}>
          <div className={styles.label}>PORTFOLIO</div>
          <div className={styles.subLabel}>OPEN IN FULLSCREEN FOR COMFORT</div>
          <button
            type="button"
            className={styles.openBtn}
            onClick={() => requestOpenApp('ME')}
            aria-label="Open ME.EXE fullscreen"
          >
            OPEN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.root}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const idx = items.findIndex((x) => x.id === activeId);
          if (idx < 0) return;
          const dir = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1;
          const next = items[(idx + dir + items.length) % items.length];
          if (next) setActiveId(next.id);
        }
      }}
      aria-label="ME portfolio"
    >
      <div className={styles.content}>
        <div className={styles.preview}>
          <div className={styles.previewFrame} aria-label="Active media preview">
            {active?.type === 'image' ? (
              <img className={styles.previewMedia} src={active.src} alt={active.title} />
            ) : active?.type === 'video' ? (
              <video
                ref={videoRef}
                className={styles.previewMedia}
                playsInline
                muted
                loop
                preload="metadata"
                poster={active.poster}
              >
                <source src={active.src} />
              </video>
            ) : (
              <div className={styles.previewEmpty}>NO MEDIA</div>
            )}
          </div>

          <div className={styles.previewInfo}>
            <div className={styles.previewTitle}>{active?.title ?? '—'}</div>
            {active?.description ? <div className={styles.previewBlurb}>{active.description}</div> : null}

            {active?.type === 'video' ? (
              <div className={styles.videoControls} aria-label="Video transport controls">
                <div className={styles.transportBar} aria-hidden="true">
                  <span className={styles.transportLabel}>{videoPlaying ? '||' : '▶'}</span>
                  <div className={styles.meter}>
                    <div
                      className={styles.meterFill}
                      style={{
                        width:
                          videoDuration > 0 ? `${Math.min(100, Math.max(0, (videoTime / videoDuration) * 100))}%` : '0%',
                      }}
                    />
                  </div>
                  <span className={styles.transportTime}>
                    {formatTime(videoTime)} / {formatTime(videoDuration)}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.ctrlBtn}
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    if (v.paused) void v.play();
                    else v.pause();
                  }}
                  aria-label="Play or pause video"
                >
                  PLAY/PAUSE
                </button>
                <button
                  type="button"
                  className={styles.ctrlBtn}
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    v.muted = !v.muted;
                  }}
                  aria-label="Mute or unmute video"
                >
                  MUTE
                </button>
                <button
                  type="button"
                  className={styles.ctrlBtn}
                  onClick={() => {
                    const v = videoRef.current;
                    if (!v) return;
                    try {
                      v.pause();
                      v.currentTime = 0;
                    } catch {
                      // ignore
                    }
                  }}
                  aria-label="Restart video"
                >
                  RESTART
                </button>
              </div>
            ) : null}
            {active?.linkHref ? (
              <a
                className={styles.linkBtn}
                href={active.linkHref}
                target="_blank"
                rel="noreferrer"
                aria-label={active.linkLabel ? `Open link: ${active.linkLabel}` : 'Open link'}
              >
                {active.linkLabel ?? 'OPEN LINK'}
              </a>
            ) : null}
            <div className={styles.hint}>ARROWS: SWITCH • 1–4: DOCK • ESC: CLOSE</div>
          </div>
        </div>

        <div className={styles.gallery} aria-label="Portfolio media gallery">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              className={`${styles.card} ${it.id === activeId ? styles.cardActive : ''}`}
              onClick={() => setActiveId(it.id)}
              aria-label={`Select ${it.title}`}
              aria-current={it.id === activeId ? 'true' : undefined}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardTitle}>{`> ${it.title}`}</span>
                <span className={styles.cardType}>{it.type === 'video' ? '[VID]' : '[IMG]'}</span>
              </div>
              <div className={styles.cardThumb}>
                {it.type === 'image' ? (
                  <img className={styles.cardThumbMedia} src={it.src} alt="" aria-hidden="true" />
                ) : it.poster ? (
                  <img className={styles.cardThumbMedia} src={it.poster} alt="" aria-hidden="true" />
                ) : (
                  <div className={styles.cardThumbVid} aria-hidden="true">
                    VIDEO
                  </div>
                )}
              </div>
              {it.description ? <div className={styles.cardDesc}>{it.description}</div> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ME;



