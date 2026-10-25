import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Aşama 1 (docs/VITE-TS-YOL-HARITASI.md): kod CRA'dan kalan `process.env.REACT_APP_API_URL` adını kullanmaya devam eder
// (testler hâlâ Jest'te; Jest `import.meta`'yı ayrıştıramaz). Değer derleme anında yerine konur.
// Kabuk değişkeni .env dosyasını ezer (paket betiği `/api` verir).
export default defineConfig(({ mode }) => {
  const dosyaOrtami = loadEnv(mode, process.cwd(), 'REACT_APP_');
  const apiUrl = process.env.REACT_APP_API_URL ?? dosyaOrtami.REACT_APP_API_URL ?? '';

  return {
    plugins: [react()],
    define: {
      'process.env.REACT_APP_API_URL': JSON.stringify(apiUrl),
    },
    server: { port: 3100, strictPort: true, open: false },
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
