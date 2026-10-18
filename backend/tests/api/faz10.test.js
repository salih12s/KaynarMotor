/*
 * Faz 10 testleri (gerçek sunucu + gerçek MariaDB): katmanlı yapıya (routes/controller/service/repository) taşınan
 * modüllerin HTTP SÖZLEŞMESİ. Taşıma davranışı değiştirmemeli: durum kodları, mesajlar ve yanıt biçimi sabit kalır.
 * Bu dosya modül modül genişler.
 *
 *   #45 müşteriler: detay biçimi, 404/400 mesajları, gövde doğrulaması
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat, kullaniciOlustur } = require('./yardimci');

const SON = Date.now().toString(36);
let s, api, admin, sayac = 0;
const benzersiz = (onek) => `${onek}${SON}${++sayac}`;
const k = {};

before(async () => {
  s = await sunucuBaslat(); api = s.api; admin = s.admin;
  k.servis = await kullaniciOlustur(api, admin, benzersiz('f10_srv_'), 'personel', { servis_yetkisi: true });
});
after(() => s && s.durdur());

describe('#45 müşteriler: HTTP sözleşmesi', () => {
  let musteriId, ad;

  before(async () => {
    ad = benzersiz('Sözleşme Müşteri ');
    const r = await api('POST', '/api/musteriler', { ad_soyad: ad, adres: 'Adres 1', telefon: '05559990011' }, admin);
    assert.equal(r.durum, 201);
    musteriId = r.govde.id;
  });

  it('ekleme 201 döner ve alanları geri verir', async () => {
    const r = await api('GET', `/api/musteriler/${musteriId}`, undefined, admin);
    assert.equal(r.govde.ad_soyad, ad);
    assert.equal(r.govde.adres, 'Adres 1');
    assert.equal(r.govde.telefon, '05559990011');
  });

  it('detay: müşteri alanları + motorlar/aksesuarlar/isEmirleri dizileri', async () => {
    // Aynı adla bir iş emri: geçmişte görünmeli
    const ie = await api('POST', '/api/is-emirleri', { musteri_ad_soyad: ad, telefon: '05559990011', parcalar: [] }, admin);
    assert.equal(ie.durum, 201);
    const r = await api('GET', `/api/musteriler/${musteriId}`, undefined, admin);
    assert.equal(r.durum, 200);
    for (const alan of ['motorlar', 'aksesuarlar', 'isEmirleri']) assert.ok(Array.isArray(r.govde[alan]), `${alan} dizi olmalı`);
    assert.equal(r.govde.isEmirleri.length, 1);
    assert.equal(r.govde.isEmirleri[0].musteri_ad_soyad, ad);
  });

  it('olmayan müşteri: detay ve güncelleme 404 "Müşteri bulunamadı"', async () => {
    const detay = await api('GET', '/api/musteriler/2147483000', undefined, admin);
    assert.equal(detay.durum, 404);
    assert.equal(detay.govde.message, 'Müşteri bulunamadı');
    const guncelle = await api('PUT', '/api/musteriler/2147483000', { ad_soyad: 'x' }, admin);
    assert.equal(guncelle.durum, 404);
    assert.equal(guncelle.govde.message, 'Müşteri bulunamadı');
  });

  it('geçersiz kayıt numarası 400 (5abc gibi değerler başka kaydı etkilemez)', async () => {
    const r = await api('GET', '/api/musteriler/5abc', undefined, admin);
    assert.equal(r.durum, 400);
    assert.equal(r.govde.message, 'Geçersiz kayıt numarası');
  });

  it('güncelleme yeni değerleri yazar', async () => {
    const r = await api('PUT', `/api/musteriler/${musteriId}`, { ad_soyad: ad, adres: 'Adres 2', telefon: '05559990011' }, admin);
    assert.equal(r.durum, 200);
    assert.equal(r.govde.adres, 'Adres 2');
  });

  it('yönetim uçları admin dışına kapalı (403); liste yalnız admin', async () => {
    assert.equal((await api('GET', '/api/musteriler', undefined, k.servis.token)).durum, 403);
    assert.equal((await api('GET', `/api/musteriler/${musteriId}`, undefined, k.servis.token)).durum, 403);
    assert.equal((await api('POST', '/api/musteriler', { ad_soyad: 'x' }, k.servis.token)).durum, 403);
    assert.equal((await api('DELETE', `/api/musteriler/${musteriId}`, undefined, k.servis.token)).durum, 403);
  });

  it('gövde nesne değilse (dizi) 500 değil 400 ve Türkçe mesaj', async () => {
    const r = await api('POST', '/api/musteriler', [1, 2], admin);
    assert.equal(r.durum, 400);
    assert.match(r.govde.message, /Geçersiz değer/);
  });

  it('arama ve telefon uçları servis yetkilisine açık; telefon çok kısaysa 200 + null', async () => {
    const ara = await api('GET', `/api/musteriler/ara/${encodeURIComponent(ad.slice(0, 12))}`, undefined, k.servis.token);
    assert.equal(ara.durum, 200);
    assert.ok(ara.govde.some((m) => m.id === musteriId));
    const kisa = await api('GET', '/api/musteriler/telefon/123', undefined, k.servis.token);
    assert.equal(kisa.durum, 200);
    assert.equal(kisa.govde, null);
    const bulunan = await api('GET', '/api/musteriler/telefon/+90%20555%20999%2000%2011', undefined, k.servis.token);
    assert.equal(bulunan.govde.id, musteriId);
  });

  it('silme 200 "Müşteri silindi"; sonra detay 404 (iş emri bağlantısı faz2 testinde sınanır)', async () => {
    const sil = await api('DELETE', `/api/musteriler/${musteriId}`, undefined, admin);
    assert.equal(sil.durum, 200);
    assert.equal(sil.govde.message, 'Müşteri silindi');
    assert.equal((await api('GET', `/api/musteriler/${musteriId}`, undefined, admin)).durum, 404);
  });
});
