/**
 * Numaralı ($1, $2 ...) parametreli SQL'i MariaDB'ye gönderilecek tek bir metne derler.
 *
 * Neden mysql2'nin kendi "?" yer tutucuları kullanılmıyor:
 *   1. Route'lar aynı parametreyi birden çok kez ($1 ... $1) ve dinamik sırayla kullanıyor;
 *      numaralı yer tutucu bunu yanlış sıralama riski olmadan taşır.
 *   2. mysql2 sayıları tırnaksız yerleştirir. MariaDB'de `kullanici_adi = 0` sayı olmayan
 *      BÜTÜN kullanıcı adlarıyla eşleşir. PostgreSQL'de parametre kolonun tipine uyar;
 *      bu sorun orada yoktur.
 *
 * KURAL: her değer tırnaklı metin olarak yerleştirilir (sayı '5', boolean '1'/'0', nesne
 * JSON metni). MariaDB metni kolonun tipine çevirir; karşılaştırma PostgreSQL'deki gibi
 * kolonun tipinde yapılır. Tek istisna LIMIT / OFFSET'tir: orada yalnızca doğrulanmış,
 * negatif olmayan tam sayı tırnaksız yazılır.
 *
 * Ek olarak:
 *   - `$n::tip` ve `$n::tip[]` dönüşümleri atılır (MariaDB'de yok).
 *   - `= ANY($n)` (n bir dizi) `IN (...)` olur; boş dizi hiçbir satırla eşleşmez.
 */

const ESCAPES = {
  '\0': '\\0',
  '\b': '\\b',
  '\t': '\\t',
  '\n': '\\n',
  '\r': '\\r',
  '\x1a': '\\Z',
  '"': '\\"',
  "'": "\\'",
  '\\': '\\\\',
};

function pad(value, width) {
  return String(value).padStart(width, '0');
}

/** UTC 'YYYY-MM-DD HH:MM:SS.mmm' (oturum saat dilimi UTC'dir). */
function formatDateUtc(date) {
  if (Number.isNaN(date.getTime())) throw new Error('Geçersiz tarih parametresi');
  return (
    `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)} ` +
    `${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)}` +
    `.${pad(date.getUTCMilliseconds(), 3)}`
  );
}

/**
 * Veritabanının yazdığı 'YYYY-MM-DD HH:MM:SS[.ffffff]' metnini UTC Date'e çevirir.
 * Milisaniyeden sonraki basamaklar atılır (node-pg de böyle yapıyordu).
 */
function parseUtcDateTime(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?)?$/.exec(text);
  if (!match) return new Date(NaN);
  const [, year, month, day, hour = '0', minute = '0', second = '0', fraction = ''] = match;
  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  date.setUTCHours(Number(hour), Number(minute), Number(second), Number(fraction.padEnd(3, '0').slice(0, 3)));
  return date;
}

/** Metni dize sabiti olarak kaçışlar (NO_BACKSLASH_ESCAPES kapalı varsayılır). */
function quoteString(value) {
  // eslint-disable-next-line no-control-regex
  return `'${value.replace(/[\0\b\t\n\r\x1a"'\\]/g, (ch) => ESCAPES[ch])}'`;
}

// İstemciden gelen '2026-10-04T10:30:00.000Z' / '...+03:00' biçimli tarih-saat metni.
// PostgreSQL date/timestamp kolonuna yazılırken saat dilimi ekini yok sayar ve saati olduğu
// gibi saklar; MariaDB katı modda aynı metni reddeder. Burada yalnızca ek atılır (saat
// ÇEVRİLMEZ), böylece davranış PostgreSQL ile aynı kalır. Yalnızca metnin TAMAMI bu
// biçimdeyse uygulanır; açıklama gibi serbest metinlere dokunulmaz.
const ISO_ZONLU = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)(\.\d{1,9})?(?:Z|[+-]\d{2}(?::?\d{2})?)$/;

function isoZonuAt(value) {
  const m = ISO_ZONLU.exec(value);
  if (!m) return value;
  return `${m[1]} ${m[2]}${m[3] ? m[3].slice(0, 7) : ''}`;
}

/** Tek bir parametreyi SQL sabitine çevirir. */
function encodeParam(value) {
  if (value === null || value === undefined) return 'NULL';

  switch (typeof value) {
    case 'string':
      return quoteString(isoZonuAt(value));
    case 'number':
      // parseInt('x') gibi bir sonuç (NaN): PostgreSQL'de hiçbir değerle eşleşmiyordu.
      // NULL de hiçbir değerle eşleşmez; sorgu hata vermeden boş sonuç döner.
      if (!Number.isFinite(value)) return 'NULL';
      return quoteString(String(value));
    case 'bigint':
      return quoteString(value.toString());
    case 'boolean':
      return value ? "'1'" : "'0'";
    case 'object':
      if (value instanceof Date) return quoteString(formatDateUtc(value));
      if (Buffer.isBuffer(value)) return `X'${value.toString('hex')}'`;
      // Nesne ve diziler tek bir metin değeri olur: SQL parçasına genişlemezler.
      return quoteString(JSON.stringify(value));
    default:
      throw new Error(`Desteklenmeyen parametre tipi: ${typeof value}`);
  }
}

