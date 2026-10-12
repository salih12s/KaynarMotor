/**
 * Karşılaştırma (parity) testlerinin ortak altyapısı.
 *
 * İki sunucu aynı canlı-veri kopyasıyla yan yana çalışır:
 *   - referans: ESKİ kod (PostgreSQL)  — PG_REF_DIR içindeki backend (örn. git worktree)
 *   - yeni:     bu depodaki kod (MariaDB)
 * Aynı istekler ikisine de atılır, yanıtlar kıyaslanır. Veritabanları yerel ve canlıdan
 * bağımsızdır (bkz. scripts/mariadb/yedektenYukle.js).
 *
 * Gerekli ortam: PG_REF_DIR (eski kodun backend klasörü), .env.pg.ref ve .env.mariadb.kopya.
 */
const { spawn, execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const BACKEND = path.resolve(__dirname, '..', '..');
const PG_REF_DIR = process.env.PG_REF_DIR;
const SIFRE = 'Parity-1234';

const SUNUCULAR = {
  ref: { ad: 'ref(PG)', port: 5301, dizin: PG_REF_DIR, env: path.join(BACKEND, '.env.pg.ref') },
  yeni: { ad: 'yeni(MariaDB)', port: 5302, dizin: BACKEND, env: path.join(BACKEND, '.env.mariadb.kopya') },
};

const hepsiYetki = {
  aksesuar_yetkisi: true, motor_satis_yetkisi: true, eticaret_yetkisi: true, servis_yetkisi: true,
  aksesuar_stok_yetkisi: true, yedek_parca_yetkisi: true, motor_vitrin_yetkisi: true, aksesuar_vitrin_yetkisi: true,
  liste_fiyati_gor: true, alis_fiyati_gor: true, satis_fiyati_gor: true, kar_gor: true, musteri_gor: true, satis_gecmisi_gor: true,
};

// Test kullanıcıları (id'ler 9000+; gerçek kayıtlarla çakışmaz)
const KULLANICILAR = [
  { id: 9001, kullanici_adi: 'p_admin', rol: 'admin', ad_soyad: 'Parity Admin' },
  { id: 9002, kullanici_adi: 'p_personel', rol: 'personel', ad_soyad: 'Parity Personel', ...hepsiYetki },
  { id: 9003, kullanici_adi: 'p_kisitli', rol: 'personel', ad_soyad: 'Parity Kisitli' },
  { id: 9004, kullanici_adi: 'p_yatirimci', rol: 'yatirimci', ad_soyad: 'Parity Yatirimci' },
  { id: 9005, kullanici_adi: 'p_yat_vitrin', rol: 'yatirimci', ad_soyad: 'Parity Yatirimci Vitrin', liste_fiyati_gor: true },
  { id: 9006, kullanici_adi: 'p_muhasebeci', rol: 'muhasebeci', ad_soyad: 'Parity Muhasebeci' },
  { id: 9007, kullanici_adi: 'p_servis', rol: 'personel', ad_soyad: 'Parity Servis', servis_yetkisi: true },
  { id: 9008, kullanici_adi: 'p_vitrin', rol: 'personel', ad_soyad: 'Parity Vitrin', motor_vitrin_yetkisi: true, aksesuar_vitrin_yetkisi: true },
];

const YETKI_KOLONLARI = Object.keys(hepsiYetki);

function envOku(dosya) {
  const o = {};
  for (const satir of fs.readFileSync(dosya, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z_]+)=(.*)$/.exec(satir);
    if (m) o[m[1]] = m[2];
  }
  return o;
}

/** İki veritabanını da canlı yedekten sıfırlar (önceki koşuların günlük/kayıt birikimi kalmasın). */
function veritabanlariniSifirla() {
  const yukle = (env, ...ek) => execFileSync(process.execPath, ['scripts/mariadb/yedektenYukle.js', '--env', env, ...ek], { cwd: BACKEND, stdio: 'pipe' });
  yukle(SUNUCULAR.ref.env, '--hedef', 'pg');
  yukle(SUNUCULAR.yeni.env);
}

