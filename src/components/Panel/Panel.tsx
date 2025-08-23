import React from 'react';
import styles from './Panel.module.scss';

export type PanelProps = {
  title: string;
  children?: React.ReactNode;
  className?: string;
};

const Panel: React.FC<PanelProps> = ({ title, children, className }) => {
  return (
    <section className={`${styles.panel} ${className ?? ''}`.trim()} aria-label={title}>
      <header className={styles.header}>[{title}]</header>
      <div className={styles.body}>{children}</div>
    </section>
  );
};

export default Panel;



