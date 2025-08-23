import React from 'react';
import styles from './CONNECT.module.scss';

const ASCII = String.raw`
  ____  _   _  ___  _   _  ____ _____ _____ _____ 
 / ___|| | | |/ _ \| | | |/ ___| ____|_   _| ____|
 \___ \| | | | | | | | | | |  _|  _|   | | |  _|  
  ___) | |_| | |_| | |_| | |_| | |___  | | | |___ 
 |____/ \___/ \___/ \___/ \____|_____| |_| |_____|
`;

const CONNECT: React.FC = () => {
  return <pre className={styles.root}>{ASCII}</pre>;
};

export default CONNECT;




