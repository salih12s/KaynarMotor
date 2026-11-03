/*
 * sqlText yardımcıları (saf fonksiyonlar, veritabanı yok). Regression: arama metnindeki `%` ve `_` LIKE jokeri olarak çalışıyordu
 * (E03: `/musteriler/ara/%` bütün kayıtları döndürdü). Kullanıcının yazdığı metin düz metin sayılmalıdır.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { aramaIcerir, aramaDeseni, trGunu, TR_SAAT_FARKI } = require('../../database/sqlText');

test('aramaIcerir: düz metin %...% içine alınır; Türkçe küçük harf ve ı → i kuralı aramaDeseni ile aynı', () => {
  assert.equal(aramaIcerir('YILMAZ'), '%yilmaz%');
  assert.equal(aramaIcerir('Işık'), '%işik%'); // I → ı (tr) → i; ş değişmez
  assert.equal(aramaIcerir('ahmet'), `%${aramaDeseni('ahmet')}%`);
});

test('aramaIcerir: kullanıcının yazdığı % ve _ joker değil düz karakterdir (kaçışlanır)', () => {
  assert.equal(aramaIcerir('%'), '%\\%%');
  assert.equal(aramaIcerir('a_b'), '%a\\_b%');
  assert.equal(aramaIcerir('100%'), '%100\\%%');
});

test('aramaIcerir: ters eğik çizgi de kaçışlanır (yoksa kullanıcı kendi kaçışını yazabilirdi)', () => {
  assert.equal(aramaIcerir('a\\b'), '%a\\\\b%');
  assert.equal(aramaIcerir('\\%'), '%\\\\\\%%');
});

test('aramaIcerir: boş metin her şeyi eşler (çağıranlar kısa sorguyu kendileri eler)', () => {
  assert.equal(aramaIcerir(''), '%%');
});

// Regression (E17): DATETIME kolonları UTC saklanır; DATE(kolon) UTC gününü verir, Türkiye saatiyle 00:00-03:00 arası kayıtlar önceki güne düşerdi.
test('trGunu: DATETIME kolonunu Türkiye gününe çevirir (UTC+3 eklenir); ifade ve sabit tutarlı', () => {
  assert.equal(TR_SAAT_FARKI, 3);
  assert.equal(trGunu('tamamlama_tarihi'), 'DATE(tamamlama_tarihi + INTERVAL 3 HOUR)');
  assert.equal(trGunu("COALESCE(a.tamamlama_tarihi, a.created_at)"), 'DATE(COALESCE(a.tamamlama_tarihi, a.created_at) + INTERVAL 3 HOUR)');
});
