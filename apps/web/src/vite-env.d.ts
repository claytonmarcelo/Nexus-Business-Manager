/// <reference types="vite/client" />

// Versão injetada pelo build (vite.config.ts), lida do package.json.
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
