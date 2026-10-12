const mysql = require('mysql2/promise');
const { compileQuery, parseUtcDateTime, splitUpdateReturning } = require('./sqlParams');

// Eski kodun beklediği node-pg arayüzü korunur: `pool.query(text, params)` ve
// `pool.connect()` -> `client.query(...)` / `client.release()`; sonuç `{ rows, rowCount }`.
// Böylece route dosyalarındaki $1, $2 parametreli sorgular ve BEGIN/COMMIT/ROLLBACK
// akışı olduğu gibi çalışır; yalnızca PostgreSQL'e özel SQL sözdizimi elle çevrilmiştir.

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// Her bağlantıda oturum ayarları:
//   * time_zone UTC: NOW() / CURRENT_DATE eski PostgreSQL kurulumundaki gibi UTC'ye göre
//     hesaplanır (Hostinger sunucusunun yerel saatine göre değil).
//   * Katı sql_mode: fazla uzun metin ya da geçersiz değer sessizce kırpılmaz, hata verir
//     (PostgreSQL davranışı). Hostinger'ın varsayılanı katı DEĞİLDİR.
//   * PIPES_AS_CONCAT: SQL'deki `a || b` PostgreSQL'deki gibi metin birleştirir.
//   * collation_connection: parametreler de kolonlar gibi harfi harfine karşılaştırılır.
const SESSION_SETUP =
  "SET SESSION time_zone = '+00:00', " +
  "sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION,PIPES_AS_CONCAT', " +
  "collation_connection = 'utf8mb4_nopad_bin'";

function poolOptionsFromEnv() {
  const base = {
    charset: 'utf8mb4',
    // DATETIME değerleri UTC'dir. Okurken çeviri typeCast içinde yapılır.
    timezone: 'Z',
    waitForConnections: true,
    // Hostinger'da hesabın süreç/iş parçacığı kotası dardır; havuz küçük tutulur.
    connectionLimit: numberFromEnv('DB_POOL_MAX', process.env.NODE_ENV === 'production' ? 4 : 10),
    idleTimeout: numberFromEnv('DB_IDLE_TIMEOUT_MS', 60000),
    connectTimeout: numberFromEnv('DB_CONNECTION_TIMEOUT_MS', 15000),
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // BIGINT (COUNT, SUM ...) metin olarak döner: node-pg de int8'i metin veriyordu,
    // API yanıtlarındaki sayaçların tipi değişmesin. DECIMAL zaten metin döner.
    supportBigNumbers: true,
    bigNumberStrings: true,
    typeCast: (field, next) => {
      // BOOLEAN (TINYINT(1)) kolonları true/false olarak döner (PostgreSQL boolean karşılığı).
      if (field.type === 'TINY' && field.length === 1) {
        const value = field.string();
        return value === null ? null : value === '1';
      }
      // mysql2'nin kendi tarih çevirisi 100'den küçük yılları kaydırır; çeviri elle yapılır.
      if (field.type === 'DATETIME' || field.type === 'TIMESTAMP') {
        const value = field.string();
        return value === null ? null : parseUtcDateTime(value);
      }
      return next();
    },
  };

  // Dışarıdan (srvNNNN.hstgr.io) bağlanırken SSL gerekirse DB_SSL=true. Hostinger'da uygulama
  // 127.0.0.1 ile bağlandığı için normalde gerekmez.
  if (process.env.DB_SSL === 'true') base.ssl = { rejectUnauthorized: false };

  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      ...base,
      host: url.hostname === 'localhost' ? '127.0.0.1' : url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    };
  }

  return {
    ...base,
    // localhost IPv6'ya (::1) çözülebilir; veritabanı kullanıcısının o adres için izni olmayabilir.
    host: !process.env.DB_HOST || process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  };
}

const rawPool = mysql.createPool(poolOptionsFromEnv());

// Oturum ayarı, bağlantıdaki ilk komut olarak kuyruğa girer; sonraki sorgular her zaman
// bu ayarlarla çalışır. (Olayla gelen nesne mysql2'nin geri çağırmalı çekirdek bağlantısıdır.)
rawPool.on('connection', (connection) => {
  connection.query(SESSION_SETUP, (err) => {
    if (err) console.error('Veritabanı oturum ayarı yapılamadı:', err.message);
  });
});

const TRANSIENT_DB_ERROR_CODES = new Set([
  'ER_LOCK_DEADLOCK',
  'ER_LOCK_WAIT_TIMEOUT',
  'ER_CON_COUNT_ERROR',
  'ER_USER_LIMIT_REACHED',
  'ER_SERVER_SHUTDOWN',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_SEQUENCE_TIMEOUT',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
]);

