import { createRetriableLazyImport } from '../../utils/lazyImport';

export const loadDesktopRuntime = createRetriableLazyImport(
  () => import('./DesktopRuntime')
);
