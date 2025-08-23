import React, { useEffect, useRef, useState } from 'react';
import styles from './Cursor.module.scss';

// Retro cursor rendered as a green, monospace "►" glyph.
// Hides the native cursor while active and respects reduced motion and touch-only devices.
const Cursor: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const rafId = useRef<number | null>(null);
  const cursorEl = useRef<HTMLDivElement | null>(null);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);

  // Detect environments that support hover (avoid showing on touch-only devices)
  useEffect(() => {
    const supportsHover = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(hover: hover)').matches;
    if (!supportsHover) return; // don't render custom cursor on touch-only
    setEnabled(true);
  }, []);

  // Toggle body class to hide native cursor when enabled
  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add('custom-cursor-enabled');

    // Some browsers may temporarily show native cursor on mousedown/click.
    // Re-apply the class on mouse down/up to ensure custom cursor persists.
    const reapply = () => document.body.classList.add('custom-cursor-enabled');
    window.addEventListener('mousedown', reapply);
    window.addEventListener('mouseup', reapply);

    return () => {
      window.removeEventListener('mousedown', reapply);
      window.removeEventListener('mouseup', reapply);
      document.body.classList.remove('custom-cursor-enabled');
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isElementInteractive = (el: Element | null): boolean => {
      if (!el) return false;
      // Walk up to find an interactive ancestor
      let node: Element | null = el;
      // Limit depth to avoid worst-case traversals
      for (let i = 0; i < 6 && node; i += 1) {
        if (
          node.matches(
            'a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
          )
        ) return true;
        if ((node as HTMLElement).isContentEditable) return true;
        node = node.parentElement;
      }
      return false;
    };

    const onMove = (e: MouseEvent) => {
      targetX.current = e.clientX;
      targetY.current = e.clientY;
      // Determine if we're over an interactive element
      const el = document.elementFromPoint(e.clientX, e.clientY);
      setIsHoveringInteractive(isElementInteractive(el));
      if (reduceMotion) {
        currentX.current = targetX.current;
        currentY.current = targetY.current;
        if (cursorEl.current) {
          cursorEl.current.style.transform = `translate(${currentX.current}px, ${currentY.current}px)`;
        }
      }
    };

    const animate = () => {
      const lerp = 0.22; // smooth, slightly heavy cursor follow
      currentX.current += (targetX.current - currentX.current) * lerp;
      currentY.current += (targetY.current - currentY.current) * lerp;
      if (cursorEl.current) {
        cursorEl.current.style.transform = `translate(${currentX.current}px, ${currentY.current}px)`;
      }
      rafId.current = window.requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    if (!reduceMotion) {
      rafId.current = window.requestAnimationFrame(animate);
    }

    return () => {
      window.removeEventListener('mousemove', onMove as EventListener);
      if (rafId.current != null) {
        window.cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className={styles.root} aria-hidden="true">
      <div ref={cursorEl} className={`${styles.cursor} ${isHoveringInteractive ? styles.hover : ''}`.trim()}>
        <span className={styles.glyph}>
          {'\u25BA'}
        </span>
      </div>
    </div>
  );
};

export default Cursor;


