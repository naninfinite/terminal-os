import React from 'react';
import styles from './Panel.module.scss';

export type PanelProps = {
  title: string;
  children?: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
  bodyLayout?: 'center' | 'stretch';
};

const Panel: React.FC<PanelProps> = ({ title, children, className, headerActions, bodyLayout = 'center' }) => {
  return (
    <section className={`${styles.panel} ${className ?? ''}`.trim()} aria-label={title}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.headerTitle}>[{title}]</div>
          {headerActions ? <div className={styles.headerActions}>{headerActions}</div> : null}
        </div>
      </header>
      <div className={`${styles.body} ${bodyLayout === 'stretch' ? styles.bodyStretch : styles.bodyCenter}`}>{children}</div>
    </section>
  );
};

export default Panel;



