/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Injected from vite.config (CLOCKWORK_PATH env). Base path for API, e.g. /__clockwork. */
  readonly CLOCKWORK_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
