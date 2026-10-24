/**
 * railwayYedekAl.js ile alınan yedeği (NDJSON + _sema.json) bir veritabanına yükler ve
 * yüklemeyi doğrular. İki hedef desteklenir:
 *   --hedef mariadb   (varsayılan) MariaDB; şema core/initDb.js ile kurulur
 *   --hedef pg        PostgreSQL; şema depodaki ESKİ initDb ile önceden kurulmuş olmalı
 *                     (karşılaştırma testi için yerel referans veritabanı)
 *
 * Kullanım (backend klasöründe):
 *   node scripts/mariadb/yedektenYukle.js --env .env.mariadb.kopya [--yedek <klasor>] [--hedef mariadb|pg] [--sadece-dogrula]
 * --sadece-dogrula: hiçbir şey yazmaz/silmez; hedefin yedekle birebir aynı olup olmadığını denetler.
 *
 * GÜVENLİK: Hedef tablolar BOŞALTILIR. Bu yüzden bağlantı yerel değilse (127.0.0.1/localhost
 * dışı) betik çalışmaz; Hostinger'a uzaktan yükleme --uzak-izin bayrağıyla ve bilerek yapılır.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');

function arg(ad, varsayilan) {
  const i = process.argv.indexOf(ad);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : varsayilan;
}
const bayrak = (ad) => process.argv.includes(ad);

const envDosyasi = arg('--env');
if (!envDosyasi) {
  console.error('HATA: --env <dosya> verin (hedef veritabanı bağlantısı).');
  process.exit(1);
}
const yedekKlasoru = path.resolve(arg('--yedek', path.join(process.env.USERPROFILE || process.env.HOME, 'KaynarMariaDB', 'railway-yedek')));
const hedef = arg('--hedef', 'mariadb');
// --atla tablo1,tablo2: bu tablolar boşaltılmaz/yüklenmez (büyük ve DEĞİŞMEDİĞİ bilinen tablolar için hız).
// Doğrulama yine TÜM tablolarda çalışır: atlanan tabloların yedekle aynı olduğu kanıtlanır.
const atla = new Set(arg('--atla', '').split(',').filter(Boolean));

dotenv.config({ path: path.resolve(envDosyasi), override: true });

const yerelMi = ['localhost', '127.0.0.1'].includes(process.env.DB_HOST);
if (!yerelMi && !bayrak('--uzak-izin')) {
  console.error(`HATA: DB_HOST=${process.env.DB_HOST} yerel değil. Hedef tablolar boşaltılacağı için uzak yükleme --uzak-izin ister.`);
  process.exit(1);
}
if (process.env.DATABASE_URL) {
  console.error('HATA: DATABASE_URL tanımlı; bu betik yalnızca DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD kullanır.');
  process.exit(1);
}

const sema = JSON.parse(fs.readFileSync(path.join(yedekKlasoru, '_sema.json'), 'utf8'));
const ozet = JSON.parse(fs.readFileSync(path.join(yedekKlasoru, '_ozet.json'), 'utf8'));

// ---------- yardımcılar ----------

const tablolar = [...new Set(sema.kolonlar.map((k) => k.table_name))];
const kolonlarOf = (t) => sema.kolonlar.filter((k) => k.table_name === t);

// Yabancı anahtar sırası: bağımlı olan tablo, bağlı olduğundan sonra gelir.
function sirala() {
  const bagimli = {};
  for (const t of tablolar) {
    bagimli[t] = new Set(sema.yabanciAnahtarlar.filter((f) => f.table_name === t && f.ref_table !== t).map((f) => f.ref_table));
  }
  const sonuc = [];
  const goruldu = new Set();
  const ziyaret = (t) => {
    if (goruldu.has(t)) return;
    goruldu.add(t);
    for (const b of bagimli[t]) ziyaret(b);
    sonuc.push(t);
  };
  tablolar.forEach(ziyaret);
  return sonuc;
}

function degerCevir(deger, kolon) {
  if (deger === null || deger === undefined) return null;
  if (typeof deger === 'object' && deger.$b64 !== undefined) return Buffer.from(deger.$b64, 'base64');
  if (kolon.udt_name === 'bool') return deger ? 1 : 0;
  return deger;
}

async function* satirlar(tablo) {
  const akim = fs.createReadStream(path.join(yedekKlasoru, `${tablo}.ndjson`), { encoding: 'utf8' });
  const okuyucu = readline.createInterface({ input: akim, crlfDelay: Infinity });
  for await (const satir of okuyucu) {
    if (satir.trim()) yield JSON.parse(satir);
  }
}

// ---------- ondalık toplam (BigInt) ----------

function ondalikOlcek(s) {
  const nokta = s.indexOf('.');
  return nokta === -1 ? 0 : s.length - nokta - 1;
}
function ondalikBigInt(s, olcek) {
  const negatif = s.startsWith('-');
  const duz = negatif ? s.slice(1) : s;
  const [tam, kesir = ''] = duz.split('.');
  const deger = BigInt(tam + kesir.padEnd(olcek, '0'));
  return negatif ? -deger : deger;
}
function ondalikYaz(toplam, olcek) {
  const negatif = toplam < 0n;
  let s = (negatif ? -toplam : toplam).toString().padStart(olcek + 1, '0');
  if (olcek > 0) s = `${s.slice(0, -olcek)}.${s.slice(-olcek)}`;
  return (negatif ? '-' : '') + s;
}
const sayiMi = (k) => ['int4', 'int8', 'numeric', 'float8'].includes(k.udt_name);
const metinMi = (k) => ['varchar', 'text'].includes(k.udt_name);
const zamanMi = (k) => ['timestamp', 'date'].includes(k.udt_name);

// Yedekteki (kaynak) istatistik: sütun başına dolu sayısı, toplam, uzunluk toplamı, min/max
async function kaynakIstatistik(tablo) {
  const kolonlar = kolonlarOf(tablo);
  const ist = { satir: 0, kolon: {} };
  for (const k of kolonlar) ist.kolon[k.column_name] = { dolu: 0, toplam: 0n, olcek: 0, uzunluk: 0, min: null, max: null, true: 0 };
  for await (const satir of satirlar(tablo)) {
    ist.satir++;
    for (const k of kolonlar) {
      const v = satir[k.column_name];
      if (v === null || v === undefined) continue;
      const o = ist.kolon[k.column_name];
      o.dolu++;
      if (sayiMi(k)) {
        const metin = String(v);
        if (ondalikOlcek(metin) > o.olcek) {
          o.toplam = o.toplam * 10n ** BigInt(ondalikOlcek(metin) - o.olcek);
          o.olcek = ondalikOlcek(metin);
        }
        o.toplam += ondalikBigInt(metin, o.olcek);
      } else if (k.udt_name === 'bool') {
        if (v) o.true++;
      } else if (k.udt_name === 'bytea') {
        o.uzunluk += Buffer.from(v.$b64, 'base64').length;
      } else if (metinMi(k)) {
        o.uzunluk += [...v].length;
      } else if (zamanMi(k)) {
        const norm = String(v);
        if (o.min === null || norm < o.min) o.min = norm;
        if (o.max === null || norm > o.max) o.max = norm;
      }
    }
  }
  return ist;
}

// ---------- hedefler ----------

async function mariadbBaglan() {
  const mysql = require('mysql2/promise');
  const baglanti = await mysql.createConnection({
    host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    charset: 'utf8mb4',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    supportBigNumbers: true,
    bigNumberStrings: true,
    dateStrings: true,
    decimalNumbers: false,
  });
  await baglanti.query("SET SESSION time_zone = '+00:00'");
  await baglanti.query('SET SESSION foreign_key_checks = 0');
  return baglanti;
}

async function pgBaglan() {
  const { Client, types } = require('pg');
  for (const oid of [1082, 1114, 1184, 1700, 20]) types.setTypeParser(oid, (v) => v);
  const c = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await c.connect();
  return c;
}

async function yukle() {
  const siraliTablolar = sirala();
  console.log(`Yedek: ${yedekKlasoru}\nHedef: ${hedef} ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`);

  let db;
  let calistir;
  if (hedef === 'mariadb') {
    // Şemayı depodaki initDb ile kur (yoksa); varsayılan satırlar aşağıda boşaltılır.
    process.env.NODE_ENV = process.env.NODE_ENV || 'development';
    const { initializeDatabase } = require('../../core/veritabani/initDb');
    await initializeDatabase();
    const { pool } = require('../../core/veritabani/db');
    await pool.end();
    db = await mariadbBaglan();
    calistir = (sql, p) => db.execute(sql, p);
  } else {
    db = await pgBaglan();
    calistir = (sql, p) => db.query(sql, p);
  }

  const sadeceDogrula = bayrak('--sadece-dogrula');
  if (!sadeceDogrula) {
    // Boşalt
    if (hedef === 'mariadb') {
      // TRUNCATE: AUTO_INCREMENT sayaçları da sıfırlanır (foreign_key_checks oturumda kapalıdır).
      for (const t of [...siraliTablolar].reverse()) if (!atla.has(t)) await db.query(`TRUNCATE TABLE ${t}`);
      await db.query('DELETE FROM fis_no_kilidi');
      await db.query('INSERT INTO fis_no_kilidi (id) VALUES (1)');
      // Dizi: SETVAL geriye gitmez; ilk değere ALTER SEQUENCE ile dönülür
      await db.query('ALTER SEQUENCE vitrin_ilan_no_seq RESTART 1');
    } else {
      await db.query(`TRUNCATE ${siraliTablolar.join(', ')} RESTART IDENTITY CASCADE`);
    }

    // Yükle
    for (const tablo of siraliTablolar) {
      if (atla.has(tablo)) {
        console.log(`${tablo.padEnd(28)} atlandı (doğrulama yine yapılır)`);
        continue;
      }
      const kolonlar = kolonlarOf(tablo);
      const adlar = kolonlar.map((k) => k.column_name);
      const yer = hedef === 'mariadb' ? adlar.map(() => '?').join(', ') : adlar.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO ${tablo} (${adlar.join(', ')}) VALUES (${yer})`;
      let n = 0;
      for await (const satir of satirlar(tablo)) {
        await calistir(
          sql,
          kolonlar.map((k) => degerCevir(satir[k.column_name], k)),
        );
        n++;
      }
      console.log(`${tablo.padEnd(28)} ${String(n).padStart(7)} satır yüklendi`);
    }

    // Dizileri / AUTO_INCREMENT değerlerini ayarla (PostgreSQL'deki gibi silinen numaralar yeniden kullanılmaz)
    for (const d of sema.diziler) {
      if (d.last_value === null || d.last_value === undefined) continue;
      const son = Number(d.last_value);
      if (d.sequencename === 'vitrin_ilan_no_seq') {
        if (hedef === 'mariadb') await db.query(`ALTER SEQUENCE vitrin_ilan_no_seq RESTART ${son + 1}`);
        else await db.query(`SELECT setval('vitrin_ilan_no_seq', ${son})`);
        continue;
      }
      const m = /^(.*)_id_seq$/.exec(d.sequencename);
      if (!m) continue;
      if (hedef === 'mariadb') await db.query(`ALTER TABLE ${m[1]} AUTO_INCREMENT = ${son + 1}`);
      else await db.query(`SELECT setval('${d.sequencename}', ${son})`);
    }
  }

  // ---------- doğrulama ----------
  console.log('\nDoğrulama (yedek dosyası ↔ hedef veritabanı)');
  let hata = 0;
  for (const tablo of siraliTablolar) {
    const kolonlar = kolonlarOf(tablo);
    const ist = await kaynakIstatistik(tablo);
    const sorgular = ['COUNT(*) AS satir'];
    for (const k of kolonlar) {
      const c = k.column_name;
      const q = hedef === 'mariadb' ? '`' : '"';
      const col = `${q}${c}${q}`;
      sorgular.push(`COUNT(${col}) AS ${q}${c}__dolu${q}`);
      if (sayiMi(k)) sorgular.push(`COALESCE(SUM(${col}), 0) AS ${q}${c}__toplam${q}`);
      else if (k.udt_name === 'bool') sorgular.push(`COALESCE(SUM(CASE WHEN ${col} THEN 1 ELSE 0 END), 0) AS ${q}${c}__dogru${q}`);
      else if (k.udt_name === 'bytea') sorgular.push(`COALESCE(SUM(${hedef === 'mariadb' ? 'LENGTH' : 'OCTET_LENGTH'}(${col})), 0) AS ${q}${c}__uzunluk${q}`);
      else if (metinMi(k)) sorgular.push(`COALESCE(SUM(CHAR_LENGTH(${col})), 0) AS ${q}${c}__uzunluk${q}`);
      else if (zamanMi(k)) {
        sorgular.push(`MIN(${col}) AS ${q}${c}__min${q}`, `MAX(${col}) AS ${q}${c}__max${q}`);
      }
    }
    const sonuc =
      hedef === 'mariadb'
        ? (await db.query(`SELECT ${sorgular.join(', ')} FROM ${tablo}`))[0][0]
        : (await db.query(`SELECT ${sorgular.join(', ')} FROM ${tablo}`)).rows[0];
    const sorunlar = [];
    if (Number(sonuc.satir) !== ist.satir) sorunlar.push(`satır: yedek ${ist.satir}, hedef ${sonuc.satir}`);
    if (ist.satir !== ozet[tablo].satir) sorunlar.push(`yedek dosyası eksik: _ozet ${ozet[tablo].satir}, dosya ${ist.satir}`);
    for (const k of kolonlar) {
      const c = k.column_name;
      const o = ist.kolon[c];
      if (Number(sonuc[`${c}__dolu`]) !== o.dolu) sorunlar.push(`${c}: dolu sayısı yedek ${o.dolu}, hedef ${sonuc[`${c}__dolu`]}`);
      if (sayiMi(k)) {
        const hedefToplam = String(sonuc[`${c}__toplam`]);
        const olcek = Math.max(o.olcek, ondalikOlcek(hedefToplam));
        const a = ondalikBigInt(hedefToplam, olcek);
        const b = o.toplam * 10n ** BigInt(olcek - o.olcek);
        if (a !== b) sorunlar.push(`${c}: toplam yedek ${ondalikYaz(o.toplam, o.olcek)}, hedef ${hedefToplam}`);
      } else if (k.udt_name === 'bool') {
        if (Number(sonuc[`${c}__dogru`]) !== o.true) sorunlar.push(`${c}: true sayısı yedek ${o.true}, hedef ${sonuc[`${c}__dogru`]}`);
      } else if (k.udt_name === 'bytea' || metinMi(k)) {
        if (Number(sonuc[`${c}__uzunluk`]) !== o.uzunluk) sorunlar.push(`${c}: uzunluk toplamı yedek ${o.uzunluk}, hedef ${sonuc[`${c}__uzunluk`]}`);
      } else if (zamanMi(k)) {
        const norm = (v) =>
          v === null || v === undefined
            ? null
            : String(v instanceof Date ? v.toISOString() : v)
                .replace('T', ' ')
                .replace('Z', '')
                .replace(/(\.\d*?)0+$/, '$1')
                .replace(/\.$/, '');
        const hm = norm(sonuc[`${c}__min`]);
        const hx = norm(sonuc[`${c}__max`]);
        const ym = o.min === null ? null : norm(o.min);
        const yx = o.max === null ? null : norm(o.max);
        if (hm !== ym) sorunlar.push(`${c}: min yedek ${ym}, hedef ${hm}`);
        if (hx !== yx) sorunlar.push(`${c}: max yedek ${yx}, hedef ${hx}`);
      }
    }
    if (sorunlar.length) {
      hata += sorunlar.length;
      console.log(`  ✖ ${tablo}`);
      sorunlar.forEach((s) => console.log(`      ${s}`));
    } else {
      console.log(`  ✔ ${tablo.padEnd(28)} ${String(ist.satir).padStart(6)} satır, ${kolonlar.length} sütun doğrulandı`);
    }
  }

  // Yabancı anahtar bütünlüğü (MariaDB'de yükleme sırasında kontrol kapalıydı)
  if (hedef === 'mariadb') {
    await db.query('SET SESSION foreign_key_checks = 1');
    for (const f of sema.yabanciAnahtarlar) {
      const [[r]] = await db.query(
        `SELECT COUNT(*) AS n FROM ${f.table_name} c LEFT JOIN ${f.ref_table} p ON c.${f.column_name} = p.${f.ref_column} WHERE c.${f.column_name} IS NOT NULL AND p.${f.ref_column} IS NULL`,
      );
      if (Number(r.n) > 0) {
        hata++;
        console.log(`  ✖ yetim kayıt: ${f.table_name}.${f.column_name} -> ${f.ref_table}: ${r.n}`);
      }
    }
    console.log('  ✔ yabancı anahtar bütünlüğü kontrol edildi');
  }

  if (hedef === 'mariadb') await db.end();
  else await db.end();

  if (hata) {
    console.error(`\nDOĞRULAMA BAŞARISIZ: ${hata} sorun.`);
    process.exit(2);
  }
  console.log('\nDOĞRULAMA TAMAM: yedekle hedef birebir aynı.');
}

yukle().catch((e) => {
  console.error('Yükleme başarısız:', e);
  process.exit(1);
});
