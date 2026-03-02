import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faAddressCard as faAddressCardRegular,
  faFile as faFileRegular,
  faFolder as faFolderRegular,
} from '@fortawesome/free-regular-svg-icons';
import {
  faCameraRetro,
  faFilm,
} from '@fortawesome/free-solid-svg-icons';

export const FONT_AWESOME_ICONS = {
  contact: faAddressCardRegular,
  file: faFileRegular,
  folder: faFolderRegular,
  image: faCameraRetro,
  video: faFilm,
} satisfies Record<string, IconDefinition>;

export type AppIconName = keyof typeof FONT_AWESOME_ICONS;

export const getFontAwesomeIcon = (name: AppIconName): IconDefinition =>
  FONT_AWESOME_ICONS[name];
























/*import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

import {
  faAddressCard,
  faArrowRotateLeft,
  faBars,
  faCircleInfo,
  faDownload,
  faEllipsis,
  faEnvelope,
  faFileLines,
  faFolder,
  faGear,
  faHouse,
  faImage,
  faMagnifyingGlass,
  faMinus,
  faTrashCan,
  faTriangleExclamation,
  faUpload,
  faUser,
  faVideo,
  faWindowMaximize,
  faWindowRestore,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

export const FONT_AWESOME_ICONS = {
  close: faXmark,
  contact: faAddressCard,
  download: faDownload,
  file: faFileLines,
  folder: faFolder,
  home: faHouse,
  image: faImage,
  info: faCircleInfo,
  mail: faEnvelope,
  maximize: faWindowMaximize,
  menu: faBars,
  minimize: faMinus,
  more: faEllipsis,
  reset: faArrowRotateLeft,
  restore: faWindowRestore,
  search: faMagnifyingGlass,
  settings: faGear,
  trash: faTrashCan,
  upload: faUpload,
  user: faUser,
  video: faVideo,
  warning: faTriangleExclamation,
} satisfies Record<string, IconDefinition>;

export type AppIconName = keyof typeof FONT_AWESOME_ICONS;

export const getFontAwesomeIcon = (name: AppIconName): IconDefinition => FONT_AWESOME_ICONS[name];
*/
