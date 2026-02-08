/**
 * `ME` is the profile/identity panel on desktop.
 *
 * Responsibilities:
 * - Render a profile image from `/public/assets`.
 * - Provide a deterministic inline SVG fallback if the image is missing.
 * - Show compact text identity beneath the image.
 */
import React from 'react';
import styles from './ME.module.scss';

/**
 * Converts image-load failures into a tiny inline SVG so this panel never
 * renders a broken-image icon.
 *
 * Guard note:
 * - `data-fallback` prevents repeated `onError` loops if the fallback also fails.
 */
const applyImageFallback = (el: HTMLImageElement) => {
  if (el.dataset.fallback === '1') return;
  el.dataset.fallback = '1';
  el.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>
       <rect width='100%' height='100%' fill='black'/>
       <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#00ff66' font-family='monospace' font-size='10'>NO IMAGE</text>
     </svg>`
  );
};

const ME: React.FC = () => {
  return (
    <div className={styles.root}>
      <img
        className={styles.img}
        src="/assets/me.png"
        alt="Profile"
        onError={(e) => applyImageFallback(e.currentTarget)}
      />
      <div className={styles.text}>
        TERMINAL-OS <br/> aaronakrong

      </div>
    </div>
  );
};

export default ME;


