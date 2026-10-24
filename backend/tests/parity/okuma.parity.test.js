/**
 * OKUMA karşılaştırması: tüm GET uçları, 8 farklı rolle, eski (PostgreSQL) ve yeni (MariaDB)
 * sunucuya aynı veriyle atılır; yanıtlar (durum kodu, gövde) aynı olmalıdır.
 *
 * İki istisna, nedenleriyle:
 *  - Eşit sıralama anahtarlı satırların sırası SQL'de garanti değildir (PostgreSQL fiziksel sırayı,
 *    MariaDB birincil anahtar sırasını izler): SIRASIZ uçlar eleman sırasından bağımsız karşılaştırılır.
 *  - Yerel PostgreSQL'in metin sıralama kuralı (Windows) canlıdakinden (en_US.utf8) farklıdır; metin
 *    sıralaması ayrıca, canlıdan alınan "sıralama kehaneti" (_sira.json) ile sınanır.
 *
 * Çalıştırma (backend klasöründe):
 *   PG_REF_DIR=<eski kodun backend klasörü> node --test tests/parity/okuma.parity.test.js
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { SUNUCULAR, veritabanlariniHazirla, sunucuBaslat, hazirOlmayiBekle, istek, girisYap, kiyasla, sunuculariKapat } = require('./ortam');

const ROLLER = ['p_admin', 'p_personel', 'p_kisitli', 'p_yatirimci', 'p_yat_vitrin', 'p_muhasebeci', 'p_servis', 'p_vitrin'];
const YEDEK = path.join(process.env.USERPROFILE || process.env.HOME, 'KaynarMariaDB', 'railway-yedek');
const kehanet = JSON.parse(fs.readFileSync(path.join(YEDEK, '_sira.json'), 'utf8')).sira;

// Eleman sırasından bağımsız karşılaştırılacak uçlar (bkz. dosya başı)
const SIRASIZ = [
  /^\/api\/ikinci-el-motor(\?|$)/,
  /^\/api\/raporlar\/(gunluk|aralik|yatirimci-rapor|yatirimci-ozet|personeller)/,
  /^\/api\/aksesuar-stok(\/ara|$)/,
  /^\/api\/yedek-parcalar$/,
  /^\/api\/musteriler\/ara\//,
  /^\/api\/vitrin\/markalar/,
  /^\/api\/auth\/(personel-listesi|yatirimcilar)$/,
  /^\/api\/eticaret\/platformlar$/,
];
// Aktivite günlüğüne testin kendi girişleri yazılır (iki sunucuda milisaniye farkıyla): yalnızca onların zamanı yok sayılır.
const ILK_GUN_SAYISI = 3150;
const DONUSTUR = {
  '/api/auth/activity-logs': (j) => (Array.isArray(j) ? j.map((r) => (r.id > ILK_GUN_SAYISI ? { ...r, created_at: 'X' } : r)) : j),
};
const donusturFonksiyonu = (yol) => {
  if (DONUSTUR[yol]) return DONUSTUR[yol];
  if (/^\/api\/auth\/users\/\d+\/activity-logs$/.test(yol))
    return (j) => (Array.isArray(j) ? j.map((r) => (r.id > ILK_GUN_SAYISI ? { ...r, created_at: 'X' } : r)) : j);
  return undefined;
};

// Metin sıralaması kehanete uyuyor mu? Her ardışık çift için sıra numarası azalmamalı.
const siraNo = (tablokolon) => {
  const m = new Map(kehanet[tablokolon].map((v, i) => [v, i]));
  return (v) => (v === null || v === undefined ? Number.POSITIVE_INFINITY : m.has(v) ? m.get(v) : -1);
};
function siraIhlalleri(satirlar, alan, tablokolon) {
  const n = siraNo(tablokolon);
  const bilinen = satirlar.filter((r) => n(r[alan]) !== -1);
  const ihlal = [];
  for (let i = 1; i < bilinen.length; i++) {
    if (n(bilinen[i - 1][alan]) > n(bilinen[i][alan])) ihlal.push(`${i}: "${bilinen[i - 1][alan]}" > "${bilinen[i][alan]}"`);
  }
  return ihlal;
}

describe('okuma uçları: eski (PostgreSQL) ve yeni (MariaDB) sunucu', { timeout: 20 * 60 * 1000 }, () => {
  const tokenlar = {};
  let yollar;
  const ids = {};

  before(async () => {
    await veritabanlariniHazirla();
    sunucuBaslat(SUNUCULAR.ref);
    sunucuBaslat(SUNUCULAR.yeni);
    await Promise.all([hazirOlmayiBekle(SUNUCULAR.ref), hazirOlmayiBekle(SUNUCULAR.yeni)]);
    for (const rol of ROLLER) tokenlar[rol] = { ref: await girisYap(SUNUCULAR.ref, rol), yeni: await girisYap(SUNUCULAR.yeni, rol) };

    const admin = tokenlar.p_admin.ref;
    const liste = async (yol) => (await istek(SUNUCULAR.ref, 'GET', yol, { token: admin })).json;
    const ornek = (dizi, n = 6) => {
      const i = dizi.map((r) => r.id);
      return [...new Set([...i.slice(0, Math.ceil(n / 2)), ...i.slice(-Math.floor(n / 2))])];
    };
    const motorlar = await liste('/api/ikinci-el-motor');
    const isEmirleri = await liste('/api/is-emirleri');
    const aksesuarlar = await liste('/api/aksesuarlar');
    const musteriler = await liste('/api/musteriler');
    const eticaret = await liste('/api/eticaret');
    const yedekParcalar = await liste('/api/yedek-parcalar');
    const stok = await liste('/api/aksesuar-stok');
    const vitrin = await liste('/api/vitrin?hepsi=1');
    const arsiv = await liste('/api/satis-belgeleri/arsiv');
    const kullanicilar = await liste('/api/auth/users');
    const qr = await qrTokenleri();
    ids.musteriler = musteriler;

    yollar = [
      '/api/auth/verify',
      '/api/auth/personel-listesi',
      '/api/auth/users',
      '/api/auth/yatirimcilar',
      '/api/auth/activity-logs',
      ...ornek(kullanicilar, 4).map((id) => `/api/auth/users/${id}/activity-logs`),
      '/api/musteriler',
      '/api/musteriler/ara/MEHMET',
      '/api/musteriler/ara/karateke',
      '/api/musteriler/ara/05321',
      '/api/musteriler/telefon/05321234567',
      '/api/musteriler/telefon/5051234567',
      '/api/musteriler/telefon/123',
      ...ornek(musteriler).map((id) => `/api/musteriler/${id}`),
      '/api/musteriler/999999',
      '/api/is-emirleri',
      '/api/is-emirleri?durum=tamamlandi',
      '/api/is-emirleri?durum=beklemede',
      '/api/is-emirleri?baslangic=2026-09-01&bitis=2026-10-12',
      '/api/is-emirleri?baslangic=2026-01-01',
      '/api/is-emirleri?bitis=2026-03-01',
      '/api/is-emirleri/next-fis-no/preview',
      ...ornek(isEmirleri).map((id) => `/api/is-emirleri/${id}`),
      '/api/is-emirleri/999999',
      '/api/aksesuarlar',
      '/api/aksesuarlar/stats/genel',
      ...ornek(aksesuarlar).map((id) => `/api/aksesuarlar/${id}`),
      '/api/aksesuarlar/999999',
      '/api/aksesuar-stok',
      '/api/aksesuar-stok/ara?q=beyaz',
      '/api/aksesuar-stok/ara?q=KASK',
      '/api/aksesuar-stok/next-stok-kodu',
      ...stok.slice(0, 4).map((s) => `/api/aksesuar-stok/barkod/${s.stok_kodu}`),
      '/api/aksesuar-stok/barkod/yok-boyle-kod',
      '/api/ikinci-el-motor',
      '/api/ikinci-el-motor/stats/ozet',
      '/api/ikinci-el-motor?durum=stokta',
      '/api/ikinci-el-motor?durum=tamamlandi',
      '/api/ikinci-el-motor?baslangic=2026-01-01&bitis=2026-06-30',
      ...ornek(motorlar, 8).map((id) => `/api/ikinci-el-motor/${id}`),
      '/api/ikinci-el-motor/999999',
      '/api/satis-belgeleri/arsiv',
      ...ornek(motorlar, 4).map((id) => `/api/satis-belgeleri/motor/${id}`),
      ...arsiv.flatMap((g) => g.belgeler.map((b) => `/api/satis-belgeleri/${b.id}/indir`)),
      '/api/eticaret/platformlar',
      '/api/eticaret/stats',
      '/api/eticaret',
      ...ornek(eticaret).map((id) => `/api/eticaret/${id}`),
      '/api/yedek-parcalar',
      ...ornek(yedekParcalar, 4).map((id) => `/api/yedek-parcalar/${id}`),
      '/api/yedek-parca-stok',
      '/api/yedek-parca-stok/ara?q=ya',
      '/api/yedek-parca-stok/next-stok-kodu',
      '/api/yedek-parca-stok/barkod/9000000000001',
      '/api/raporlar/genel',
      '/api/raporlar/gunluk',
      '/api/raporlar/gunluk?tarih=2026-10-10',
      '/api/raporlar/gunluk?tarih=2026-09-15',
      '/api/raporlar/aralik?baslangic=2026-09-01&bitis=2026-10-12',
      '/api/raporlar/aralik?baslangic=2026-01-01&bitis=2026-12-31',
      '/api/raporlar/aralik?baslangic=2025-01-01&bitis=2025-12-31',
      '/api/raporlar/aralik',
      '/api/raporlar/fis-kar',
      '/api/raporlar/fis-kar?baslangic=2026-09-01&bitis=2026-10-12',
      '/api/raporlar/personeller',
      '/api/raporlar/yatirimci-rapor',
      '/api/raporlar/yatirimci-rapor?yatirimci_id=9004',
      '/api/raporlar/yatirimci-rapor?yatirimci_id=9004&baslangic=2026-01-01&bitis=2026-12-31',
      '/api/raporlar/yatirimci-ozet',
      '/api/raporlar/yatirimci-ozet?baslangic=2026-01-01&bitis=2026-12-31',
      '/api/veresiye',
      '/api/vitrin/segmentler',
      '/api/vitrin/iletisim',
      '/api/vitrin',
      '/api/vitrin?hepsi=1',
      '/api/vitrin?kategori=motor',
      '/api/vitrin?kategori=aksesuar',
      '/api/vitrin?kategori=motor&durum=ikinci_el',
      '/api/vitrin?kategori=motor&durum=sifir',
      '/api/vitrin?q=honda',
      '/api/vitrin?q=KASK',
      '/api/vitrin?marka=honda',
      '/api/vitrin?cc_min=100&cc_max=250',
      '/api/vitrin?km_max=20000',
      '/api/vitrin?segment=Scooter',
      '/api/vitrin/markalar',
      '/api/vitrin/markalar?durum=ikinci_el',
      '/api/vitrin/markalar?durum=sifir',
      ...ornek(vitrin, 6).map((id) => `/api/vitrin/${id}`),
      ...vitrin.slice(0, 3).map((v) => `/api/vitrin/gorsel/${v.kapak_gorsel_id}`),
      '/api/vitrin/iletisim-gorsel/motor',
      '/api/vitrin/iletisim-gorsel/nakliye',
      '/api/vitrin/video/1',
      ...qr.map((tk) => `/api/servis-gecmisi/${tk}`),
      '/api/servis-gecmisi/yok',
    ].filter((y) => !/\/null$/.test(y));
  });

  after(sunuculariKapat);

  it('tüm GET uçları × 8 rol aynı yanıtı verir', async () => {
    const tumFarklar = [];
    let sayac = 0;
    for (const rol of ROLLER) {
      for (const yol of yollar) {
        const secenek = { tokenlar: tokenlar[rol], sirasiz: SIRASIZ.some((r) => r.test(yol)), donustur: donusturFonksiyonu(yol) };
        const s = await kiyasla('GET', yol, secenek);
        sayac++;
        if (s.fark.length) tumFarklar.push({ rol, yol: s.yol, fark: s.fark.slice(0, 6), ref: s.ref.durum, yeni: s.yeni.durum });
      }
    }
    console.log(`\n${sayac} istek çifti karşılaştırıldı (${yollar.length} uç × ${ROLLER.length} rol).`);
    rapor(tumFarklar);
    assert.equal(tumFarklar.length, 0, `${tumFarklar.length} yanıt farklı`);
  });

  it('zaman sıralamaları kurala uyar (eşit anahtarlı satırların sırası serbest)', async () => {
    const yeni = SUNUCULAR.yeni;
    const admin = tokenlar.p_admin.yeni;
    const al = async (yol) => (await istek(yeni, 'GET', yol, { token: admin })).json;
    const ihlaller = [];
    // Her ardışık çiftte anahtar azalmamalı (DESC)
    const azalan = (ad, satirlar, anahtar) => {
      for (let i = 1; i < satirlar.length; i++) {
        const a = anahtar(satirlar[i - 1]);
        const b = anahtar(satirlar[i]);
        if (a !== null && b !== null && a < b) {
          ihlaller.push(`${ad}: #${i} (${a} < ${b})`);
          break;
        }
      }
    };
    const motorAnahtar = (r) => r.tamamlama_tarihi || r.created_at || null;
    const satisAnahtar = (r) => String(r.satis_tarihi || r.tamamlama_tarihi || '');
    azalan('motor listesi', await al('/api/ikinci-el-motor'), motorAnahtar);
    azalan('motor listesi (tamamlandı)', await al('/api/ikinci-el-motor?durum=tamamlandi'), motorAnahtar);
    for (const yol of ['/api/raporlar/aralik?baslangic=2026-01-01&bitis=2026-12-31', '/api/raporlar/aralik?baslangic=2026-09-01&bitis=2026-10-12']) {
      const r = await al(yol);
      azalan(yol + ' motorlar', r.motorlar, satisAnahtar);
      azalan(yol + ' isEmirleri', r.isEmirleri, (x) => x.created_at);
      azalan(yol + ' aksesuarlar', r.aksesuarlar, (x) => x.created_at);
      azalan(yol + ' eticaret', r.eticaret, (x) => x.tarih);
    }
    const yr = await al('/api/raporlar/yatirimci-rapor?yatirimci_id=9004');
    azalan('yatırımcı satılanlar', yr.satilanlar, satisAnahtar);
    azalan('yatırımcı stoktakiler', yr.stoktakiler, (x) => x.created_at);
    assert.deepEqual(ihlaller, []);
  });

  it('metin sıralaması canlının (en_US.utf8) sırasıyla birebir aynıdır', async () => {
    const ihlaller = [];
    const yeni = SUNUCULAR.yeni;
    const admin = tokenlar.p_admin.yeni;
    const al = async (yol) => (await istek(yeni, 'GET', yol, { token: admin })).json;

    const kontroller = [
      ['/api/auth/personel-listesi', 'ad_soyad', 'kullanicilar.ad_soyad'],
      ['/api/auth/yatirimcilar', 'ad_soyad', 'kullanicilar.ad_soyad'],
      ['/api/musteriler/ara/a', 'ad_soyad', 'musteriler.ad_soyad'],
      ['/api/musteriler/ara/ali', 'ad_soyad', 'musteriler.ad_soyad'],
      ['/api/aksesuar-stok', 'stok_adi', 'aksesuar_stok.stok_adi'],
      ['/api/aksesuar-stok/ara?q=ka', 'stok_adi', 'aksesuar_stok.stok_adi'],
      ['/api/aksesuar-stok/ara?q=a', 'stok_adi', 'aksesuar_stok.stok_adi'],
      ['/api/yedek-parcalar', 'urun_adi', 'yedek_parcalar.urun_adi'],
      ['/api/eticaret/platformlar', 'platform_adi', 'eticaret_platformlar.platform_adi'],
      ['/api/vitrin/markalar', 'marka', 'vitrin_urunleri.marka'],
    ];
    for (const [yol, alan, tk] of kontroller) {
      const satirlar = await al(yol);
      const v = siraIhlalleri(satirlar, alan, tk);
      if (v.length) ihlaller.push(`${yol}: ${v.slice(0, 3).join(' | ')}`);
    }
    const ozet = await al('/api/raporlar/yatirimci-ozet');
    if (siraIhlalleri(ozet, 'ad_soyad', 'kullanicilar.ad_soyad').length) ihlaller.push('/api/raporlar/yatirimci-ozet');

    // LIMIT 20 olan aramalarda doğru 20 satır dönmeli: tüm müşteriler kehanet sırasıyla sıralanıp ilk 20 alınır.
    const hepsi = await al('/api/musteriler');
    const n = siraNo('musteriler.ad_soyad');
    for (const q of ['a', 'e', 'mehmet']) {
      const beklenen = hepsi
        .filter((m) => (m.ad_soyad || '').toLowerCase().includes(q) || (m.telefon || '').toLowerCase().includes(q))
        .map((m) => n(m.ad_soyad))
        .sort((x, y) => x - y)
        .slice(0, 20);
      const gelen = (await al(`/api/musteriler/ara/${q}`)).map((m) => n(m.ad_soyad));
      if (JSON.stringify(beklenen) !== JSON.stringify(gelen)) ihlaller.push(`/api/musteriler/ara/${q}: ilk 20 kayıt kehanetle uyuşmuyor`);
    }
    assert.deepEqual(ihlaller, []);
  });
});

function rapor(tumFarklar) {
  if (!tumFarklar.length) return;
  const grup = new Map();
  for (const f of tumFarklar) {
    const anahtar = `${f.yol}  [durum ref ${f.ref} / yeni ${f.yeni}]`;
    if (!grup.has(anahtar)) grup.set(anahtar, { roller: [], fark: f.fark });
    grup.get(anahtar).roller.push(f.rol);
  }
  console.log(`FARK VAR: ${grup.size} uçta.`);
  for (const [k, v] of grup) {
    console.log(`\n✖ ${k}\n   roller: ${v.roller.join(', ')}`);
    v.fark.forEach((d) => console.log(`   ${d}`));
  }
}

async function qrTokenleri() {
  const { Client } = require('pg');
  const env = {};
  for (const l of fs.readFileSync(SUNUCULAR.ref.env, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z_]+)=(.*)$/.exec(l);
    if (m) env[m[1]] = m[2];
  }
  const c = new Client({ host: env.DB_HOST, port: +env.DB_PORT, database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD });
  await c.connect();
  const r = await c.query('SELECT token FROM servis_qr_tokenler ORDER BY id LIMIT 4');
  await c.end();
  return r.rows.map((x) => x.token);
}
