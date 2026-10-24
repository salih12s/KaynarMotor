const test = require('node:test');
const assert = require('node:assert/strict');
const { compileQuery, parseUtcDateTime, splitUpdateReturning, encodeParam } = require('../../core/veritabani/sqlParams');

test('$n yer tutucuları tırnaklı metin olarak yerleşir; sayı da tırnaklıdır', () => {
  assert.equal(compileQuery('SELECT * FROM t WHERE id = $1 AND ad = $2', [5, 'ali']), "SELECT * FROM t WHERE id = '5' AND ad = 'ali'");
});

test('aynı parametre birden çok kez ve sırasız kullanılabilir', () => {
  assert.equal(compileQuery('WHERE a = $2 OR b = $2 OR c = $1', ['x', 'y']), "WHERE a = 'y' OR b = 'y' OR c = 'x'");
});

test('enjeksiyon denemesi metin sabiti içinde kalır (tırnak ve ters bölü kaçışlanır)', () => {
  const sql = compileQuery('SELECT * FROM kullanicilar WHERE kullanici_adi = $1', ["' OR '1'='1"]);
  assert.equal(sql, "SELECT * FROM kullanicilar WHERE kullanici_adi = '\\' OR \\'1\\'=\\'1'");
  assert.equal(encodeParam('a\\'), "'a\\\\'");
});

test('nesne ve dizi parametre SQL parçasına genişlemez (JSON metni olur)', () => {
  assert.equal(compileQuery('WHERE ad = $1', [{ $ne: 1 }]), `WHERE ad = '{\\"$ne\\":1}'`);
});

test('boolean 1/0, null NULL, NaN NULL olur', () => {
  assert.equal(compileQuery('VALUES ($1, $2, $3, $4)', [true, false, null, NaN]), "VALUES ('1', '0', NULL, NULL)");
});

test('Date UTC metnine çevrilir', () => {
  assert.equal(encodeParam(new Date('2026-10-04T10:30:05.123Z')), "'2026-10-04 10:30:05.123'");
});

test('Buffer onaltılık sabit olur', () => {
  assert.equal(encodeParam(Buffer.from([1, 255])), "X'01ff'");
});

test('LIMIT / OFFSET yalnızca negatif olmayan tam sayı kabul eder ve tırnaksız yazar', () => {
  assert.equal(compileQuery('SELECT 1 LIMIT $1 OFFSET $2', [20, '5']), 'SELECT 1 LIMIT 20 OFFSET 5');
  assert.throws(() => compileQuery('SELECT 1 LIMIT $1', ['1; DROP TABLE t']), /LIMIT/);
  assert.throws(() => compileQuery('SELECT 1 LIMIT $1', [-1]), /LIMIT/);
});

test('metin sabitinin ve yorumun içindeki $1 değişmez', () => {
  assert.equal(compileQuery("SELECT '$1' -- $1\n, $1", ['a']), "SELECT '$1' -- $1\n, 'a'");
  assert.equal(compileQuery('SELECT /* $1 */ $1', ['a']), "SELECT /* $1 */ 'a'");
});

test('eksik parametre hata verir', () => {
  assert.throws(() => compileQuery('SELECT $2', ['a']), /\$2/);
});

test('$n::tip dönüşümü atılır', () => {
  assert.equal(compileQuery('WHERE id = $1::int AND d = $2::date', [1, '2026-01-01']), "WHERE id = '1' AND d = '2026-01-01'");
});

test('= ANY($n) dizi parametresi IN listesine açılır', () => {
  assert.equal(compileQuery('WHERE id = ANY($1) ORDER BY id', [[1, 2, 3]]), "WHERE id IN ('1', '2', '3') ORDER BY id");
  assert.equal(compileQuery('WHERE id = ANY($1::int[])', [[7]]), "WHERE id IN ('7')");
});

test('= ANY boş dizi hiçbir satırla eşleşmez', () => {
  assert.equal(compileQuery('WHERE id = ANY($1)', [[]]), 'WHERE id IN (NULL)');
});

