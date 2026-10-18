/*
 * Faz 10 testleri (gerçek sunucu + gerçek MariaDB): katmanlı yapıya (routes/controller/service/repository) taşınan
 * modüllerin HTTP SÖZLEŞMESİ. Taşıma davranışı değiştirmemeli: durum kodları, mesajlar ve yanıt biçimi sabit kalır.
 * Bu dosya modül modül genişler.
 *
 *   #45 müşteriler: detay biçimi, 404/400 mesajları, gövde doğrulaması
 *   #46 yedek parça stok: kod/barkod, UNIQUE, kod değişimi, toplu içe aktarma
 *   #47 yedek parça satışı: 404, adet doğrulaması, silme
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

describe('#46 yedek parça stok: HTTP sözleşmesi', () => {
  let stokId, kod;

  before(async () => {
    kod = benzersiz('YP-').slice(0, 20);
    const r = await api('POST', '/api/yedek-parca-stok', { stok_kodu: kod, stok_adi: 'Balata F10', marka: 'X', giren_miktar: 5, satis_fiyati: 100 }, admin);
    assert.equal(r.durum, 201);
    stokId = r.govde.id;
  });

  it('ekleme: mevcut = giren, envanter = giren x satış', async () => {
    const r = await api('GET', `/api/yedek-parca-stok/barkod/${kod}`, undefined, admin);
    assert.equal(r.durum, 200);
    assert.equal(Number(r.govde.mevcut), 5);
    assert.equal(Number(r.govde.envanter_degeri), 500);
  });

  it('zorunlu alan eksikse 400, aynı kod ikinci kez 400', async () => {
    const eksik = await api('POST', '/api/yedek-parca-stok', { stok_kodu: '', stok_adi: 'x' }, admin);
    assert.equal(eksik.durum, 400);
    assert.equal(eksik.govde.message, 'Stok kodu ve stok adı zorunludur');
    const cift = await api('POST', '/api/yedek-parca-stok', { stok_kodu: kod, stok_adi: 'Başka' }, admin);
    assert.equal(cift.durum, 400);
    assert.equal(cift.govde.message, 'Bu stok kodu zaten mevcut');
  });

  it('barkod: bilinmeyen 404, otomatik kod 9 ile başlayan 13 hane', async () => {
    const yok = await api('GET', '/api/yedek-parca-stok/barkod/YOK-BOYLE-KOD', undefined, admin);
    assert.equal(yok.durum, 404);
    assert.equal(yok.govde.message, 'Bu barkoda ait ürün bulunamadı');
    const sonraki = await api('GET', '/api/yedek-parca-stok/next-stok-kodu', undefined, admin);
    assert.match(sonraki.govde.nextStokKodu, /^9\d{12}$/);
  });

  it('arama: 2 harften kısa sorguda boş dizi', async () => {
    const kisa = await api('GET', '/api/yedek-parca-stok/ara?q=a', undefined, admin);
    assert.deepEqual(kisa.govde, []);
    const uzun = await api('GET', `/api/yedek-parca-stok/ara?q=${kod.slice(0, 6)}`, undefined, admin);
    assert.ok(uzun.govde.some((x) => x.id === stokId));
  });

  it('güncelleme: kod değişince iş emri parçaları yeni koda taşınır; olmayan stok 404; negatif giren 400', async () => {
    const yeniKod = kod + '-B';
    const ie = await api('POST', '/api/is-emirleri', { musteri_ad_soyad: benzersiz('F10 '), parcalar: [{ takilan_parca: 'Balata', parca_kodu: kod, adet: 1, birim_fiyat: 10, maliyet: 5 }] }, admin);
    assert.equal(ie.durum, 201);
    const g = await api('PUT', `/api/yedek-parca-stok/${stokId}`, { stok_kodu: yeniKod, stok_adi: 'Balata F10', giren_miktar: 5, satis_fiyati: 100 }, admin);
    assert.equal(g.durum, 200);
    const okunan = await api('GET', `/api/is-emirleri/${ie.govde.id}`, undefined, admin);
    assert.equal(okunan.govde.parcalar[0].parca_kodu, yeniKod);
    kod = yeniKod;
    const yok = await api('PUT', '/api/yedek-parca-stok/2147483000', { stok_kodu: 'Z', stok_adi: 'Z' }, admin);
    assert.equal(yok.durum, 404);
    assert.equal(yok.govde.message, 'Stok bulunamadı');
    const eksi = await api('PUT', `/api/yedek-parca-stok/${stokId}`, { stok_kodu: kod, stok_adi: 'x', giren_miktar: -1 }, admin);
    assert.equal(eksi.durum, 400);
  });

  it('toplu: dizi değilse 400; boş satır numarasıyla bildirilir; geçerli liste mesajı', async () => {
    const dizi = await api('POST', '/api/yedek-parca-stok/toplu', { stoklar: 'x' }, admin);
    assert.equal(dizi.durum, 400);
    assert.equal(dizi.govde.message, 'Stok listesi gerekli');
    const eksik = await api('POST', '/api/yedek-parca-stok/toplu', { stoklar: [{ stok_kodu: 'A', stok_adi: 'a' }, { stok_kodu: '', stok_adi: 'b' }] }, admin);
    assert.equal(eksik.durum, 400);
    assert.equal(eksik.govde.message, 'Stok kodu ve adı boş olamaz (satır: 2)');
    const ok = await api('POST', '/api/yedek-parca-stok/toplu', { stoklar: [{ stok_kodu: benzersiz('TP-'), stok_adi: 'Toplu', giren_miktar: 2 }] }, admin);
    assert.equal(ok.durum, 200);
    assert.equal(ok.govde.message, '1 stok kaydı eklendi/güncellendi');
  });

  it('silme 200 "Stok silindi"', async () => {
    const r = await api('DELETE', `/api/yedek-parca-stok/${stokId}`, undefined, admin);
    assert.equal(r.durum, 200);
    assert.equal(r.govde.message, 'Stok silindi');
  });
});

describe('#47 yedek parça satışı: HTTP sözleşmesi', () => {
  it('olmayan satış 404 "Yedek parça bulunamadı"; güncelleme de 404', async () => {
    const g = await api('GET', '/api/yedek-parcalar/2147483000', undefined, admin);
    assert.equal(g.durum, 404);
    assert.equal(g.govde.message, 'Yedek parça bulunamadı');
    const p = await api('PUT', '/api/yedek-parcalar/2147483000', { urun_adi: 'x' }, admin);
    assert.equal(p.durum, 404);
  });

  it('geçersiz adet 400 (kayıt oluşmaz); geçerli satış 201; silme 200', async () => {
    const kotu = await api('POST', '/api/yedek-parcalar', { urun_adi: 'F10 kötü', adet: 0 }, admin);
    assert.equal(kotu.durum, 400);
    assert.equal(kotu.govde.message, 'Adet pozitif bir tam sayı olmalıdır');
    const iyi = await api('POST', '/api/yedek-parcalar', { urun_adi: 'F10 iyi', satis_fiyati: 50, adet: 2 }, admin);
    assert.equal(iyi.durum, 201);
    assert.equal(iyi.govde.adet, 2);
    const sil = await api('DELETE', `/api/yedek-parcalar/${iyi.govde.id}`, undefined, admin);
    assert.equal(sil.durum, 200);
    assert.equal(sil.govde.message, 'Yedek parça silindi');
    assert.equal((await api('GET', `/api/yedek-parcalar/${iyi.govde.id}`, undefined, admin)).durum, 404);
  });
});
