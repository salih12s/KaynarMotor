/**
 * Canlı PostgreSQL'in METİN SIRALAMASINI (collation) kaydeder: her kısa metin sütunu için
 * benzersiz değerler, canlının `ORDER BY` sırasıyla yazılır (_sira.json, yedek klasörüne).
 *
 * Neden: MariaDB'de sıralama kuralı farklıdır. MariaDB tarafındaki ORDER BY ifadesinin
 * (core/sqlText.js orderByText) canlıyla aynı sırayı verdiği bu "kehanet" dosyasına karşı
 * ölçülür; yerel PostgreSQL'in sıralama kuralı canlıdan farklı olabileceği için ona güvenilmez.
 *
 * SALT-OKUNUR (BEGIN READ ONLY). Çıktı gerçek müşteri verisi içerir, depo dışındadır.
 * Kullanım: node scripts/mariadb/railwaySiraAl.js [--env .env] [--cikti <klasor>]
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

(async () => {
  const yerel = ['localhost', '127.0.0.1'].includes(process.env.DB_HOST);
  const c = new Client({
    host: process.env.DB_HOST, port: parseInt(process.env.DB_PORT, 10) || 5432, database: process.env.DB_NAME,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, ssl: yerel ? false : { rejectUnauthorized: false },
  });
  await c.connect();
  await c.query('SET default_transaction_read_only = on');
  await c.query('BEGIN READ ONLY');
  const collate = (await c.query('SELECT datcollate FROM pg_database WHERE datname = current_database()')).rows[0].datcollate;
  const kolonlar = (await c.query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND udt_name IN ('varchar', 'text')
      AND COALESCE(character_maximum_length, 0) <= 255
      AND column_name NOT IN ('data', 'gorsel', 'icerik', 'sifre', 'plain_sifre', 'token', 'islem_detay', 'tarayici_bilgisi')
    ORDER BY 1, 2`)).rows;
  const sonuc = { collate, alinma: new Date().toISOString(), sira: {} };
  for (const { table_name: t, column_name: k } of kolonlar) {
    const r = await c.query(`SELECT DISTINCT "${k}" AS v FROM "${t}" WHERE "${k}" IS NOT NULL ORDER BY "${k}"`);
    if (r.rows.length > 1) sonuc.sira[`${t}.${k}`] = r.rows.map((x) => x.v);
  }
  await c.query('ROLLBACK');
  await c.end();
  fs.writeFileSync(path.join(cikti, '_sira.json'), JSON.stringify(sonuc));
  console.log(`Canlı sıralama kuralı: ${collate}; ${Object.keys(sonuc.sira).length} sütun kaydedildi -> ${path.join(cikti, '_sira.json')}`);
})().catch((e) => {
  console.error('Alınamadı:', e.message);
  process.exit(1);
});
