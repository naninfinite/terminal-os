import React from 'react';
import styles from './CONNECT.module.scss';

const ASCII = String.raw`
 ___ 
|__ \
  / /
 |_| 
 (_) 
`;

const CONNECT: React.FC = () => {
  return <pre className={styles.root}>{ASCII}</pre>;
};

export default CONNECT;




