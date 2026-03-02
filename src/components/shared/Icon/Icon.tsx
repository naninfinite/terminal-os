import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type React from 'react';
import styles from './Icon.module.scss';
import { getFontAwesomeIcon, type AppIconName } from './fontAwesomeIcons';

const SIZE_CLASS_BY_TOKEN = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
} as const;

export type IconSize = keyof typeof SIZE_CLASS_BY_TOKEN;

export type IconProps = {
  name: AppIconName;
  className?: string;
  fixedWidth?: boolean;
  label?: string;
  size?: IconSize;
  title?: string;
};

const Icon: React.FC<IconProps> = ({
  name,
  className,
  fixedWidth = false,
  label,
  size = 'md',
  title,
}) => {
  const decorative = !label;
  const resolvedClassName = [styles.root, SIZE_CLASS_BY_TOKEN[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <FontAwesomeIcon
      aria-hidden={decorative}
      aria-label={decorative ? undefined : label}
      className={resolvedClassName}
      fixedWidth={fixedWidth}
      icon={getFontAwesomeIcon(name)}
      role={decorative ? undefined : 'img'}
      title={title}
    />
  );
};

export default Icon;
