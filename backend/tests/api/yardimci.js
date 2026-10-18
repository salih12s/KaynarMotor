/*
 * API testleri için ortak yardımcılar.
 *
 * Bu testler GERÇEK sunucuyu (server.js) ve GERÇEK MariaDB'yi kullanır. Üretim verisine
 * zarar vermemek için bağlantı koruması vardır: DB_HOST yerel, DB_NAME "_test" ya da "_fake"
 * ile bitmelidir; aksi hâlde testler hiçbir şey yapmadan durur.
 *
 * Çalıştırma (backend klasöründe), örnek:
 *   DB_HOST=127.0.0.1 DB_PORT=3399 DB_NAME=kaynar_fake DB_USER=sahte DB_PASSWORD=sahte-pw \
 *   ADMIN_INITIAL_PASSWORD=Sahte123! npm run test:api
 *
 * Her test kendi kayıtlarını benzersiz bir sonekle oluşturur; başkasının verisini silmez/değiştirmez.
 */
const { spawn } = require('child_process');
const http = require('http');
const net = require('net');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..', '..');

// Sunucuyu başlatan komut. Varsayılan: kaynak kod, tsx ile (.js ve .ts birlikte çalışır).
// SUNUCU_GIRIS=<main.cjs yolu> verilirse bunun yerine esbuild ile PAKETLENMİŞ sunucu çalışır
// (canlıda çalışacak olan; `npm run test:api:paket` bunu kullanır).
function sunucuArgumanlari() {
  if (process.env.SUNUCU_GIRIS) return [path.resolve(process.env.SUNUCU_GIRIS)];
  return ['--import', 'tsx', 'server.js'];
}

function baglantiKorumasi() {
  const host = process.env.DB_HOST || '';
  const ad = process.env.DB_NAME || '';
  if (!['127.0.0.1', 'localhost'].includes(host) || !/_(test|fake)$/.test(ad)) {
    throw new Error(`Güvenlik: bu testler yalnızca yerel ve "_test"/"_fake" ile biten bir veritabanında çalışır (şu an host="${host}", db="${ad}").`);
  }
  if (!process.env.ADMIN_INITIAL_PASSWORD) throw new Error('ADMIN_INITIAL_PASSWORD tanımlı değil (test ortamındaki admin şifresi).');
}

const bosPort = () => new Promise((coz, red) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => coz(port)); });
  s.on('error', red);
});

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function sunucuBaslat() {
  baglantiKorumasi();
  const port = await bosPort();
  const cocuk = spawn(process.execPath, sunucuArgumanlari(), {
    cwd: BACKEND,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', JWT_SECRET: process.env.JWT_SECRET || 'api-test-jwt-sirri' },
    stdio: 'ignore',
  });
  const url = `http://127.0.0.1:${port}`;
  const api = istemci(url);
  // Sunucu açılır, şema ve admin arka planda kurulur: admin girişi çalışana kadar bekle.
  let admin = null;
  for (let i = 0; i < 120 && !admin; i++) {
    try {
      const r = await api('POST', '/api/auth/login', { kullanici_adi: 'admin', sifre: process.env.ADMIN_INITIAL_PASSWORD });
      if (r.durum === 200) admin = r.govde.token;
    } catch { /* sunucu henüz dinlemiyor */ }
    if (!admin) await bekle(500);
  }
  if (!admin) { cocuk.kill(); throw new Error('Sunucu/admin hazır olmadı (DB ayarlarını ve ADMIN_INITIAL_PASSWORD değerini kontrol edin).'); }
  return { url, api, admin, durdur: () => cocuk.kill() };
}

// Veritabanına ULAŞAMAYAN bir sunucu (kapalı porta bağlanır). DB kopunca uçların yanıt verip vermediğini sınar.
async function dbsizSunucuBaslat() {
  baglantiKorumasi();
  const port = await bosPort();
  const kapaliDbPort = await bosPort(); // boş port = orada dinleyen yok
  const jwtSirri = process.env.JWT_SECRET || 'api-test-jwt-sirri';
  const cocuk = spawn(process.execPath, sunucuArgumanlari(), {
    cwd: BACKEND,
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test', JWT_SECRET: jwtSirri, DB_PORT: String(kapaliDbPort) },
    stdio: 'ignore',
  });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(url + '/api/health')).ok) break; } catch { /* henüz dinlemiyor */ }
    await bekle(250);
  }
  const jwt = require(path.join(BACKEND, 'node_modules', 'jsonwebtoken'));
  const token = jwt.sign({ id: 1, rol: 'admin', kullanici_adi: 'admin', ad_soyad: 'Admin' }, jwtSirri);
  return { url, api: istemci(url), token, durdur: () => cocuk.kill() };
}

// fetch üzerine ince sarmalayıcı: { durum, govde (JSON ya da metin), basliklar }
function istemci(url) {
  return async (yontem, yol, govde, token, ek = {}) => {
    const r = await fetch(url + yol, {
      method: yontem,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(ek.basliklar || {}) },
      body: govde === undefined ? undefined : (typeof govde === 'string' ? govde : JSON.stringify(govde)),
    });
    const metin = await r.text();
    let j; try { j = JSON.parse(metin); } catch { j = metin; }
    return { durum: r.status, govde: j, basliklar: r.headers };
  };
}

// fetch'in yasakladığı başlıklar için (Origin) ham http isteği
const hamIstek = (url, yontem, yol, basliklar = {}) => new Promise((coz, red) => {
  const u = new URL(url + yol);
  const r = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: yontem, headers: basliklar }, (res) => {
    let veri = ''; res.on('data', (d) => (veri += d)); res.on('end', () => coz({ durum: res.statusCode, govde: veri }));
  });
  r.on('error', red); r.end();
});

// Benzersiz kullanıcı oluştur (admin ile), yetkileri ver, giriş yap
async function kullaniciOlustur(api, admin, ad, rol, yetkiler = {}) {
  const k = await api('POST', '/api/auth/users', { kullanici_adi: ad, sifre: `${ad}-sifre1`, ad_soyad: ad, rol }, admin);
  if (k.durum !== 201) throw new Error(`kullanıcı oluşturulamadı (${ad}): ${k.durum} ${JSON.stringify(k.govde)}`);
  if (Object.keys(yetkiler).length) await api('PATCH', `/api/auth/users/${k.govde.id}/yetkiler`, yetkiler, admin);
  const g = await api('POST', '/api/auth/login', { kullanici_adi: ad, sifre: `${ad}-sifre1` });
  return { id: k.govde.id, token: g.govde.token };
}

module.exports = { sunucuArgumanlari, sunucuBaslat, dbsizSunucuBaslat, istemci, hamIstek, kullaniciOlustur, baglantiKorumasi };