test('parseUtcDateTime: milisaniye korunur, 100 yılından küçük yıl kaymaz', () => {
  assert.equal(parseUtcDateTime('2026-10-04 10:30:05.123456').toISOString(), '2026-10-04T10:30:05.123Z');
  assert.equal(parseUtcDateTime('0001-01-01 00:00:00').getUTCFullYear(), 1);
  assert.ok(Number.isNaN(parseUtcDateTime('bozuk').getTime()));
});

test('splitUpdateReturning: UPDATE ... RETURNING iki cümleye bölünür', () => {
  const p = splitUpdateReturning('UPDATE t SET a = $1, b = b + 1 WHERE id = $2 RETURNING id, a');
  assert.equal(p.update, 'UPDATE t SET a = $1, b = b + 1 WHERE id = $2');
  assert.equal(p.select, 'SELECT id, a FROM t WHERE id = $2');
});

test('splitUpdateReturning: RETURNING olmayan ve INSERT cümleleri için null', () => {
  assert.equal(splitUpdateReturning('UPDATE t SET a = 1 WHERE id = 2'), null);
  assert.equal(splitUpdateReturning('INSERT INTO t (a) VALUES (1) RETURNING id'), null);
});

test('parantezsiz CURRENT_TIMESTAMP mikrosaniyeli olur; (6) verilmişse ve metin içindeyse dokunulmaz', () => {
  assert.equal(compileQuery('SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [1]), "SET updated_at = CURRENT_TIMESTAMP(6) WHERE id = '1'");
  assert.equal(compileQuery('SELECT CURRENT_TIMESTAMP(6), current_timestamp', []), 'SELECT CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6)');
  assert.equal(compileQuery("SELECT 'CURRENT_TIMESTAMP', MY_CURRENT_TIMESTAMP", []), "SELECT 'CURRENT_TIMESTAMP', MY_CURRENT_TIMESTAMP");
});

test('ISO tarih-saat metninin saat dilimi eki atılır (PostgreSQL gibi saat çevrilmez)', () => {
  assert.equal(encodeParam('2026-10-04T10:30:00.000Z'), "'2026-10-04 10:30:00.000'");
  assert.equal(encodeParam('2026-10-04T23:30:00+03:00'), "'2026-10-04 23:30:00'");
  assert.equal(encodeParam('2026-10-04T10:30:00.123456789Z'), "'2026-10-04 10:30:00.123456'");
  assert.equal(encodeParam('2026-10-04T10:30Z'), "'2026-10-04 10:30'");
});

test('ISO biçimi olmayan ya da başka metin içindeki tarihe dokunulmaz', () => {
  assert.equal(encodeParam('2026-10-04'), "'2026-10-04'");
  assert.equal(encodeParam('2026-10-04T10:30:00'), "'2026-10-04T10:30:00'");
  assert.equal(encodeParam('Teslim 2026-10-04T10:30:00Z tarihinde'), "'Teslim 2026-10-04T10:30:00Z tarihinde'");
});

test('hazır ifade modu: değerler ? ile yer değiştirir, sırayla toplanır; LIMIT ve ANY metne yazılır', () => {
  const degerler = [];
  const sql = compileQuery('INSERT INTO t (a, b, c, d) VALUES ($1, $2, $3, $1) RETURNING id', ['x', Buffer.from([1, 2]), true], degerler);
  assert.equal(sql, 'INSERT INTO t (a, b, c, d) VALUES (?, ?, ?, ?) RETURNING id');
  assert.deepEqual(degerler, ['x', Buffer.from([1, 2]), '1', 'x']);
  const d2 = [];
  assert.equal(compileQuery('SELECT 1 WHERE id = ANY($1) AND a = $2 LIMIT $3', [[1, 2], 'a', 5], d2), "SELECT 1 WHERE id IN ('1', '2') AND a = ? LIMIT 5");
  assert.deepEqual(d2, ['a']);
});

test('hazır ifade modu: ISO tarih saat dilimi atılır, null/NaN null, Date UTC metni', () => {
  const d = [];
  compileQuery('VALUES ($1, $2, $3, $4)', ['2026-10-04T10:30:00.000Z', null, NaN, new Date('2026-10-04T10:30:05.123Z')], d);
  assert.deepEqual(d, ['2026-10-04 10:30:00.000', null, null, '2026-10-04 10:30:05.123']);
});
