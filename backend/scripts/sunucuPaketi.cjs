/**
 * Sunucuyu (server.js ve bağımlılıkları, .js + .ts birlikte) esbuild ile tek dosyada toplar.
 * İki yerde aynı ayarla kullanılır, böylece "testte çalışan" ile "canlıda çalışan" aynı paket olur:
 *   - scripts/package-hostinger.cjs (kökte): Hostinger yayın paketi
 *   - backend/scripts/testApiPaket.cjs: API testlerini PAKETLENMİŞ sunucuya karşı koşturur
 */
const path = require('node:path');

const BACKEND = path.resolve(__dirname, '..');

function sunucuPaketle(outfile) {
  const esbuild = require(path.join(BACKEND, 'node_modules', 'esbuild'));
  return esbuild.buildSync({
    entryPoints: [path.join(BACKEND, 'server.js')],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node20',
    format: 'cjs',
    banner: {
      js: [
        // Ortam değişkeni verilmemişse üretim modunda açıl (arayüzü sunmak buna bağlı).
        "process.env.NODE_ENV = process.env.NODE_ENV || 'production';",
        // Paylaşımlı barındırmada hesabın süreç/iş parçacığı kotası dardır. Node dosya okuma,
        // sıkıştırma ve rastgele sayı üretimi için varsayılan olarak 4 iş parçacığı açar; kota dolunca
        // süreç HİÇBİR İZ BIRAKMADAN öldürülür (arayüz 503 verir, veritabanı sorguları çalışır).
        // 2026-10-12'de aynı hesaptaki crm-mefateknik.com'da ölçüldü: 4 ile düşüyor, 1 ile çalışıyor.
        // Değer ilk kullanımdan önce verilmek zorunda olduğu için dosyanın en başındadır.
        "process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '1';",
      ].join('\n'),
    },
    legalComments: 'none',
    logLevel: 'warning',
    metafile: true,
  });
}

module.exports = { sunucuPaketle };
