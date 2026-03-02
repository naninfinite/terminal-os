import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faAddressCard as faAddressCardRegular,
  faFile as faFileRegular,
  faFolder as faFolderRegular,
  faHouse as faHouseRegular,
  faWindowMinimize as faWindowMinimizeRegular,
} from '@fortawesome/free-regular-svg-icons';
import {
  faBriefcase,
  faCameraRetro,
  faExpand,
  faFilm,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

const faBilibiliBrand = {
  prefix: 'fab',
  iconName: 'bilibili',
  icon: [
    640,
    512,
    [],
    'e3d9',
    'M124.2 167.8c-10.6 0-19.2 8.6-19.2 19.2s8.6 19.2 19.2 19.2 19.2-8.6 19.2-19.2-8.6-19.2-19.2-19.2zm82.5 0c-10.6 0-19.2 8.6-19.2 19.2s8.6 19.2 19.2 19.2 19.2-8.6 19.2-19.2-8.6-19.2-19.2-19.2zm304.7-89.1c-10.6-9.5-25.6-11.5-38.3-5.2L392 114.1l-35.5-33.4c-20.8-19.4-54.9-19.4-75.7 0l-35.5 33.4-81.1-40.6c-12.7-6.3-27.7-4.3-38.3 5.2s-14.3 24.2-9.4 37.7l15.8 43.5H113c-35.3 0-64 28.7-64 64v120.5c0 35.3 28.7 64 64 64h411.1c35.3 0 64-28.7 64-64V224c0-35.3-28.7-64-64-64h-19.2l15.8-43.5c4.9-13.5 1.2-28.2-9.3-37.8zM245.4 156.9c4.6 0 9-1.7 12.5-4.8l45.2-42.7c7.7-7.2 20-7.2 27.7 0l45.2 42.7c3.5 3.1 7.9 4.8 12.5 4.8 2.9 0 5.9-.7 8.5-2 20-9.3 77.7-36.5 92.4-43.5l-16.3 44.7c-2.1 5.7-1.2 12.1 2.4 17.1 3.6 5 9.4 7.9 15.6 7.9h32.1c14.1 0 25.6 11.5 25.6 25.6v117.3c0 14.1-11.5 25.6-25.6 25.6H113c-14.1 0-25.6-11.5-25.6-25.6V206.7c0-14.1 11.5-25.6 25.6-25.6h32.1c6.1 0 11.9-3 15.6-7.9 3.6-5 4.5-11.4 2.4-17.1l-16.3-44.7c14.7 7 72.4 34.2 92.4 43.5 2.6 1.3 5.5 2 8.5 2zM238.1 274c-8.2-6.5-20.2-5.1-26.7 3.2-12.8 16-54.2 52.9-98.3 52.9-10.6 0-19.2 8.6-19.2 19.2s8.6 19.2 19.2 19.2c60.6 0 111.1-45 128.2-66.7 6.6-8.4 5.1-20.3-3.2-27.8zm175.8-16c-8.3-6.5-20.2-5.1-26.7 3.2-17.1 21.7-67.7 66.7-128.2 66.7-10.6 0-19.2 8.6-19.2 19.2s8.6 19.2 19.2 19.2c76.9 0 139.1-55.2 157.9-79.2 6.5-8.2 5.1-20.1-3-26.6z',
  ],
} as IconDefinition;

export const FONT_AWESOME_ICONS = {
  close: faXmark,
  contact: faAddressCardRegular,
  expand: faExpand,
  file: faFileRegular,
  folder: faFolderRegular,
  home: faHouseRegular,
  image: faCameraRetro,
  media: faBilibiliBrand,
  minimize: faWindowMinimizeRegular,
  projects: faBriefcase,
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