/** İki veritabanına da test kullanıcılarını yazar ve yatırımcı motorlarını test yatırımcısına bağlar. */
async function veritabanlariniHazirla() {
  veritabanlariniSifirla();
  const hash = await bcrypt.hash(SIFRE, 4);
  const kolonlar = ['id', 'kullanici_adi', 'sifre', 'plain_sifre', 'ad_soyad', 'rol', 'onay_durumu', 'created_at', ...YETKI_KOLONLARI];
  const degerler = (k) => [k.id, k.kullanici_adi, hash, null, k.ad_soyad, k.rol, 'onaylandi', `2026-10-01 10:00:0${k.id - 9000}`, ...YETKI_KOLONLARI.map((y) => !!k[y])];

  // --- PostgreSQL referans
  const { Client } = require('pg');
  const pgEnv = envOku(SUNUCULAR.ref.env);
  const pg = new Client({ host: pgEnv.DB_HOST, port: +pgEnv.DB_PORT, database: pgEnv.DB_NAME, user: pgEnv.DB_USER, password: pgEnv.DB_PASSWORD });
  await pg.connect();
  // Canlı Railway PostgreSQL'i UTC saat diliminde çalışır; yerel kurulum Windows yerel saatinde (+03).
  // Referans veritabanı da UTC'de çalışsın ki NOW()/CURRENT_TIMESTAMP aynı saati yazsın.
  await pg.query(`ALTER DATABASE "${pgEnv.DB_NAME}" SET timezone TO 'UTC'`);
  // --- MariaDB yeni
  const mysql = require('mysql2/promise');
  const myEnv = envOku(SUNUCULAR.yeni.env);
  const my = await mysql.createConnection({ host: '127.0.0.1', port: +myEnv.DB_PORT, database: myEnv.DB_NAME, user: myEnv.DB_USER, password: myEnv.DB_PASSWORD });

  try {
    await pg.query('UPDATE ikinci_el_motorlar SET yatirimci_id = NULL WHERE yatirimci_id >= 9000');
    await pg.query('DELETE FROM kullanicilar WHERE id >= 9000');
    await my.query('UPDATE ikinci_el_motorlar SET yatirimci_id = NULL WHERE yatirimci_id >= 9000');
    await my.query('DELETE FROM kullanicilar WHERE id >= 9000');
    for (const k of KULLANICILAR) {
      await pg.query(`INSERT INTO kullanicilar (${kolonlar.join(',')}) VALUES (${kolonlar.map((_, i) => `$${i + 1}`).join(',')})`, degerler(k));
      await my.query(`INSERT INTO kullanicilar (${kolonlar.join(',')}) VALUES (${kolonlar.map(() => '?').join(',')})`, degerler(k).map((v) => (typeof v === 'boolean' ? (v ? 1 : 0) : v)));
    }
    // MariaDB, açık id ile eklenen satırdan sonra AUTO_INCREMENT'ı yükseltir (PostgreSQL dizisi etkilenmez):
    // iki taraf aynı sıradaki id'yi (9009) üretsin diye PostgreSQL dizisi 9008'e çekilir.
    const sonId = (await pg.query('SELECT last_value FROM kullanicilar_id_seq')).rows[0].last_value;
    // (InnoDB sayacı max(id)+1'in altına indirmez; bu yüzden PostgreSQL dizisi MariaDB'ye uydurulur.)
    await pg.query("SELECT setval('kullanicilar_id_seq', 9008)");
    void sonId;
    // En çok motoru olan gerçek yatırımcının motorlarını test yatırımcısına devret (iki veritabanında aynı)
    const en = (await pg.query(
      `SELECT yatirimci_id FROM ikinci_el_motorlar WHERE yatirimci_id IS NOT NULL AND yatirimci_id < 9000 GROUP BY yatirimci_id ORDER BY COUNT(*) DESC, yatirimci_id LIMIT 1`
    )).rows[0];
    if (en) {
      await pg.query('UPDATE ikinci_el_motorlar SET yatirimci_id = 9004 WHERE yatirimci_id = $1', [en.yatirimci_id]);
      await my.query('UPDATE ikinci_el_motorlar SET yatirimci_id = 9004 WHERE yatirimci_id = ?', [en.yatirimci_id]);
    }
  } finally {
    await pg.end();
    await my.end();
  }
}