/** Hazır ifade modunda bir parametrenin sunucuya gönderilecek değeri (encodeParam ile aynı anlam). */
function bindDeger(value) {
  if (value === null || value === undefined) return null;
  switch (typeof value) {
    case 'string':
      return isoZonuAt(value);
    case 'number':
      return Number.isFinite(value) ? String(value) : null;
    case 'bigint':
      return value.toString();
    case 'boolean':
      return value ? '1' : '0';
    default:
      if (value instanceof Date) return formatDateUtc(value);
      if (Buffer.isBuffer(value)) return value;
      return JSON.stringify(value);
  }
}

function encodeLimit(value, keyword) {
  const numeric = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof numeric !== 'number' || !Number.isSafeInteger(numeric) || numeric < 0) {
    throw new Error(`${keyword} için negatif olmayan tam sayı gerekli`);
  }
  return String(numeric);
}

/**
 * `$n` yer tutucularını parametre değerleriyle değiştirir. Dize sabitleri, ters
 * tırnaklı adlar ve yorumların içindeki `$n` dizilerine dokunulmaz.
 *
 * `degerler` (dizi) verilirse HAZIR İFADE modunda çalışır: parametreler SQL metnine yazılmaz, `?`
 * konur ve değerler bu diziye sırayla eklenir (mysql2 `execute(sql, degerler)` ile gönderilir).
 * Büyük ikili veri (belge yükleme) için kullanılır: X'hex' sabiti veriyi iki katına çıkarırdı ve
 * max_allowed_packet sınırını erken aşardı. LIMIT/OFFSET ve `= ANY($n)` her iki modda da metne yazılır.
 */
function compileQuery(text, params = [], degerler) {
  let out = '';
  let i = 0;
  const n = text.length;

  while (i < n) {
    const ch = text[i];

    if (ch === "'" || ch === '"' || ch === '`') {
      const start = i;
      i += 1;
      while (i < n) {
        if (text[i] === '\\' && ch !== '`') {
          i += 2;
          continue;
        }
        if (text[i] === ch) {
          if (text[i + 1] === ch) {
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      out += text.slice(start, i);
      continue;
    }

    if (ch === '-' && text[i + 1] === '-') {
      const end = text.indexOf('\n', i);
      const stop = end === -1 ? n : end;
      out += text.slice(i, stop);
      i = stop;
      continue;
    }

    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      out += text.slice(i, stop);
      i = stop;
      continue;
    }

    // Parantezsiz CURRENT_TIMESTAMP mikrosaniyeli olur (PostgreSQL gibi): kolonlar DATETIME(6);
    // saniye hassasiyetiyle aynı anda yazılan kayıtların sıralaması eşitlenirdi.
    if ((ch === 'C' || ch === 'c') && !/[A-Za-z0-9_$]/.test(text[i - 1] ?? ' ')) {
      const ts = /^CURRENT_TIMESTAMP\b(?!\s*\()/i.exec(text.slice(i, i + 20));
      if (ts) {
        out += 'CURRENT_TIMESTAMP(6)';
        i += ts[0].length;
        continue;
      }
    }

    if (ch === '$' && /\d/.test(text[i + 1] ?? '')) {
      let j = i + 1;
      while (j < n && /\d/.test(text[j])) j += 1;
      const index = Number(text.slice(i + 1, j));
      if (index < 1 || index > params.length) {
        throw new Error(`$${index} için parametre yok (${params.length} parametre verildi)`);
      }
      const value = params[index - 1];

      // `$n::tip` / `$n::tip[]` dönüşümünü at.
      const cast = /^::[a-zA-Z_][a-zA-Z0-9_]*(?:\(\s*\d+\s*(?:,\s*\d+\s*)?\))?(?:\[\])?/.exec(text.slice(j));
      const castLength = cast ? cast[0].length : 0;

      // `= ANY($n)`: dizi parametreyi IN (...) listesine aç.
      const any = /(=\s*ANY\s*\(\s*)$/i.exec(out);
      if (any && Array.isArray(value)) {
        const after = /^\s*\)/.exec(text.slice(j + castLength));
        if (after) {
          out = out.slice(0, out.length - any[1].length);
          out += value.length === 0 ? 'IN (NULL)' : `IN (${value.map(encodeParam).join(', ')})`;
          i = j + castLength + after[0].length;
          continue;
        }
      }

      const keyword = /\b(LIMIT|OFFSET)\s*$/i.exec(out)?.[1];
      if (keyword) out += encodeLimit(value, keyword.toUpperCase());
      else if (degerler) {
        degerler.push(bindDeger(value));
        out += '?';
      } else out += encodeParam(value);
      i = j + castLength;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

/**
 * `UPDATE t SET ... WHERE ... RETURNING kolonlar` cümlesini ikiye böler. MariaDB INSERT ve
 * DELETE için RETURNING destekler, UPDATE için desteklemez. SELECT aynı WHERE koşuluyla
 * çalışır; bu yüzden WHERE, SET ile değiştirilen bir kolona bağlı olmamalıdır.
 * UPDATE ... RETURNING değilse null döner.
 */
function splitUpdateReturning(text) {
  const match =
    /^\s*UPDATE\s+([A-Za-z_][A-Za-z0-9_]*)\s+SET\s+([\s\S]+?)\s+WHERE\s+([\s\S]+?)\s+RETURNING\s+([\s\S]+?)\s*;?\s*$/i.exec(
      text
    );
  if (!match) return null;
  const [, table, setClause, whereClause, returning] = match;
  return {
    update: `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`,
    select: `SELECT ${returning} FROM ${table} WHERE ${whereClause}`,
  };
}

module.exports = {
  compileQuery,
  encodeParam,
  quoteString,
  parseUtcDateTime,
  splitUpdateReturning,
};
