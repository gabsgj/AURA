/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN?: string;
  readonly VITE_DEMO_MODE?: string; // "true"/"false"
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