function sunucuBaslat(s) {
  if (!s.dizin) throw new Error('PG_REF_DIR tanımlı değil (eski kodun backend klasörü).');
  const log = fs.openSync(path.join(require('os').tmpdir(), `kaynar-parity-${s.port}.log`), 'w');
  const cocuk = spawn(process.execPath, [`--env-file=${s.env}`, 'server.js'], {
    cwd: s.dizin,
    env: { ...process.env, PORT: String(s.port), TZ: 'UTC', NODE_ENV: 'development' },
    stdio: ['ignore', log, log],
  });
  s.cocuk = cocuk;
  s.url = `http://127.0.0.1:${s.port}`;
  return cocuk;
}

async function hazirOlmayiBekle(s, sureMs = 60000) {
  const bas = Date.now();
  for (;;) {
    try {
      const r = await fetch(`${s.url}/api/vitrin/segmentler`);
      if (r.ok) return;
    } catch { /* henüz kalkmadı */ }
    if (Date.now() - bas > sureMs) throw new Error(`${s.ad} ${sureMs} ms içinde hazır olmadı`);
    await new Promise((r) => setTimeout(r, 300));
  }
}

async function istek(s, yontem, yol, { token, govde, ham, baslik } = {}) {
  const basliklar = { ...(baslik || {}) };
  if (token) basliklar.Authorization = `Bearer ${token}`;
  let body;
  if (ham) {
    body = ham;
    basliklar['Content-Type'] = 'application/octet-stream';
  } else if (govde !== undefined) {
    body = JSON.stringify(govde);
    basliklar['Content-Type'] = 'application/json';
  }
  const r = await fetch(`${s.url}${yol}`, { method: yontem, headers: basliklar, body });
  const tur = r.headers.get('content-type') || '';
  const buf = Buffer.from(await r.arrayBuffer());
  const sonuc = { durum: r.status, tur: tur.split(';')[0] };
  if (tur.includes('application/json')) {
    try { sonuc.json = JSON.parse(buf.toString('utf8')); } catch { sonuc.metin = buf.toString('utf8'); }
  } else if (tur.startsWith('text/')) {
    sonuc.metin = buf.toString('utf8');
  } else {
    sonuc.ikili = { boyut: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') };
  }
  const cd = r.headers.get('content-disposition');
  if (cd) sonuc.icerikAdi = cd;
  return sonuc;
}

async function girisYap(s, kullanici) {
  const r = await istek(s, 'POST', '/api/auth/login', { govde: { kullanici_adi: kullanici, sifre: SIFRE } });
  if (r.durum !== 200) throw new Error(`${s.ad}: ${kullanici} girişi başarısız (${r.durum})`);
  return r.json.token;
}

/**
 * İki yanıtı karşılaştırır, farkları "yol: ref ≠ yeni" biçiminde döndürür.
 *  - nesne anahtar sırası önemsenmez; dizi sırası önemlidir
 *  - ondalık sayı METİNLERİ ölçek farkını yok sayar ("0" ile "0.00" aynıdır); sayı ile metin ayrı sayılır
 *  - maske: bu anahtarların değerleri (çalışma anında üretilenler) karşılaştırılmaz
 */
function farklar(ref, yeni, maske = new Set(), yol = '$') {
  const sonuc = [];
  const tip = (v) => (v === null ? 'null' : Array.isArray(v) ? 'dizi' : typeof v);
  if (tip(ref) !== tip(yeni)) {
    sonuc.push(`${yol}: tip ${tip(ref)}(${kisalt(ref)}) ≠ ${tip(yeni)}(${kisalt(yeni)})`);
    return sonuc;
  }
  if (Array.isArray(ref)) {
    if (ref.length !== yeni.length) sonuc.push(`${yol}: dizi uzunluğu ${ref.length} ≠ ${yeni.length}`);
    for (let i = 0; i < Math.min(ref.length, yeni.length); i++) sonuc.push(...farklar(ref[i], yeni[i], maske, `${yol}[${i}]`));
    return sonuc;
  }
  if (ref && typeof ref === 'object') {
    const anahtarlar = new Set([...Object.keys(ref), ...Object.keys(yeni)]);
    for (const k of anahtarlar) {
      if (maske.has(k)) continue;
      if (!(k in ref)) sonuc.push(`${yol}.${k}: yalnız yenide var (${kisalt(yeni[k])})`);
      else if (!(k in yeni)) sonuc.push(`${yol}.${k}: yenide yok (ref ${kisalt(ref[k])})`);
      else sonuc.push(...farklar(ref[k], yeni[k], maske, `${yol}.${k}`));
    }
    return sonuc;
  }
  if (typeof ref === 'string' && ref !== yeni) {
    const sayi = /^-?\d+(\.\d+)?$/;
    if (sayi.test(ref) && sayi.test(yeni) && Number(ref) === Number(yeni)) return sonuc;
    sonuc.push(`${yol}: "${kisalt(ref)}" ≠ "${kisalt(yeni)}"`);
    return sonuc;
  }
  if (ref !== yeni) sonuc.push(`${yol}: ${kisalt(ref)} ≠ ${kisalt(yeni)}`);
  return sonuc;
}

function kisalt(v) {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s === undefined ? 'undefined' : s.length > 70 ? `${s.slice(0, 70)}…` : s;
}

// Dizileri (her derinlikte) eleman sırasından bağımsız hale getirir: elemanlar kanonik metnine göre sıralanır.
function kanonik(v) {
  if (Array.isArray(v)) return v.map(kanonik).sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, kanonik(x)]));
  return v;
}

