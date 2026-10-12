/**
 * Hostinger (Node.js barındırma) için yayın paketi üretir.
 *
 * Çıktı: deploy/hostinger/kaynarmotor-hostinger.zip
 *   package.json, package-lock.json   Hostinger'ın derleme adımı için (bağımlılık yok)
 *   dist/main.cjs                     sunucu: bütün bağımlılıklarıyla tek dosya
 *   dist/public/                      derlenmiş arayüz (sunucu bu klasörü sunar)
 *   dist/package.json, package-lock.json
 *
 * Sunucu tek dosyada toplandığı için barındırma tarafında paket kurulumuna bağlı değildir.
 * Arayüz API'ye kendi adresinden (/api) bağlanacak şekilde derlenir: yerel .env içindeki
 * REACT_APP_API_URL (ör. eski Railway adresi) pakete GİRMEZ.
 *
 * Kullanım (depo kökünden):  node scripts/package-hostinger.cjs   (npm run package:hostinger)
 * Hostinger derleme ayarı:   app_type nest, node 24, output_directory dist,
 *                            build_script build, entry_file main.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');
const out = path.join(root, 'deploy', 'hostinger');
const dist = path.join(out, 'dist');
const zipName = 'kaynarmotor-hostinger.zip';

function run(label, command, args, options = {}) {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
  if (result.status !== 0) {
    console.error(`\nPaketleme durdu: "${label}" başarısız (çıkış kodu ${result.status})`);
    process.exit(1);
  }
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

// 1) Sözdizimi denetimi: hatalı kod pakete girmesin.
console.log('\n> sunucu sözdizimi denetimi');
for (const klasor of ['config', 'middleware', 'routes']) {
  for (const dosya of fs.readdirSync(path.join(backend, klasor)).filter((f) => f.endsWith('.js'))) {
    const r = spawnSync(process.execPath, ['--check', path.join(backend, klasor, dosya)], { stdio: 'inherit' });
    if (r.status !== 0) process.exit(1);
  }
}
run('sunucu sözdizimi (server.js)', process.execPath, ['--check', path.join(backend, 'server.js')], { shell: false });

// 2) Arayüz. Adres göreceli: arayüz ve API aynı sunucudadır. Kabuk değişkeni .env dosyasını ezer.
run('arayüz derlemesi', 'npx', ['react-scripts', 'build'], {
  cwd: frontend,
  env: { ...process.env, REACT_APP_API_URL: '/api', GENERATE_SOURCEMAP: 'false', CI: 'false' },
});
// Pakete girmeyen eski/kullanılmayan dosyalar (arayüz kodunda başvurulmuyor)
const kullanilmayan = new Set(['KaynarMotor.mp4', '_redirects']);
const build = path.join(frontend, 'build');
const kopyala = (kaynak, hedef) => {
  fs.mkdirSync(hedef, { recursive: true });
  // fs.cpSync kullanılmaz: Node 24.4'te yolda "ü" gibi ASCII dışı karakter varsa süreci mesajsız düşürüyor.
  for (const ad of fs.readdirSync(kaynak)) {
    const k = path.join(kaynak, ad);
    const h = path.join(hedef, ad);
    if (fs.statSync(k).isDirectory()) kopyala(k, h);
    else if (!(kaynak === build && kullanilmayan.has(ad))) fs.copyFileSync(k, h);
  }
};
kopyala(build, path.join(dist, 'public'));

// 3) Sunucu: bağımlılıklarıyla birlikte tek dosya.
console.log('\n> sunucu paketi (esbuild)');
const esbuild = require(path.join(backend, 'node_modules', 'esbuild'));
const bundle = esbuild.buildSync({
  entryPoints: [path.join(backend, 'server.js')],
  outfile: path.join(dist, 'main.cjs'),
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
const bundled = Object.keys(bundle.metafile.inputs);
// Taşıma araçları, örnek veri betikleri ve testler sunucuya girmemeli; pg yalnızca geliştirme aracıdır.
const istenmeyen = bundled.filter((f) => /[\\/](scripts|tests)[\\/]|node_modules[\\/]pg[\\/]/.test(f));
if (istenmeyen.length > 0) {
  console.error('Sunucu paketine girmemesi gereken dosyalar var:', istenmeyen.slice(0, 5));
  process.exit(1);
}

// 4) Paket tanımları. Bağımlılık yoktur; kilit dosyası da buna göre boştur.
const version = require(path.join(backend, 'package.json')).version;
const manifest = (extra) => ({ name: 'kaynarmotor-hostinger', version, private: true, ...extra });
const lock = { name: 'kaynarmotor-hostinger', version, lockfileVersion: 3, requires: true, packages: { '': { name: 'kaynarmotor-hostinger', version } } };
const json = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
json(path.join(out, 'package.json'), manifest({ scripts: { build: 'node -e "console.log(\'hazir paket\')"', start: 'node dist/main.cjs' } }));
json(path.join(out, 'package-lock.json'), lock);
json(path.join(dist, 'package.json'), manifest({ main: 'main.cjs', scripts: { start: 'node main.cjs' } }));
json(path.join(dist, 'package-lock.json'), lock);

// 5) Zip. Windows'un kendi tar'ı zip'i ileri eğik çizgili yollarla yazar
//    (PowerShell Compress-Archive ters eğik çizgi kullanır, Linux'ta açılmaz).
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
run('zip', tar, ['-a', '-cf', zipName, 'package.json', 'package-lock.json', 'dist'], { cwd: out, shell: false });

const size = (file) => `${(fs.statSync(file).size / 1048576).toFixed(2)} MB`;
console.log(`\nHazır: ${path.join(out, zipName)} (${size(path.join(out, zipName))})`);
console.log(`  sunucu  dist/main.cjs ${size(path.join(dist, 'main.cjs'))} (${bundled.length} kaynak dosya)`);
console.log('  arayüz  dist/public');
