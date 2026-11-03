/*
 * tutarDogrula ara katmanı (saf kural): yazma isteklerinde fiyat/maliyet/oran alanları sınırları.
 *   - Negatif tutar reddedilir (iç içe nesne ve dizilerde de).
 *   - Yüzde alanları (komisyon_orani, kdv_orani) 100'den büyük olamaz (Regression E15: %150 komisyon kabul ediliyordu).
 *   - kar/yatirimci_kar zararına satışta eksi olabilir: bilerek dışarıda.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { negatifBul, negatifTutarEngelle } = require('../../platform/middleware/tutarDogrula');

test('negatif tutar alanı bulunur; ad döner (iç içe nesne ve dizide de)', () => {
  assert.equal(negatifBul({ satis_fiyati: -1 }), 'satis_fiyati');
  assert.equal(negatifBul({ satis_fiyati: '-0.01' }), 'satis_fiyati');
  assert.equal(negatifBul({ parcalar: [{ birim_fiyat: 10 }, { maliyet: -5 }] }), 'maliyet');
  assert.equal(negatifBul({ odeme: { tutar: -3 } }), 'tutar');
});

test('negatif olmayan ve tutar olmayan alanlar geçer; kar bilerek serbest; boş metin/null sayılmaz', () => {
  assert.equal(negatifBul({ satis_fiyati: 0, alis_fiyati: '100', kar: -500, yatirimci_kar: -1, ad: '-x', indirim: '', kdv_orani: null }), null);
  assert.equal(negatifBul(null), null);
  assert.equal(negatifBul('metin'), null);
});

test('yüzde alanı 100den büyükse reddedilir; 0 ve 100 geçerli (KDV %0 ve %100 komisyon uç değer)', () => {
  assert.equal(negatifBul({ komisyon_orani: 150 }), 'komisyon_orani');
  assert.equal(negatifBul({ kdv_orani: '101' }), 'kdv_orani');
  assert.equal(negatifBul({ komisyon_orani: 100, kdv_orani: 0 }), null);
  assert.equal(negatifBul({ komisyon_orani: 100.01 }), 'komisyon_orani');
  assert.equal(negatifBul({ platformlar: [{ komisyon_orani: 12 }, { komisyon_orani: 250 }] }), 'komisyon_orani');
});

test('ara katman: yazma isteğinde 400 ve Türkçe mesaj; GET ve bozuk olmayan gövde geçer', () => {
  const cevap = () => {
    const r = { kod: null, govde: null };
    r.status = (k) => ((r.kod = k), r);
    r.json = (g) => ((r.govde = g), r);
    return r;
  };
  let gecti = 0;
  const sonraki = () => gecti++;

  const kotu = cevap();
  negatifTutarEngelle({ method: 'POST', body: { komisyon_orani: 150 } }, kotu, sonraki);
  assert.equal(kotu.kod, 400);
  assert.match(kotu.govde.message, /komisyon_orani/);
  assert.equal(gecti, 0);

  const eksi = cevap();
  negatifTutarEngelle({ method: 'PUT', body: { satis_fiyati: -1 } }, eksi, sonraki);
  assert.equal(eksi.kod, 400);
  assert.match(eksi.govde.message, /negatif olamaz/);

  negatifTutarEngelle({ method: 'GET', body: { komisyon_orani: 500 } }, cevap(), sonraki);
  negatifTutarEngelle({ method: 'POST', body: { komisyon_orani: 15 } }, cevap(), sonraki);
  assert.equal(gecti, 2);
});
