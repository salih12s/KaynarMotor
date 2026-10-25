import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// API adresi koda `import.meta.env.VITE_API_URL` olarak girer (src/shared/api/istemci). Vite bunu .env dosyasından
// ya da kabuk değişkeninden okur; kabuk değişkeni .env'i ezer (paket betiği `/api` verir).
export default defineConfig({
  plugins: [react()],
  server: { port: 3100, strictPort: true, open: false },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/setupTests.js',
    // Testlerde adres boş: kodun varsayılanı (localhost:5100) kullanılır; yerel .env sonucu değiştirmesin.
    env: { VITE_API_URL: '' },
    // MUI diyalogları jsdom'da yavaştır; ağır bileşen testleri paralel çalışınca 5 sn'lik varsayılan sınır flaky üretir.
    testTimeout: 60000,
    hookTimeout: 60000,
    // CRA'nın Jest ayarı (resetMocks: true) ile aynı: her testten önce sahte fonksiyonlar sıfırlanır.
    mockReset: true,
  },
  build: {
    // Çıktı düzeni CRA ile aynı: backend `/static` klasörünü değişmez önbellekle sunar, duman testi
    // `static/js/main.<özet>.js` bekler.
    outDir: 'build',
    emptyOutDir: true,
    assetsDir: 'static',
    sourcemap: false,
    rollupOptions: {
      output: {
        hashCharacters: 'hex',
        entryFileNames: 'static/js/main.[hash].js',
        chunkFileNames: 'static/js/[name].[hash].js',
        assetFileNames: (varlik) => {
          const ad = varlik.names?.[0] ?? varlik.name ?? '';
          return ad.endsWith('.css') ? 'static/css/[name].[hash][extname]' : 'static/media/[name].[hash][extname]';
        },
      },
    },
  },
});