/**
 * Aynı isteği iki sunucuya atar; { ref, yeni, fark } döndürür.
 * secenek.sirasiz: diziler eleman sırasından bağımsız karşılaştırılır (eşit sıralama anahtarlı satırların
 *   sırası SQL'de garanti değildir; PostgreSQL fiziksel sırayı, MariaDB birincil anahtar sırasını izler).
 * secenek.donustur: (json) => json; karşılaştırmadan önce iki yanıta da uygulanır.
 */
async function kiyasla(yontem, yol, secenek = {}, maske = new Set()) {
  const t = secenek.tokenlar;
  const yolRef = typeof yol === 'function' ? yol('ref') : yol;
  const yolYeni = typeof yol === 'function' ? yol('yeni') : yol;
  yol = yolYeni;
  const ref = await istek(SUNUCULAR.ref, yontem, yolRef, { ...secenek, token: t && t.ref });
  const yeni = await istek(SUNUCULAR.yeni, yontem, yolYeni, { ...secenek, token: t && t.yeni });
  for (const y of [ref, yeni]) {
    if (y.json !== undefined && secenek.donustur) y.json = secenek.donustur(y.json);
    if (y.json !== undefined && secenek.sirasiz) y.json = kanonik(y.json);
  }
  const fark = [];
  if (ref.durum !== yeni.durum) fark.push(`durum kodu ${ref.durum} ≠ ${yeni.durum}`);
  if (ref.tur !== yeni.tur) fark.push(`içerik türü ${ref.tur} ≠ ${yeni.tur}`);
  if (ref.json !== undefined || yeni.json !== undefined) fark.push(...farklar(ref.json, yeni.json, maske));
  if (ref.metin !== yeni.metin) fark.push(`metin: "${kisalt(ref.metin)}" ≠ "${kisalt(yeni.metin)}"`);
  if (JSON.stringify(ref.ikili) !== JSON.stringify(yeni.ikili)) fark.push(`ikili: ${JSON.stringify(ref.ikili)} ≠ ${JSON.stringify(yeni.ikili)}`);
  if (ref.icerikAdi !== yeni.icerikAdi) fark.push(`content-disposition: ${ref.icerikAdi} ≠ ${yeni.icerikAdi}`);
  return { yol: `${yontem} ${yol}`, ref, yeni, fark };
}

async function sunuculariKapat() {
  for (const s of Object.values(SUNUCULAR)) {
    if (s.cocuk && !s.cocuk.killed) s.cocuk.kill();
  }
  await new Promise((r) => setTimeout(r, 500));
}

module.exports = {
  SUNUCULAR, KULLANICILAR, SIFRE,
  veritabanlariniHazirla, sunucuBaslat, hazirOlmayiBekle, istek, girisYap, kiyasla, farklar, sunuculariKapat,
};
