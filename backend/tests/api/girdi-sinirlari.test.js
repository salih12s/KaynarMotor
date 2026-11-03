/*
 * girdi-sinirlari: regression testleri (gerçek sunucu + gerçek MariaDB): girdi sınırları açıkça doğrulanır.
 *   - Rapor tarihleri YYYY-AA-GG ve gerçek bir takvim günü olmalı; başlangıç bitişten sonra olamaz (eskiden sessizce boş rapor).
 *   - Yüzde alanları (komisyon_orani, kdv_orani) 100'den büyük olamaz (negatif tutarlar zaten engelliydi: tutarDogrula).
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat } = require('./yardimci');

let s,
  api,
  admin;
before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
});
after(() => s && s.durdur());

describe('rapor tarihleri', () => {
  it('bozuk tarih ve ters aralık 400; geçerli aralık 200', async () => {
    for (const kotu of ['2026-02-31', '01.10.2026', 'abc']) {
      const r = await api('GET', `/api/raporlar/aralik?baslangic=${encodeURIComponent(kotu)}&bitis=2026-10-31`, undefined, admin);
      assert.equal(r.durum, 400, kotu);
      assert.match(r.govde.message, /baslangic/);
    }
    const ters = await api('GET', '/api/raporlar/aralik?baslangic=2026-10-31&bitis=2026-10-01', undefined, admin);
    assert.equal(ters.durum, 400);
    assert.equal(ters.govde.message, 'Başlangıç tarihi bitiş tarihinden sonra olamaz');
    assert.equal((await api('GET', '/api/raporlar/aralik?baslangic=2026-10-01&bitis=2026-10-31', undefined, admin)).durum, 200);
    assert.equal((await api('GET', '/api/raporlar/aralik?baslangic=2026-10-05&bitis=2026-10-05', undefined, admin)).durum, 200);
  });

  it('günlük rapor: bozuk tarih 400; tarihsiz (bugün) ve geçerli tarih 200', async () => {
    assert.equal((await api('GET', '/api/raporlar/gunluk?tarih=2026-02-31', undefined, admin)).durum, 400);
    assert.equal((await api('GET', '/api/raporlar/gunluk', undefined, admin)).durum, 200);
    assert.equal((await api('GET', '/api/raporlar/gunluk?tarih=2026-10-05', undefined, admin)).durum, 200);
  });
});

describe('yüzde alanları', () => {
  it("komisyon ve KDV oranı 100'den büyükse 400 (platform ekleme)", async () => {
    const komisyon = await api('POST', '/api/eticaret/platformlar', { platform_adi: 'Sınır Deneme', komisyon_orani: 150, kdv_orani: 20 }, admin);
    assert.equal(komisyon.durum, 400);
    assert.match(komisyon.govde.message, /komisyon_orani.*100/);
    const kdv = await api('POST', '/api/eticaret/platformlar', { platform_adi: 'Sınır Deneme', komisyon_orani: 10, kdv_orani: 101 }, admin);
    assert.equal(kdv.durum, 400);
    assert.match(kdv.govde.message, /kdv_orani.*100/);
  });
});
