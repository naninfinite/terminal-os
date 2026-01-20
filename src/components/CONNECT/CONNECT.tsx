import React from 'react';
import styles from './CONNECT.module.scss';

const ASCII = String.raw`
   ____ ___  _   _ _   _ _____ ____ _____ 
 / ___/ _ \| \ | | \ | | ____/ ___|_   _|
| |  | | | |  \| |  \| |  _|| |     | |  
| |__| |_| | |\  | |\  | |__| |___  | |  
 \____\___/|_| \_|_| \_|_____\____| |_|  
`;

const CONNECT: React.FC = () => {
  return <pre className={styles.root}>{ASCII}</pre>;
};

export default CONNECT;




