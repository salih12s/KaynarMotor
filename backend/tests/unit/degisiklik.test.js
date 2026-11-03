/*
 * degisiklikOzeti (saf fonksiyon): denetim günlüğüne "ne değişti" yazar: alan: eski → yeni.
 * Regression (E06/E10/E12): günlük yalnız "#N güncellendi" yazıyordu; bir fiyatın kim tarafından kaç TL'den kaç TL'ye çevrildiği sonradan
 * anlaşılamıyordu (alış 500.000 → 1 yapılınca kâr −5.001'e düştü, iz yoktu). Kişisel veri (ad, TC) izlenen alan listesine KONMAZ (KVKK):
 * çağıran yalnız izlenecek alanları verir.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { degisiklikOzeti } = require('../../lib/degisiklik');

const ALANLAR = ['alis_fiyati', 'satis_fiyati', 'durum', 'satis_tarihi'];

test('değişen alan "alan: eski → yeni" olarak yazılır; sırası izlenen alan listesindeki sıradır', () => {
  const eski = { alis_fiyati: '500000.00', satis_fiyati: '650000.00', durum: 'stokta' };
  const yeni = { alis_fiyati: '1.00', satis_fiyati: '650000.00', durum: 'tamamlandi' };
  assert.equal(degisiklikOzeti(eski, yeni, ALANLAR), 'alis_fiyati: 500000.00 → 1.00; durum: stokta → tamamlandi');
});

test('değişmeyen alanlar yazılmaz; hiçbiri değişmediyse boş metin', () => {
  const satir = { alis_fiyati: '500000.00', satis_fiyati: '650000.00', durum: 'stokta' };
  assert.equal(degisiklikOzeti(satir, { ...satir }, ALANLAR), '');
});

test('sayı ile aynı sayıyı gösteren metin eşittir (DECIMAL metin gelir): 500000 = "500000.00"', () => {
  assert.equal(degisiklikOzeti({ alis_fiyati: '500000.00' }, { alis_fiyati: 500000 }, ALANLAR), '');
  assert.equal(degisiklikOzeti({ alis_fiyati: 0 }, { alis_fiyati: '0.00' }, ALANLAR), '');
});

test('null, undefined ve boş metin aynı sayılır (boş); boştan değere geçiş "(boş) → değer"', () => {
  assert.equal(degisiklikOzeti({ durum: null }, { durum: '' }, ALANLAR), '');
  assert.equal(degisiklikOzeti({}, { durum: undefined }, ALANLAR), '');
  assert.equal(degisiklikOzeti({ durum: null }, { durum: 'stokta' }, ALANLAR), 'durum: (boş) → stokta');
  assert.equal(degisiklikOzeti({ durum: 'stokta' }, { durum: null }, ALANLAR), 'durum: stokta → (boş)');
});

test('tarih (Date nesnesi) gün olarak karşılaştırılır ve YYYY-AA-GG yazılır', () => {
  const a = new Date('2026-10-05T00:00:00.000Z');
  assert.equal(degisiklikOzeti({ satis_tarihi: a }, { satis_tarihi: new Date('2026-10-05T00:00:00.000Z') }, ALANLAR), '');
  assert.equal(degisiklikOzeti({ satis_tarihi: a }, { satis_tarihi: new Date('2026-10-07T00:00:00.000Z') }, ALANLAR), 'satis_tarihi: 2026-10-05 → 2026-10-07');
});

test('yalnız izlenen alanlar yazılır: listede olmayan alan (ör. kişisel veri) değişse de günlüğe girmez', () => {
  const eski = { alis_fiyati: 1, alici_tc: '11122233344', alici_adi: 'Ayşe' };
  const yeni = { alis_fiyati: 2, alici_tc: '99988877766', alici_adi: 'Veli' };
  const ozet = degisiklikOzeti(eski, yeni, ALANLAR);
  assert.equal(ozet, 'alis_fiyati: 1 → 2');
  assert.ok(!/TC|1112|9998|Ayşe|Veli/i.test(ozet), 'kişisel veri günlüğe sızmamalı');
});

test('uzun metin değeri kısaltılır (günlük şişmesin)', () => {
  const uzun = 'x'.repeat(300);
  const ozet = degisiklikOzeti({ durum: 'a' }, { durum: uzun }, ALANLAR);
  assert.ok(ozet.length < 150, `özet çok uzun: ${ozet.length}`);
  assert.match(ozet, /…/);
});
