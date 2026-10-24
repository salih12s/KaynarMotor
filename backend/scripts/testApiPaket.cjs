/**
 * API testlerini PAKETLENMİŞ sunucuya (esbuild çıktısı, canlıda çalışacak olanın aynısı) karşı koşturur.
 *
 * Neden: normal `npm run test:api` sunucuyu kaynak koddan, tsx ile başlatır. Canlıya ise esbuild paketi gider.
 * İkisinin .ts / .js birlikte çalışma biçimi (içe aktarma uyumu, varsayılan dışa aktarım vb.) farklı olabilir;
 * bu betik "testler yeşil ama paket farklı davranıyor" ihtimalini kapatır. Her canlıya çıkıştan önce çalıştırın.
 *
 *   cd backend; set -a; . ./.env.mariadb.test; set +a; npm run test:api:paket
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { sunucuPaketle } = require('./sunucuPaketi.cjs');

const BACKEND = path.resolve(__dirname, '..');
const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'kaynar-api-paket-'));
const giris = path.join(klasor, 'main.cjs');

console.log('> sunucu paketleniyor (esbuild)');
sunucuPaketle(giris);
console.log(`> API testleri paketlenmiş sunucuya karşı koşuyor: ${giris}`);

const sonuc = spawnSync(
  process.execPath,
  [
    '--import',
    'tsx',
    '--test',
    '--test-concurrency=1',
    ...fs
      .readdirSync(path.join(BACKEND, 'tests', 'api'))
      .filter((a) => a.endsWith('.test.js'))
      .map((a) => path.join('tests', 'api', a)),
  ],
  {
    cwd: BACKEND,
    stdio: 'inherit',
    env: { ...process.env, SUNUCU_GIRIS: giris },
  },
);

try {
  fs.unlinkSync(giris);
  fs.rmdirSync(klasor);
} catch {
  /* geçici klasör */
}
process.exit(sonuc.status === null ? 1 : sonuc.status);