function isTransientDbError(error) {
  const message = ((error && error.message) || '').toLowerCase();
  return (
    Boolean(error && error.code && TRANSIENT_DB_ERROR_CODES.has(error.code)) ||
    message.includes('connection lost') ||
    message.includes('connection is in closed state') ||
    message.includes('too many connections')
  );
}

/** Sunucunun kabul ettiği en büyük paket (bayt); yükleme sınırlarını buna göre belirlemek için. */
let paketSiniri = null;
async function maxPaket() {
  if (paketSiniri === null) {
    const [[satir]] = await rawPool.query('SELECT @@max_allowed_packet AS p');
    paketSiniri = Number(satir.p);
  }
  return paketSiniri;
}

/** Paket sınırını aştığı için reddedilen sorgu mu? */
function paketHatasi(error) {
  return Boolean(error) && (error.code === 'ER_NET_PACKET_TOO_LARGE' || error.code === 'ER_NET_ERROR_ON_WRITE' || /max_allowed_packet|Got a packet bigger/i.test(error.message || ''));
}

/** Tekil (UNIQUE) kısıt ihlali mi? (PostgreSQL'deki 23505 kodunun karşılığı) */
function isUniqueViolation(error) {
  return Boolean(error) && error.code === 'ER_DUP_ENTRY';
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function toResult(raw) {
  if (Array.isArray(raw)) return { rows: raw, rowCount: raw.length };
  return { rows: [], rowCount: raw.affectedRows ?? 0, insertId: raw.insertId };
}

// Bu boyutun üstündeki ikili (Buffer) parametre içeren sorgular hazır ifadeyle gönderilir (bkz. sqlParams).
const BUYUK_IKILI = 64 * 1024;

function derle(text, params) {
  if (params && params.some((p) => Buffer.isBuffer(p) && p.length > BUYUK_IKILI)) {
    const degerler = [];
    return { sql: compileQuery(text, params, degerler), degerler };
  }
  return { sql: compileQuery(text, params) };
}

/**
 * Tek bir bağlantıda sorgu çalıştırır. `UPDATE ... RETURNING` (MariaDB'de yok) iki
 * cümleye bölünür: önce UPDATE, sonra aynı koşulla SELECT; ikisi aynı bağlantıdadır.
 */
async function runOn(connection, text, params) {
  const parts = splitUpdateReturning(text);
  if (parts) {
    await connection.query(compileQuery(parts.update, params));
    const [raw] = await connection.query(compileQuery(parts.select, params));
    return toResult(raw);
  }
  const { sql, degerler } = derle(text, params);
  const [raw] = degerler ? await connection.execute(sql, degerler) : await connection.query(sql);
  return toResult(raw);
}

async function query(text, params, retries = 2) {
  // UPDATE ... RETURNING: güncelleme ve geri okuma aynı transaction'da.
  if (splitUpdateReturning(text)) {
    const connection = await rawPool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await runOn(connection, text, params);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback().catch(() => undefined);
      throw error;
    } finally {
      connection.release();
    }
  }

  // Yeniden deneme yalnızca okuma sorgularında güvenlidir: yazma, bağlantı kopması
  // anında yarım kalmış olabilir ve tekrarı çift kayıt açabilir.
  const retryable = /^\s*(SELECT|WITH|SHOW)\b/i.test(text);
  const { sql, degerler } = derle(text, params);
  for (let attempt = 0; ; attempt++) {
    try {
      const [raw] = degerler ? await rawPool.execute(sql, degerler) : await rawPool.query(sql);
      return toResult(raw);
    } catch (error) {
      if (!retryable || !isTransientDbError(error) || attempt >= retries) throw error;
      const delay = 300 * (attempt + 1);
      console.warn(`Geçici veritabanı hatası, sorgu tekrar denenecek (${attempt + 1}/${retries}): ${error.message}`);
      await wait(delay);
    }
  }
}

async function connect() {
  const connection = await rawPool.getConnection();
  let released = false;
  return {
    query: (text, params) => runOn(connection, text, params),
    release: () => {
      if (released) return;
      released = true;
      connection.release();
    },
  };
}

const pool = {
  query,
  connect,
  end: () => rawPool.end(),
  on: (event, handler) => rawPool.on(event, handler),
  raw: rawPool,
};

module.exports = { pool, isUniqueViolation, maxPaket, paketHatasi };
