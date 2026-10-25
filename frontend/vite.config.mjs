import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Aşama 1-2 (docs/VITE-TS-YOL-HARITASI.md): kod CRA'dan kalan `process.env.REACT_APP_API_URL` adını kullanmaya devam eder;
// `import.meta.env`'e geçiş aşama 3'te. Değer derleme (ve test) anında yerine konur.
// Kabuk değişkeni .env dosyasını ezer (paket betiği `/api` verir).
export default defineConfig(({ mode }) => {
  const dosyaOrtami = loadEnv(mode, process.cwd(), 'REACT_APP_');
  // Testlerde ortam değişkeni boş: kodun varsayılan adresi (localhost:5100) kullanılır; yerel .env sonucu değiştirmesin.
  const apiUrl = mode === 'test' ? '' : (process.env.REACT_APP_API_URL ?? dosyaOrtami.REACT_APP_API_URL ?? '');

  return {
    plugins: [react()],
    define: {
      'process.env.REACT_APP_API_URL': JSON.stringify(apiUrl),
    },
    server: { port: 3100, strictPort: true, open: false },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: 'src/setupTests.js',
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
  };
});
