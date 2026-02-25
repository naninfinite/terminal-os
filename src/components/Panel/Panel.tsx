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
import { useContextTrigger, type ContextTriggerSource } from '../shared/useContextTrigger';

type PanelScopeId = 'me' | 'you' | 'third' | 'connect';

export type PanelProps = {
  title: string;
  children?: React.ReactNode;
  className?: string;
  /** Scope identifier used by menu routing/focus helpers. */
  scopeId?: PanelScopeId;
  /** Stretch the body to fill the panel instead of centering children. */
  stretchBody?: boolean;
  /** Disable hover/focus lift animation for this panel. */
  disableHover?: boolean;
  /** Hide the standard bracketed header (rare; use sparingly). */
  hideHeader?: boolean;
  /** Optional extra class for the body wrapper. */
  bodyClassName?: string;
  /** Optional hook for notifying parent when this panel becomes active/focused. */
  onActivate?: () => void;
  /** Optional hook for opening scope-level context menu from panel roots. */
  onRequestContextMenu?: (args: {
    scopeId: PanelScopeId;
    origin: 'panel';
    source: ContextTriggerSource;
    x: number;
    y: number;
  }) => void;
};

/**
 * Small panel frame with optional behavior flags:
 * - `stretchBody`: child fills available panel body dimensions.
 * - `disableHover`: suppresses elevation effect in contexts where motion is distracting.
 * - `hideHeader`: removes bracket title bar for custom compositions.
 */
const Panel: React.FC<PanelProps> = ({
  title,
  children,
  className,
  scopeId,
  stretchBody,
  disableHover,
  hideHeader,
  bodyClassName,
  onActivate,
  onRequestContextMenu,
}) => {
  const contextTrigger = useContextTrigger<HTMLElement>({
    disabled: !scopeId || !onRequestContextMenu,
    onOpen: ({ x, y, source }) => {
      if (!scopeId || !onRequestContextMenu) return;
      onRequestContextMenu({
        scopeId,
        origin: 'panel',
        source,
        x,
        y,
      });
    },
  });

  return (
    <section
      // Class composition keeps API surface small while still allowing overrides.
      className={`${styles.panel} ${className ?? ''} ${disableHover ? styles.noHover : ''}`.trim()}
      aria-label={title}
      data-panel-scope={scopeId}
      tabIndex={0}
      onMouseEnter={onActivate}
      onFocusCapture={onActivate}
      onMouseDown={onActivate}
      onContextMenu={contextTrigger.onContextMenu}
      onPointerDown={contextTrigger.onPointerDown}
      onPointerMove={contextTrigger.onPointerMove}
      onPointerUp={contextTrigger.onPointerUp}
      onPointerCancel={contextTrigger.onPointerCancel}
      onClickCapture={contextTrigger.onClickCapture}
      onKeyDown={contextTrigger.onKeyDown}
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
};

export default Panel;
