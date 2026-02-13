/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOCKWORK_API_BASE?: string;
  readonly VITE_CLOCKWORK_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
