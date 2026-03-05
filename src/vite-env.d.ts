/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_YOU_API_BASE_URL?: string;
  readonly VITE_CONNECT_SUPABASE_URL?: string;
  readonly VITE_CONNECT_SUPABASE_ANON_KEY?: string;
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
