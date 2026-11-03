/*
 * kismi-guncelleme: regression testleri (gerçek sunucu + gerçek MariaDB): kısmi PUT gövdesi, gönderilmeyen satış tarihini SİLMEZ.
 * Eskiden `satis_tarihi: govde.satis_tarihi || null` (motor) ve ham `govde.satis_tarihi` (aksesuar) gönderilmeyen alanı NULL yazıyordu:
 * satış tarihi boşalınca kayıt satış listesinde ve raporlarda sessizce başka yere kayıyordu (E06, E08, E12).
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat } = require('./yardimci');

const SON = Date.now().toString(36);
let s,
  api,
  admin,
  sayac = 0;
const benzersiz = (onek) => `${onek}${SON}${++sayac}`;
before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
});
after(() => s && s.durdur());

const tarihMi = (deger, beklenen) => typeof deger === 'string' && deger.startsWith(beklenen);

describe('ikinci el motor: kısmi PUT satış tarihini silmez', () => {
  it('satılmış motorda alan göndermeyen PUT satis_tarihi değerini korur; açıkça gönderilen değer ise değişir', async () => {
    const plaka = benzersiz('34KG').slice(0, 15).toUpperCase();
    const c = await api(
      'POST',
      '/api/ikinci-el-motor',
      { plaka, marka: 'Test', model: 'Kismi', durum: 'tamamlandi', satis_tarihi: '2026-10-05', alis_fiyati: 500, satis_fiyati: 900, alici_adi: 'Alıcı' },
      admin,
    );
    assert.equal(c.durum, 201, JSON.stringify(c.govde));
    const id = c.govde.id;
    assert.ok(tarihMi((await api('GET', `/api/ikinci-el-motor/${id}`, undefined, admin)).govde.satis_tarihi, '2026-10-05'), 'başlangıçta tarih kayıtlı olmalı');

    const put = await api('PUT', `/api/ikinci-el-motor/${id}`, { marka: 'Test2' }, admin);
    assert.equal(put.durum, 200, JSON.stringify(put.govde));
    const sonra = (await api('GET', `/api/ikinci-el-motor/${id}`, undefined, admin)).govde;
    assert.equal(sonra.marka, 'Test2');
    assert.ok(tarihMi(sonra.satis_tarihi, '2026-10-05'), `satis_tarihi korunmalı, şimdi: ${sonra.satis_tarihi}`);

    await api('PUT', `/api/ikinci-el-motor/${id}`, { satis_tarihi: '2026-10-07' }, admin);
    assert.ok(tarihMi((await api('GET', `/api/ikinci-el-motor/${id}`, undefined, admin)).govde.satis_tarihi, '2026-10-07'), 'açıkça gönderilen tarih değişmeli');
  });
});

describe('aksesuar satışı: kısmi PUT satış tarihini silmez', () => {
  it('satis_tarihi göndermeyen PUT mevcut tarihi korur', async () => {
    const c = await api('POST', '/api/aksesuarlar', { ad_soyad: benzersiz('Kısmi '), durum: 'beklemede', satis_tarihi: '2026-10-05', parcalar: [] }, admin);
    assert.equal(c.durum, 201, JSON.stringify(c.govde));
    const id = c.govde.id;
    const put = await api('PUT', `/api/aksesuarlar/${id}`, { ad_soyad: benzersiz('Kısmi2 '), durum: 'beklemede', parcalar: [] }, admin);
    assert.equal(put.durum, 200, JSON.stringify(put.govde));
    const sonra = (await api('GET', `/api/aksesuarlar/${id}`, undefined, admin)).govde;
    assert.ok(tarihMi(sonra.satis_tarihi, '2026-10-05'), `satis_tarihi korunmalı, şimdi: ${sonra.satis_tarihi}`);
  });
});
