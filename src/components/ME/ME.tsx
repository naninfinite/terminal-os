import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ME.module.scss';
import crt from '../../styles/crt.module.scss';

type MediaType = 'image' | 'video';

type PortfolioItem = {
  id: string;
  title: string;
  type: MediaType;
  src: string;
  poster?: string;
  blurb?: string;
};

const ME: React.FC = () => {
  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const items: PortfolioItem[] = useMemo(
    () => [
      {
        id: 'reel',
        title: 'REEL.MP4',
        type: 'video',
        src: '/assets/landing-bg.mp4',
        poster: '/assets/landing-poster.jpg',
        blurb: 'SHORT REEL / PLACEHOLDER. REPLACE WITH YOUR OWN VIDEO.',
      },
      {
        id: 'portrait',
        title: 'PORTRAIT.PNG',
        type: 'image',
        src: '/assets/me.png',
        blurb: 'PROFILE IMAGE / PLACEHOLDER.',
      },
    ],
    []
  );

  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState(items[0]?.id ?? '');
  const openBtnRef = useRef<HTMLButtonElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastFocusedElRef = useRef<HTMLElement | null>(null);

  const active = useMemo(() => items.find((x) => x.id === activeId) ?? items[0], [activeId, items]);

  useEffect(() => {
    if (!isOpen) return;

    // Save/restore focus
    lastFocusedElRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        return;
      }

      // Simple keyboard navigation through items (Up/Down, Left/Right)
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const idx = items.findIndex((x) => x.id === activeId);
        if (idx < 0) return;
        const dir = e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 1;
        const next = items[(idx + dir + items.length) % items.length];
        if (next) setActiveId(next.id);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
      const el = lastFocusedElRef.current;
      if (el) el.focus();
      else openBtnRef.current?.focus();
    };
  }, [activeId, isOpen, items]);

  useEffect(() => {
    // Stop playback when switching away from video or closing overlay.
    const v = videoRef.current;
    if (!v) return;
    if (!isOpen || active?.type !== 'video') {
      try {
        v.pause();
        v.currentTime = 0;
      } catch {
        // ignore
      }
    }
  }, [active?.type, isOpen]);

  return (
    <div className={styles.root}>
      <div className={styles.panelView}>
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
          <div className={styles.label}>PORTFOLIO WINDOW</div>
          <div className={styles.subLabel}>OPEN FOR MEDIA / PROJECTS</div>
          <button
            ref={openBtnRef}
            type="button"
            className={styles.openBtn}
            onClick={() => setIsOpen(true)}
            aria-label="Open ME portfolio window"
          >
            OPEN
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          className={`${styles.overlay} ${crt.crt}`}
          role="dialog"
          aria-modal="true"
          aria-label="ME portfolio window"
          data-reduce-motion={reduceMotion ? '1' : '0'}
        >
          <div className={styles.window}>
            <div className={styles.titlebar}>
              <div className={styles.title}>[ ME.EXE :: PORTFOLIO ]</div>
              <div className={styles.titleActions}>
                <button
                  ref={closeBtnRef}
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => setIsOpen(false)}
                  aria-label="Close ME portfolio window"
                >
                  CLOSE
                </button>
              </div>
            </div>

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
                  {active?.blurb ? <div className={styles.previewBlurb}>{active.blurb}</div> : null}

                  {active?.type === 'video' ? (
                    <div className={styles.videoControls}>
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
                  <div className={styles.hint}>ARROWS: SWITCH • ESC: CLOSE</div>
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
                      <span className={styles.cardTitle}>{it.title}</span>
                      <span className={styles.cardType}>{it.type === 'video' ? 'VID' : 'IMG'}</span>
                    </div>
                    <div className={styles.cardThumb}>
                      {it.type === 'image' ? (
                        <img className={styles.cardThumbMedia} src={it.src} alt="" aria-hidden="true" />
                      ) : (
                        <div className={styles.cardThumbVid} aria-hidden="true">
                          VIDEO
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ME;



