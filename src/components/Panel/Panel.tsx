/**
 * `Panel` is the basic "window" primitive used across the desktop UI.
 * It provides a framed container with a header label and a flexible body area.
 *
 * Notes:
 * - `stretchBody` is used when the child needs to fill the available space (e.g. canvas).
 * - `disableHover` is used on screens where hover animation feels wrong (e.g. landing).
 */
import React from 'react';
import styles from './Panel.module.scss';

export type PanelProps = {
  title: string;
  children?: React.ReactNode;
  className?: string;
  /** Stretch the body to fill the panel instead of centering children. */
  stretchBody?: boolean;
  /** Disable hover/focus lift animation for this panel. */
  disableHover?: boolean;
  /** Hide the standard bracketed header (rare; use sparingly). */
  hideHeader?: boolean;
  /** Optional extra class for the body wrapper. */
  bodyClassName?: string;
};

const Panel: React.FC<PanelProps> = ({
  title,
  children,
  className,
  stretchBody,
  disableHover,
  hideHeader,
  bodyClassName,
}) => (
  <section
    className={`${styles.panel} ${className ?? ''} ${disableHover ? styles.noHover : ''}`.trim()}
    aria-label={title}
  >
    <header className={`${styles.header} ${hideHeader ? styles.hiddenHeader : ''}`.trim()}>
      [{title}]
    </header>
    <div
      className={`${styles.body} ${stretchBody ? styles.bodyStretch : ''} ${bodyClassName ?? ''}`.trim()}
    >
      {children}
    </div>
  </section>
);

export default Panel;



