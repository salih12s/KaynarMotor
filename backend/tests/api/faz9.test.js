/*
 * Faz 9 testleri (gerçek sunucu + gerçek MariaDB): muhasebeci için "Motor Satış'ı görebilir" anahtarı ve
 * Belge Arşivi tarih alanları.
 *
 *   #41 anahtar KAPALIYKEN muhasebeci motor satış verisine erişemez (regression: eskiden uçlar her girişliye açıktı)
 *   #42 anahtar AÇIKKEN salt okunur görür: alım/satım, noter, satış ve kişi bilgisi var; kâr/masraf/yatırımcı alanı yok
 *   #43 anahtar açıkken de yazamaz; anahtarı yalnız admin verebilir
 *   #44 belge arşivi her araç için alış/satış tarihini döner (aylık filtre bunlara dayanır)
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat, kullaniciOlustur } = require('./yardimci');

const SON = Date.now().toString(36);
let s,
  api,
  admin,
  sayac = 0;
const benzersiz = (onek) => `${onek}${SON}${++sayac}`;
const k = {};
let motorId;

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
  k.muhasebeci = await kullaniciOlustur(api, admin, benzersiz('f9_muh_'), 'muhasebeci');
  k.personel = await kullaniciOlustur(api, admin, benzersiz('f9_prs_'), 'personel');
  const r = await api(
    'POST',
    '/api/ikinci-el-motor',
    {
      plaka: benzersiz('34F9').slice(0, 12),
      marka: 'Honda',
      model: 'PCX',
      yil: 2021,
      km: 8000,
      alis_fiyati: 90000,
      noter_alis: 85000,
      noter_satis: 120000,
      satis_fiyati: 130000,
      masraflar: 2500,
      durum: 'tamamlandi',
      alici_adi: 'Ali Veli',
      alici_tc: '11111111111',
      alici_telefon: '05551112233',
      alici_adres: 'Adres 1',
      satici_adi: 'Satici S',
      satici_tc: '22222222222',
      yatirimci_kar: 4000,
      tarih: '2026-08-05',
      satis_tarihi: '2026-09-20',
    },
    admin,
  );
  assert.equal(r.durum, 201);
  motorId = r.govde.id;
});
after(() => s && s.durdur());

const anahtar = (deger) => api('PATCH', `/api/auth/users/${k.muhasebeci.id}/yetkiler`, { motor_satis_gor: deger }, admin);

describe('#41 anahtar kapalıyken muhasebeci motor satış verisine erişemez', () => {
  it('liste, tek kayıt ve özet 403 verir', async () => {
    assert.equal((await anahtar(false)).durum, 200);
    for (const yol of ['/api/ikinci-el-motor', `/api/ikinci-el-motor/${motorId}`, '/api/ikinci-el-motor/stats/ozet']) {
      const r = await api('GET', yol, undefined, k.muhasebeci.token);
      assert.equal(r.durum, 403, `${yol} -> ${r.durum}`);
    }
  });
});

describe('#42 anahtar açıkken muhasebeci salt okunur görür, kâr görmez', () => {
  before(async () => {
    assert.equal((await anahtar(true)).durum, 200);
  });

  it('satılmış motoru alım/satım, noter, satış ve kişi bilgisiyle görür', async () => {
    const r = await api('GET', `/api/ikinci-el-motor/${motorId}`, undefined, k.muhasebeci.token);
    assert.equal(r.durum, 200);
    const m = r.govde;
    assert.equal(Number(m.alis_fiyati), 90000);
    assert.equal(Number(m.noter_alis), 85000);
    assert.equal(Number(m.noter_satis), 120000);
    assert.equal(Number(m.satis_fiyati), 130000);
    assert.equal(m.alici_tc, '11111111111');
    assert.equal(m.satici_adi, 'Satici S');
  });

  it('kâr, masraf ve yatırımcı alanları yanıtta hiç yok (liste, tek kayıt, özet)', async () => {
    const YASAK = ['kar', 'masraflar', 'yatirimci_id', 'yatirimci_kar', 'yatirimci_kar_orani', 'toplam_kar'];
    const tek = (await api('GET', `/api/ikinci-el-motor/${motorId}`, undefined, k.muhasebeci.token)).govde;
    const liste = (await api('GET', '/api/ikinci-el-motor', undefined, k.muhasebeci.token)).govde.find((x) => x.id === motorId);
    assert.ok(liste, 'satılmış motor listede görünmeli');
    const ozet = (await api('GET', '/api/ikinci-el-motor/stats/ozet', undefined, k.muhasebeci.token)).govde;
    for (const [ad, nesne] of [
      ['tek', tek],
      ['liste', liste],
      ['özet', ozet],
    ]) {
      for (const alan of YASAK) assert.ok(!(alan in nesne) || nesne[alan] === null, `${ad}: ${alan} sızıyor (${nesne[alan]})`);
    }
    for (const alan of ['kar', 'masraflar', 'yatirimci_kar']) assert.ok(!(alan in tek), `tek: ${alan} anahtarı bile olmamalı`);
  });
});

describe('#43 anahtar açıkken de yazamaz; anahtarı yalnız admin verir', () => {
  it('POST/PUT/DELETE 403 verir ve kayıt değişmez', async () => {
    assert.equal((await anahtar(true)).durum, 200);
    const olustur = await api('POST', '/api/ikinci-el-motor', { plaka: benzersiz('34M').slice(0, 12), marka: 'X', model: 'Y' }, k.muhasebeci.token);
    assert.equal(olustur.durum, 403);
    const guncelle = await api('PUT', `/api/ikinci-el-motor/${motorId}`, { satis_fiyati: 1 }, k.muhasebeci.token);
    assert.equal(guncelle.durum, 403);
    const sil = await api('DELETE', `/api/ikinci-el-motor/${motorId}`, undefined, k.muhasebeci.token);
    assert.equal(sil.durum, 403);
    const hala = (await api('GET', `/api/ikinci-el-motor/${motorId}`, undefined, admin)).govde;
    assert.equal(Number(hala.satis_fiyati), 130000);
  });

  it('muhasebeci kendine, personel de muhasebeciye anahtar veremez (403)', async () => {
    const kendine = await api('PATCH', `/api/auth/users/${k.muhasebeci.id}/yetkiler`, { motor_satis_gor: true }, k.muhasebeci.token);
    assert.equal(kendine.durum, 403);
    const personel = await api('PATCH', `/api/auth/users/${k.muhasebeci.id}/yetkiler`, { motor_satis_gor: true }, k.personel.token);
    assert.equal(personel.durum, 403);
  });

  it('anahtar geri kapatılınca erişim ANINDA düşer', async () => {
    assert.equal((await anahtar(false)).durum, 200);
    const r = await api('GET', '/api/ikinci-el-motor', undefined, k.muhasebeci.token);
    assert.equal(r.durum, 403);
  });
});

describe('#44 belge arşivi alış/satış tarihini döner', () => {
  it('arşiv grubunda alis_tarihi ve satis_tarihi YYYY-AA-GG biçiminde gelir', async () => {
    // Arşiv yalnız belgesi olan motorları listeler: önce bu motora küçük bir PDF ekle (ham gövde, ?ad= ile)
    const yukle = await api('POST', `/api/satis-belgeleri/motor/${motorId}?ad=sozlesme.pdf`, '%PDF-1.4 test', admin, {
      basliklar: { 'Content-Type': 'application/octet-stream' },
    });
    assert.equal(yukle.durum, 201, JSON.stringify(yukle.govde));
    const r = await api('GET', '/api/satis-belgeleri/arsiv', undefined, k.muhasebeci.token);
    assert.equal(r.durum, 200);
    const g = r.govde.find((x) => x.motor_id === motorId);
    assert.ok(g, 'belgesi olan motor arşivde görünmeli');
    assert.equal(g.alis_tarihi, '2026-08-05');
    assert.equal(g.satis_tarihi, '2026-09-20');
    // Arşiv fiyat/kişi bilgisi sızdırmaz (muhasebeci Motor Satış anahtarı kapalıyken de buradan göremez)
    for (const alan of ['satis_fiyati', 'alici_adi', 'alici_tc', 'kar']) assert.ok(!(alan in g), `arşiv: ${alan} sızıyor`);
  });
});
