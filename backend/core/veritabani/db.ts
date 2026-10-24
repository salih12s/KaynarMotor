import mysql from 'mysql2/promise';
import type { PoolConnection, PoolOptions } from 'mysql2/promise';
import { compileQuery, parseUtcDateTime, splitUpdateReturning } from './sqlParams';
import { GecersizIstek } from '../dogrulama/dogrula';
import type { Baglanti, SqlSonuc } from '../tipler';

// Katı SQL modu fazla uzun / aralık dışı değeri hata olarak reddeder. Bu kullanıcının düzeltebileceği bir hatadır
// (400); eskiden her uç "Sunucu hatası" (500) dönüyordu.
const GECERSIZ_DEGER_KODLARI = new Set(['ER_DATA_TOO_LONG', 'ER_WARN_DATA_OUT_OF_RANGE', 'ER_TRUNCATED_WRONG_VALUE', 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD']);
function istemciHatasinaCevir(error: any): any {
  if (error && GECERSIZ_DEGER_KODLARI.has(error.code)) {
    return new GecersizIstek('Alanlardan biri çok uzun ya da geçersiz; lütfen değerleri kontrol edin');
  }
  return error;
}

// Eski kodun beklediği node-pg arayüzü korunur: `pool.query(text, params)` ve
// `pool.connect()` -> `client.query(...)` / `client.release()`; sonuç `{ rows, rowCount }`.
// Böylece route dosyalarındaki $1, $2 parametreli sorgular ve BEGIN/COMMIT/ROLLBACK
// akışı olduğu gibi çalışır; yalnızca PostgreSQL'e özel SQL sözdizimi elle çevrilmiştir.

function numberFromEnv(name: string, fallback: number): number {
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

function poolOptionsFromEnv(): PoolOptions {
  const base: PoolOptions = {
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
    typeCast: (field: any, next: () => unknown) => {
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
rawPool.on('connection', (connection: any) => {
  connection.query(SESSION_SETUP, (err: Error | null) => {
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

function isTransientDbError(error: any): boolean {
  const message = ((error && error.message) || '').toLowerCase();
  return (
    Boolean(error && error.code && TRANSIENT_DB_ERROR_CODES.has(error.code)) ||
    message.includes('connection lost') ||
    message.includes('connection is in closed state') ||
    message.includes('too many connections')
  );
}

/** Sunucunun kabul ettiği en büyük paket (bayt); yükleme sınırlarını buna göre belirlemek için. */
let paketSiniri: number | null = null;
export async function maxPaket(): Promise<number> {
  if (paketSiniri === null) {
    const [[satir]] = (await rawPool.query('SELECT @@max_allowed_packet AS p')) as unknown as [[{ p: string | number }]];
    paketSiniri = Number(satir.p);
  }
  return paketSiniri;
}

/** Paket sınırını aştığı için reddedilen sorgu mu? */
export function paketHatasi(error: any): boolean {
  return (
    Boolean(error) &&
    (error.code === 'ER_NET_PACKET_TOO_LARGE' || error.code === 'ER_NET_ERROR_ON_WRITE' || /max_allowed_packet|Got a packet bigger/i.test(error.message || ''))
  );
}

/** Tekil (UNIQUE) kısıt ihlali mi? (PostgreSQL'deki 23505 kodunun karşılığı) */
export function isUniqueViolation(error: any): boolean {
  return Boolean(error) && error.code === 'ER_DUP_ENTRY';
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function toResult(raw: any): SqlSonuc {
  if (Array.isArray(raw)) return { rows: raw, rowCount: raw.length };
  return { rows: [], rowCount: raw.affectedRows ?? 0, insertId: raw.insertId };
}

// Bu boyutun üstündeki ikili (Buffer) parametre içeren sorgular hazır ifadeyle gönderilir (bkz. sqlParams).
const BUYUK_IKILI = 64 * 1024;

function derle(text: string, params?: unknown[]): { sql: string; degerler?: any[] } {
  if (params && params.some((p) => Buffer.isBuffer(p) && p.length > BUYUK_IKILI)) {
    const degerler: any[] = [];
    return { sql: compileQuery(text, params, degerler), degerler };
  }
  return { sql: compileQuery(text, params) };
}

/**
 * Tek bir bağlantıda sorgu çalıştırır. `UPDATE ... RETURNING` (MariaDB'de yok) iki
 * cümleye bölünür: önce UPDATE, sonra aynı koşulla SELECT; ikisi aynı bağlantıdadır.
 */
async function runOn(connection: PoolConnection, text: string, params?: unknown[]): Promise<SqlSonuc> {
  try {
    const parts = splitUpdateReturning(text);
    if (parts) {
      await connection.query(compileQuery(parts.update, params));
      const [raw] = await connection.query(compileQuery(parts.select, params));
      return toResult(raw);
    }
    const { sql, degerler } = derle(text, params);
    const [raw] = degerler ? await connection.execute(sql, degerler) : await connection.query(sql);
    return toResult(raw);
  } catch (error) {
    throw istemciHatasinaCevir(error);
  }
}

async function query(text: string, params?: unknown[], retries = 2): Promise<SqlSonuc> {
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
    } catch (error: any) {
      if (!retryable || !isTransientDbError(error) || attempt >= retries) throw istemciHatasinaCevir(error);
      const delay = 300 * (attempt + 1);
      console.warn(`Geçici veritabanı hatası, sorgu tekrar denenecek (${attempt + 1}/${retries}): ${error.message}`);
      await wait(delay);
    }
  }
}

async function connect(): Promise<Baglanti> {
  const connection = await rawPool.getConnection();
  let released = false;
  return {
    query: <T = any>(text: string, params?: unknown[]) => runOn(connection, text, params) as Promise<SqlSonuc<T>>,
    release: () => {
      if (released) return;
      released = true;
      connection.release();
    },
  };
}

/**
 * Transaction: BEGIN → işleyici → COMMIT. İşleyici hata fırlatırsa ROLLBACK yapılır ve hata aynen yukarı iletilir
 * (service'ler 404/403/409 gibi istemci hatalarını fırlatarak transaction'ı geri alır). Bağlantı her durumda bırakılır.
 */
async function withTransaction<T>(isleyici: (tx: Baglanti) => Promise<T>): Promise<T> {
  const client = await connect();
  try {
    await client.query('BEGIN');
    const sonuc = await isleyici(client);
    await client.query('COMMIT');
    return sonuc;
  } catch (hata) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw hata;
  } finally {
    client.release();
  }
}

export const pool = {
  query: query as <T = any>(text: string, params?: unknown[]) => Promise<SqlSonuc<T>>,
  connect,
  withTransaction,
  end: () => rawPool.end(),
  on: (event: string, handler: (...args: any[]) => void) => (rawPool as any).on(event, handler),
  raw: rawPool,
};
