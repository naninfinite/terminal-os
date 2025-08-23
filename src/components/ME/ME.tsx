import React from 'react';
import styles from './ME.module.scss';

const ME: React.FC = () => {
  return (
    <div className={styles.root}>
      <img
        className={styles.img}
        src="/assets/me.png"
        alt="Profile"
        onError={(e) => {
          const el = e.currentTarget;
          if (el.dataset.fallback === '1') return;
          el.dataset.fallback = '1';
          el.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
            `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>
               <rect width='100%' height='100%' fill='black'/>
               <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#00ff66' font-family='monospace' font-size='10'>NO IMAGE</text>
             </svg>`
          );
        }}
      />
      <div className={styles.text}>
        TERMINAL-OS <br/> aaronakrong

      </div>
    </div>
  );
};

export default ME;



