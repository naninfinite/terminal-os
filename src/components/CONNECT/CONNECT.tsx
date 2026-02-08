/**
 * `CONNECT` renders a lightweight ASCII banner panel.
 *
 * Why this component is intentionally simple:
 * - It acts as a low-cost visual anchor in the 2x2 desktop grid.
 * - It avoids interactive logic so the panel remains stable/responsive.
 * - Styling is delegated to `CONNECT.module.scss` to keep markup minimal.
 */
import React, { useEffect } from 'react';
import styles from './CONNECT.module.scss';

/**
 * Static ASCII payload.
 *
 * `String.raw` preserves backslashes and spacing exactly as typed, which keeps
 * the terminal-style glyph alignment stable across builds.
 */
export const ASCII = String.raw`
   ____ ___  _   _ _   _ _____ ____ _____ 
 / ___/ _ \| \ | | \ | | ____/ ___|_   _|
| |  | | | |  \| |  \| |  _|| |     | |  
| |__| |_| | |\  | |\  | |__| |___  | |  
 \____\___/|_| \_|_| \_|_____\____| |_|  
`;

/**
 * Renders the banner in a `<pre>` so whitespace and line breaks remain
 * deterministic, matching the intended terminal aesthetic.
 */
const CONNECT: React.FC = () => {
  useEffect(() => {
    const onCopyBanner = async () => {
      try {
        if (!navigator.clipboard) return;
        await navigator.clipboard.writeText(ASCII);
      } catch {
        // Clipboard permissions can fail silently in some browser contexts.
      }
    };

    window.addEventListener('terminalos:connect:copy-banner', onCopyBanner as EventListener);
    return () => window.removeEventListener('terminalos:connect:copy-banner', onCopyBanner as EventListener);
  }, []);

  return <pre className={styles.root}>{ASCII}</pre>;
};

export default CONNECT;


