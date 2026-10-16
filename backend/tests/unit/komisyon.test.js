const test = require('node:test');
const assert = require('node:assert/strict');
const { hesaplaKomisyon, detectPlatform } = require('../../modules/eticaret/komisyon');

// Aynı test vektörleri frontend/src/utils/komisyon.test.js içinde de bulunur: iki kopya aynı sonucu vermelidir.
// Elle hesap (Trendyol, satış 1000, alış 500, komisyon %10, kargo 0):
//   KDV %0 : kdv kalemleri 0 → net = 1000 − 500 − 100 (komisyon) − 3,47 (hizmet) − 7,70 (stopaj) = 388,83
//   KDV %20: satıştan KDV 166,67 − alıştan 83,33 − komisyondan 16,67 − hizmetten 0,58 = 66,09 ödenecek → net 324,02
const T = (kdv, adet = 1) => hesaplaKomisyon(1000, 500, 10, kdv, 0, adet, 'trendyol');

test('KDV %0 gerçekten 0 olarak hesaplanır (eskiden sessizce 20 sayılıyordu)', () => {
  assert.equal(T(0).netKar, 388.83);
  assert.equal(T('0').netKar, 388.83);
  assert.equal(T('0.00').netKar, 388.83);
});

test('KDV %20 ve %10 beklenen değeri verir', () => {
  assert.equal(T(20).netKar, 324.02);
  assert.equal(T(10).netKar, 353.48);
});

test('KDV verilmemişse (boş, null, undefined, geçersiz) varsayılan %20 kullanılır', () => {
  for (const bos of ['', null, undefined, 'abc']) assert.equal(T(bos).netKar, 324.02, String(bos));
});

test('adet çarpanı: komisyon ve net kâr adetle çarpılır', () => {
  assert.equal(T(0, 3).netKar, 1166.49);
  assert.equal(T(0, 3).komisyonTutari, 300);
  assert.equal(T(0, '').netKar, 388.83); // boş adet 1 sayılır
});

test('platform tipine göre farklı kesinti (Hepsiburada, N11, Shopier, Trendyol)', () => {
  const k = (tip) => hesaplaKomisyon(1000, 500, 10, 20, 0, 1, tip).toplamKesinti;
  assert.notEqual(k('hepsiburada'), k('trendyol'));
  assert.notEqual(k('n11'), k('trendyol'));
  // Shopier: yalnızca komisyon (hizmet bedeli ve stopaj yok)
  assert.equal(k('shoppier'), 100);
});

test('detectPlatform: platform adından tür çıkarır', () => {
  assert.equal(detectPlatform('Trendyol'), 'trendyol');
  assert.equal(detectPlatform('Hepsiburada'), 'hepsiburada');
  assert.equal(detectPlatform('HEPSİ BURADA'), 'hepsiburada');
  assert.equal(detectPlatform('HEPSİBURADA'), 'hepsiburada');
  assert.equal(detectPlatform('HEPSIBURADA'), 'hepsiburada');
  assert.equal(detectPlatform('Hepsi Burada'), 'hepsiburada');
  assert.equal(detectPlatform('HB Pazar'), 'hepsiburada');
  assert.equal(detectPlatform('hb'), 'hepsiburada');
  assert.equal(detectPlatform('N11'), 'n11');
  assert.equal(detectPlatform('Shopier'), 'shoppier');
  assert.equal(detectPlatform('Shoppier'), 'shoppier');
  assert.equal(detectPlatform(null), 'trendyol');
  assert.equal(detectPlatform(''), 'trendyol');
});

test('detectPlatform: içinde "hb" geçen alakasız adlar Hepsiburada sayılmaz', () => {
  assert.equal(detectPlatform('Shbank Pazar'), 'trendyol');
  assert.equal(detectPlatform('Ahbap Market'), 'trendyol');
});
