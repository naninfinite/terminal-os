/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YOU_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __TERMINAL_OS_LANDING__?: {
    consumeEnterRequest: () => boolean;
    markInteractive: () => void;
  };
}
