import React, { useEffect, useMemo, useRef } from 'react';
import styles from './WindowOverlay.module.scss';
import crt from '../../styles/crt.module.scss';

export type AppKey = 'ME' | 'YOU' | 'THIRD' | 'CONNECT';

export type WindowOverlayProps = {
  activeApp: AppKey;
  onClose: () => void;
  onSelectApp: (key: AppKey) => void;
  children: React.ReactNode;
};

const APPS: Array<{ key: AppKey; label: string; title: string; shortcut: string }> = [
  { key: 'ME', label: 'ME', title: 'ME.EXE', shortcut: '1' },
  { key: 'YOU', label: 'YOU', title: 'YOU.EXE', shortcut: '2' },
  { key: 'THIRD', label: 'THIRD', title: 'THIRD.EXE', shortcut: '3' },
  { key: 'CONNECT', label: 'CONNECT', title: 'CONNECT.EXE', shortcut: '4' },
];

function getFocusable(root: HTMLElement): HTMLElement[] {
  const els = root.querySelectorAll<HTMLElement>(
    [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')
  );
  return Array.from(els).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
}

const WindowOverlay: React.FC<WindowOverlayProps> = ({ activeApp, onClose, onSelectApp, children }) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedElRef = useRef<HTMLElement | null>(null);

  const reduceMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  const activeTitle = useMemo(() => APPS.find((a) => a.key === activeApp)?.title ?? 'APP', [activeApp]);

  useEffect(() => {
    lastFocusedElRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Quick app switching (1-4)
      const hit = APPS.find((a) => a.shortcut === e.key);
      if (hit) {
        e.preventDefault();
        onSelectApp(hit.key);
        return;
      }

      // Focus trap
      if (e.key === 'Tab') {
        const root = overlayRef.current;
        if (!root) return;
        const focusables = getFocusable(root);
        if (focusables.length === 0) return;
        const activeEl = document.activeElement as HTMLElement | null;
        const idx = activeEl ? focusables.indexOf(activeEl) : -1;

        if (e.shiftKey) {
          const prev = idx <= 0 ? focusables[focusables.length - 1] : focusables[idx - 1];
          e.preventDefault();
          prev.focus();
        } else {
          const next = idx === -1 || idx === focusables.length - 1 ? focusables[0] : focusables[idx + 1];
          e.preventDefault();
          next.focus();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
      const el = lastFocusedElRef.current;
      if (el) el.focus();
    };
  }, [onClose, onSelectApp]);

  return (
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${crt.crt}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${activeTitle} fullscreen window`}
      data-reduce-motion={reduceMotion ? '1' : '0'}
    >
      <div className={styles.window}>
        <div className={styles.frame} aria-label="Fullscreen window frame">
          <div className={styles.titlebar}>
            <div className={styles.title}>[{activeTitle} :: FULLSCREEN]</div>
            <button
              ref={closeBtnRef}
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="Close fullscreen window"
            >
              CLOSE
            </button>
          </div>
          <div className={styles.appArea}>{children}</div>
        </div>

        <nav className={styles.dock} aria-label="App dock">
          {APPS.map((a) => (
            <button
              key={a.key}
              type="button"
              className={`${styles.dockBtn} ${a.key === activeApp ? styles.dockBtnActive : ''}`}
              onClick={() => onSelectApp(a.key)}
              aria-current={a.key === activeApp ? 'page' : undefined}
              aria-label={`Switch to ${a.title} (shortcut ${a.shortcut})`}
            >
              [{a.shortcut}] {a.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default WindowOverlay;

