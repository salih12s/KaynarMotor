/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API adresi (örn. http://localhost:5100/api). Paket derlemesinde `/api` (aynı sunucu). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
