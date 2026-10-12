/**
 * Canlı PostgreSQL'in ARAMA (ILIKE) davranışını kaydeder: gerçek veriden türetilen birçok arama
 * sözcüğü için, uygulamadaki arama sorgularının döndürdüğü kayıt numaraları (_arama.json).
 * MariaDB'deki karşılıkları (LOWER(x) LIKE LOWER(?)) bu dosyaya karşı birebir ölçülür
 * (tests/arama.test.js). Yerel PostgreSQL'in harf kuralı canlıdan farklı olabileceği için ona
 * güvenilmez. SALT-OKUNUR; çıktı depo dışındadır.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client } = require('pg');

function arg(ad, v) {
  const i = process.argv.indexOf(ad);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : v;
}
dotenv.config({ path: path.resolve(arg('--env', path.join(__dirname, '..', '..', '.env'))) });
const cikti = path.resolve(arg('--cikti', path.join(process.env.USERPROFILE || process.env.HOME, 'KaynarMariaDB', 'railway-yedek')));
if (cikti.toLowerCase().startsWith(path.resolve(__dirname, '..', '..', '..').toLowerCase())) {
  console.error('HATA: çıktı depo içine yazılamaz.');
  process.exit(1);
}

// Uygulamadaki ILIKE aramaları: [tablo, kolonlar]
const ARAMALAR = [
  ['musteriler', ['ad_soyad', 'telefon']],
  ['aksesuar_stok', ['stok_kodu', 'stok_adi', 'marka']],
  ['yedek_parca_stok', ['stok_kodu', 'stok_adi', 'marka']],
  ['vitrin_urunleri', ['baslik', 'aciklama', 'marka', 'model']],
];
// Sözcük kaynağı: gerçek veri (sabit, tekrarlanabilir seçim)
const KAYNAK = [['musteriler', 'ad_soyad'], ['aksesuar_stok', 'stok_adi'], ['aksesuar_stok', 'marka'], ['vitrin_urunleri', 'baslik'], ['vitrin_urunleri', 'marka'], ['ikinci_el_motorlar', 'alici_adi']];
const EK = ['ali', 'ALİ', 'ali̇', 'ılık', 'ILIK', 'ışık', 'IŞIK', 'i', 'İ', 'ı', 'I', 'ş', 'Ş', 'ç', 'Ç', 'ğ', 'Ğ', 'ö', 'Ö', 'ü', 'Ü', 'şiş', 'ŞİŞ', 'çan', 'ÇAN', '05', '+90', '%', '_', 'a', 'e', 'kask', 'KASK', 'honda', 'HONDA'];

(async () => {
  const yerel = ['localhost', '127.0.0.1'].includes(process.env.DB_HOST);
  const c = new Client({
    host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT, 10) || 5432, database: process.env.DB_NAME,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, ssl: yerel ? false : { rejectUnauthorized: false },
  });
  await c.connect();
  await c.query('SET default_transaction_read_only = on');
  await c.query('BEGIN READ ONLY');

  const sozcukler = new Set(EK);
  for (const [t, k] of KAYNAK) {
    const r = await c.query(`SELECT "${k}" AS v FROM "${t}" WHERE "${k}" IS NOT NULL ORDER BY id`);
    for (const { v } of r.rows) for (const w of String(v).split(/[\s,.\-/()]+/)) if (w.length >= 2) sozcukler.add(w);
  }
  // Sabit, tekrarlanabilir örnekleme (ilk 300 sözcük sırasıyla)
  const liste = [...sozcukler].filter((w) => w.length <= 20).sort().filter((_, i) => i % 3 === 0).slice(0, 300);
  for (const e of EK) if (!liste.includes(e)) liste.push(e);

  const sonuc = { collate: (await c.query('SELECT datcollate FROM pg_database WHERE datname = current_database()')).rows[0].datcollate, sozcukler: liste, sonuclar: {} };
  for (const [tablo, kolonlar] of ARAMALAR) {
    const kosul = kolonlar.map((k) => `"${k}" ILIKE $1`).join(' OR ');
    const harita = {};
    for (const w of liste) {
      const r = await c.query(`SELECT id FROM "${tablo}" WHERE ${kosul} ORDER BY id`, [`%${w}%`]);
      harita[w] = r.rows.map((x) => x.id);
    }
    sonuc.sonuclar[`${tablo}(${kolonlar.join(',')})`] = harita;
  }
  await c.query('ROLLBACK');
  await c.end();
  fs.writeFileSync(path.join(cikti, '_arama.json'), JSON.stringify(sonuc));
  console.log(`${liste.length} sözcük × ${ARAMALAR.length} arama kaydedildi (canlı ${sonuc.collate}).`);
})().catch((e) => {
  console.error('Alınamadı:', e.message);
  process.exit(1);
});
