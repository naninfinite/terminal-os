import React from 'react';
import styles from './Panel.module.scss';

export type PanelProps = {
  title: string;
  children?: React.ReactNode;
  className?: string;
  stretchBody?: boolean;
  disableHover?: boolean;
  hideHeader?: boolean;
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



