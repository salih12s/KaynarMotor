/*
 * E2E için tek kullanımlık veritabanını SIFIRDAN kurar (her koşuda). Backend açılırken şemayı (initDb) ve admin hesabını kendisi oluşturur.
 *
 * Neden ayrı veritabanı: ortak "kaynar_test" API testlerinden binlerce kayıt biriktirir (iş emri listesi sayfalamasız hepsini çizer,
 * pencereler saniyelerce donar) ve sayaçlar her koşuda değişir. Boş veritabanı hem hızlı hem tekrarlanabilir olur.
 *
 * Güvenlik: yalnızca yerel sunucuda ve TAM OLARAK "test_kaynar_e2e" adlı veritabanını siler. Başka ad verilirse hiçbir şey yapmaz.
 * (Ad "test_" ile başlar çünkü MariaDB'de "kaynar" kullanıcısının yalnızca bu desene ve üç kaynar_* veritabanına yetkisi var.)
 */
const path = require('node:path');
const mysql = require(path.join(__dirname, '..', 'backend', 'node_modules', 'mysql2', 'promise'));

const IZINLI_AD = 'test_kaynar_e2e';

(async () => {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (DB_NAME !== IZINLI_AD || !['127.0.0.1', 'localhost'].includes(DB_HOST)) {
    throw new Error(`Güvenlik: yalnızca yerel "${IZINLI_AD}" veritabanı sıfırlanır (host="${DB_HOST}", db="${DB_NAME}").`);
  }
  const bag = await mysql.createConnection({ host: DB_HOST, port: Number(DB_PORT), user: DB_USER, password: DB_PASSWORD });
  await bag.query(`DROP DATABASE IF EXISTS \`${IZINLI_AD}\``);
  await bag.query(`CREATE DATABASE \`${IZINLI_AD}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await bag.end();
  console.log(`[e2e] ${IZINLI_AD} sıfırdan kuruldu`);
})().catch((e) => {
  console.error('[e2e] veritabanı hazırlanamadı:', e.message);
  process.exit(1);
});
