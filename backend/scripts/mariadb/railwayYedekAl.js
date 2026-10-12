/**
 * Railway (PostgreSQL) veritabanının SALT-OKUNUR mantıksal yedeği.
 *
 * Her tablo bir NDJSON dosyasına yazılır (satır başına bir JSON nesnesi). Şema
 * bilgisi (_sema.json: kolonlar, tipler, birincil anahtarlar, diziler) ayrıca alınır;
 * MariaDB şemasının canlı şemayla örtüştüğünü kontrol etmek için kullanılır.
 *
 * GÜVENLİK:
 *  - Bağlantı BEGIN READ ONLY transaction'ında ve default_transaction_read_only=on ile
 *    açılır; bu betik canlı veritabanına HİÇBİR ŞEY yazamaz.
 *  - Çıktı gerçek müşteri verisi (ve plain_sifre) içerir. Depo herkese açık olduğu için
 *    varsayılan çıktı klasörü DEPONUN DIŞINDADIR; asla commit etmeyin.
 *
 * Kullanım (backend klasöründe):
 *   node scripts/mariadb/railwayYedekAl.js [--env .env] [--cikti C:/yol/klasor]
 * Bağlantı bilgisi --env dosyasındaki DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD
 * (ya da DATABASE_URL) değerlerinden okunur.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Client, types } = require('pg');

// Tarih/saat ve sayıları ham metin olarak al: saat dilimi ya da float kaybı olmasın.
for (const oid of [1082, 1114, 1184, 1700, 20]) types.setTypeParser(oid, (v) => v);

function arg(ad, varsayilan) {
  const i = process.argv.indexOf(ad);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : varsayilan;
}

const envDosyasi = path.resolve(arg('--env', path.join(__dirname, '..', '..', '.env')));
const cikti = path.resolve(
  arg('--cikti', path.join(process.env.USERPROFILE || process.env.HOME, 'KaynarMariaDB', 'railway-yedek'))
);

const repoKok = path.resolve(__dirname, '..', '..', '..');
if (cikti.toLowerCase().startsWith(repoKok.toLowerCase())) {
  console.error('HATA: yedek çıktısı depo içine yazılamaz (müşteri verisi içerir). --cikti ile depo dışı bir klasör verin.');
  process.exit(1);
}

dotenv.config({ path: envDosyasi });

function baglantiAyari() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } };
  }
  const yerel = ['localhost', '127.0.0.1'].includes(process.env.DB_HOST);
  return {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: yerel ? false : { rejectUnauthorized: false },
  };
}

function degerYaz(v) {
  if (Buffer.isBuffer(v)) return { $b64: v.toString('base64') };
  return v;
}

async function main() {
  const client = new Client(baglantiAyari());
  await client.connect();
  await client.query('SET default_transaction_read_only = on');
  await client.query('BEGIN READ ONLY');

  fs.mkdirSync(cikti, { recursive: true });

  const surum = (await client.query('SHOW server_version')).rows[0].server_version;
  console.log(`PostgreSQL ${surum} -> ${cikti}`);

  const kolonlar = (
    await client.query(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default,
             character_maximum_length, numeric_precision, numeric_scale, ordinal_position
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position`)
  ).rows;
  const birincil = (
    await client.query(`
      SELECT tc.table_name, kcu.column_name, kcu.ordinal_position
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY tc.table_name, kcu.ordinal_position`)
  ).rows;
  const indeksler = (
    await client.query(`SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1, 2`)
  ).rows;
  const diziler = (
    await client.query(`SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'public'`)
  ).rows;
  const yabanciAnahtarlar = (
    await client.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_column, rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
      WHERE tc.table_schema = 'public' AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY 1, 2`)
  ).rows;

  fs.writeFileSync(
    path.join(cikti, '_sema.json'),
    JSON.stringify({ surum, alinma: new Date().toISOString(), kolonlar, birincil, indeksler, diziler, yabanciAnahtarlar }, null, 1)
  );

  const tablolar = [...new Set(kolonlar.map((k) => k.table_name))];
  const ozet = {};

  for (const tablo of tablolar) {
    const pk = birincil.filter((b) => b.table_name === tablo).map((b) => b.column_name);
    const sirala = pk.length ? pk.map((c) => `"${c}"`).join(', ') : '1';
    const dosya = path.join(cikti, `${tablo}.ndjson`);
    const akim = fs.createWriteStream(dosya);
    const parti = 50;
    let sayi = 0;
    let son = null;

    for (;;) {
      let r;
      if (pk.length === 1 && son !== null) {
        r = await client.query(
          `SELECT * FROM "${tablo}" WHERE "${pk[0]}" > $1 ORDER BY ${sirala} LIMIT ${parti}`,
          [son]
        );
      } else if (pk.length === 1) {
        r = await client.query(`SELECT * FROM "${tablo}" ORDER BY ${sirala} LIMIT ${parti}`);
      } else {
        r = await client.query(`SELECT * FROM "${tablo}" ORDER BY ${sirala} LIMIT ${parti} OFFSET ${sayi}`);
      }
      if (r.rows.length === 0) break;
      for (const satir of r.rows) {
        const nesne = {};
        for (const [k, v] of Object.entries(satir)) nesne[k] = degerYaz(v);
        if (!akim.write(JSON.stringify(nesne) + '\n')) await new Promise((res) => akim.once('drain', res));
      }
      sayi += r.rows.length;
      if (pk.length === 1) son = r.rows[r.rows.length - 1][pk[0]];
      if (r.rows.length < parti) break;
    }
    await new Promise((res) => akim.end(res));
    const boyut = fs.statSync(dosya).size;
    ozet[tablo] = { satir: sayi, bayt: boyut };
    console.log(`${tablo.padEnd(28)} ${String(sayi).padStart(7)} satır  ${(boyut / 1048576).toFixed(2)} MB`);
  }

  // Doğrulama: yazılan satır sayısı canlıdaki COUNT(*) ile aynı mı?
  for (const tablo of tablolar) {
    const n = (await client.query(`SELECT COUNT(*)::text AS n FROM "${tablo}"`)).rows[0].n;
    if (Number(n) !== ozet[tablo].satir) {
      console.warn(`UYARI: ${tablo}: yedek ${ozet[tablo].satir}, canlı ${n} (yedek sırasında kayıt eklenmiş olabilir)`);
    }
  }
  fs.writeFileSync(path.join(cikti, '_ozet.json'), JSON.stringify(ozet, null, 1));

  await client.query('ROLLBACK');
  await client.end();
  console.log('Tamam. Yedek salt-okunur alındı; canlı veritabanında değişiklik yapılmadı.');
}

main().catch((e) => {
  console.error('Yedek alınamadı:', e.message);
  process.exit(1);
});
