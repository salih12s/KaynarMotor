/**
 * Hostinger paketinin DUMAN testi: üretilen zip yeni bir klasöre açılır ve Hostinger'da çalışacağı
 * gibi başlatılır (node dist/main.cjs, yalnızca ortam değişkenleriyle, üretim modu). Sonra uç noktalar
 * ve arayüz dosyaları denetlenir.
 *
 * Çalıştırma (depo kökünde `npm run package:hostinger` yapıldıktan sonra, backend klasöründe):
 *   node --test tests/smoke/paket.smoke.test.js
 * Gerekli: yerel MariaDB (.env.mariadb.kopya içindeki bağlantı bilgileri kullanılır).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ZIP = path.resolve(__dirname, '..', '..', '..', 'deploy', 'hostinger', 'kaynarmotor-hostinger.zip');
const ENV_DOSYASI = path.resolve(__dirname, '..', '..', '.env.mariadb.kopya');
const PORT = 5399;
const URL = `http://127.0.0.1:${PORT}`;

const env = Object.fromEntries(fs.readFileSync(ENV_DOSYASI, 'utf8').split(/\r?\n/).map((l) => /^([A-Z_]+)=(.*)$/.exec(l)).filter(Boolean).map((m) => [m[1], m[2]]));

test('paket: zip açılır, üretim modunda başlar, arayüz ve API çalışır', { timeout: 120000 }, async (t) => {
  assert.ok(fs.existsSync(ZIP), `önce paket üretin: ${ZIP}`);
  const klasor = fs.mkdtempSync(path.join(os.tmpdir(), 'kaynar-paket-'));
  const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
  const ac = spawnSync(tar, ['-xf', ZIP, '-C', klasor]);
  assert.equal(ac.status, 0, 'zip açılamadı');

  // Hostinger'ın yaptığı gibi: yalnızca ortam değişkenleri (NODE_ENV BİLEREK verilmez: paket kendisi production olur)
  const calisanEnv = {
    PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TZ: 'UTC',
    PORT: String(PORT), DB_HOST: '127.0.0.1', DB_PORT: env.DB_PORT, DB_NAME: env.DB_NAME, DB_USER: env.DB_USER, DB_PASSWORD: env.DB_PASSWORD,
    JWT_SECRET: env.JWT_SECRET, FRONTEND_URL: URL,
  };
  const log = [];
  const cocuk = spawn(process.execPath, ['dist/main.cjs'], { cwd: klasor, env: calisanEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  cocuk.stdout.on('data', (d) => log.push(String(d)));
  cocuk.stderr.on('data', (d) => log.push(String(d)));
  t.after(() => { cocuk.kill(); try { fs.rmSync(klasor, { recursive: true, force: true }); } catch { /* geçici klasör */ } });

  // Hazır olana kadar bekle
  let hazir = false;
  for (let i = 0; i < 100 && !hazir; i++) {
    try { hazir = (await fetch(`${URL}/api/health`)).ok; } catch { await new Promise((r) => setTimeout(r, 200)); }
  }
  assert.ok(hazir, `sunucu başlamadı:\n${log.join('')}`);

  const al = async (yol, secenek) => { const r = await fetch(URL + yol, secenek); return { r, metin: await r.text() }; };

  // Sağlık
  assert.equal((await al('/api/health')).r.status, 200);
  const vt = await al('/api/health/database');
  assert.equal(vt.r.status, 200, `veritabanı sağlığı: ${vt.metin}`);

  // Arayüz: ana sayfa, derleme dosyaları, SPA yönlendirmesi
  const ana = await al('/');
  assert.equal(ana.r.status, 200);
  assert.match(ana.metin, /<div id="root">/);
  assert.equal(ana.r.headers.get('cache-control'), 'no-cache', 'index.html önbelleğe alınmamalı');
  const js = /\/static\/js\/main\.[a-z0-9]+\.js/.exec(ana.metin);
  assert.ok(js, 'index.html derlenmiş JS dosyasına bağlanmalı');
  const jsYanit = await al(js[0]);
  assert.equal(jsYanit.r.status, 200);
  assert.match(jsYanit.r.headers.get('cache-control'), /immutable/, 'içerik özetli dosya kalıcı önbelleğe alınmalı');
  assert.ok(!jsYanit.metin.includes('railway.app'), 'pakete eski Railway adresi girmemiş olmalı');
  assert.ok(!jsYanit.metin.includes('localhost:5100'), 'pakete yerel geliştirme adresi girmemiş olmalı');
  for (const sayfa of ['/vitrin', '/giris', '/is-emirleri', '/s/abcdef']) {
    const s = await al(sayfa);
    assert.equal(s.r.status, 200, `${sayfa} arayüz sayfasına düşmeli`);
    assert.match(s.metin, /<div id="root">/);
  }
  assert.equal((await al('/KaynarMotor.png')).r.status, 200);
  assert.equal((await al('/KaynarMotorYeniVideo.mp4')).r.status, 200);
  assert.equal((await al('/KaynarMotor.mp4')).r.status, 404, 'kullanılmayan eski video pakete girmemeli');

  // API: bilinmeyen adres arayüze değil JSON 404'e düşer; yetkisiz 401
  const yok = await al('/api/yok-boyle-bir-uc');
  assert.equal(yok.r.status, 404);
  assert.equal(JSON.parse(yok.metin).message, 'Bulunamadı');
  assert.equal((await al('/api/musteriler')).r.status, 401);

  // Herkese açık vitrin ucu gerçek veriyi döndürür
  const segment = await al('/api/vitrin/segmentler');
  assert.equal(segment.r.status, 200);
  assert.ok(JSON.parse(segment.metin).length >= 8);
  const ilanlar = JSON.parse((await al('/api/vitrin?kategori=motor')).metin);
  assert.ok(Array.isArray(ilanlar) && ilanlar.length > 0, 'yayındaki motor ilanları dönmeli');
  const gorsel = await fetch(`${URL}/api/vitrin/gorsel/${ilanlar[0].kapak_gorsel_id}`);
  assert.equal(gorsel.status, 200);
  assert.match(gorsel.headers.get('content-type'), /^image\//);

  // CORS: bilinen kaynak geçer, bilinmeyen reddedilir; aynı kaynaktan yazma isteği (Origin başlıklı) çalışır
  const baskaKaynak = await fetch(`${URL}/api/vitrin/segmentler`, { headers: { Origin: 'https://kotu-site.example' } });
  assert.notEqual(baskaKaynak.status, 200, 'bilinmeyen kaynak reddedilmeli');
  const ayniKaynak = await fetch(`${URL}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: URL }, body: JSON.stringify({ kullanici_adi: 'yok', sifre: 'x' }) });
  assert.equal(ayniKaynak.status, 401, 'aynı kaynaktan POST CORS yüzünden düşmemeli');

  // Güvenlik başlıkları
  assert.equal(ana.r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(ana.r.headers.get('x-powered-by'), null, 'Express imzası gizli olmalı (helmet)');

  // Süreç ayarı: iş parçacığı havuzu 1 (Hostinger kotası)
  assert.ok(log.join('').includes('çalışıyor'), 'sunucu açılış satırı');
});
