/*
 * Faz 10 testleri (gerçek sunucu + gerçek MariaDB): katmanlı yapıya (routes/controller/service/repository) taşınan
 * modüllerin HTTP SÖZLEŞMESİ. Taşıma davranışı değiştirmemeli: durum kodları, mesajlar ve yanıt biçimi sabit kalır.
 * Bu dosya modül modül genişler.
 *
 *   #45 müşteriler: detay biçimi, 404/400 mesajları, gövde doğrulaması
 *   #46 yedek parça stok: kod/barkod, UNIQUE, kod değişimi, toplu içe aktarma
 *   #47 yedek parça satışı: 404, adet doğrulaması, silme
 *   #52 raporlar ve veresiye: yanıt şekilleri, erişim kuralları, tarih doğrulaması
 *   #51 motor ve satış belgeleri: CRUD sözleşmesi, 404/403 mesajları, belge yükleme/indirme/silme/arşiv
 *   #50 e-ticaret: platform yönetimi (admin), satış kâr hesabı, stok düşüm/iade, 404 mesajları
 *   #49 aksesuar stok ve satışı: kod/barkod, indirim/kâr, stok düşümü, 404 mesajları, istatistik
 *   #48 iş emirleri: fiş no, 404/403 mesajları, tamamlanan iş emri, silme, QR token ve herkese açık servis geçmişi
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
  k.motor = await kullaniciOlustur(api, admin, benzersiz('f10_mtr_'), 'personel', { motor_satis_yetkisi: true });
  k.eticaret = await kullaniciOlustur(api, admin, benzersiz('f10_etc_'), 'personel', { eticaret_yetkisi: true });
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

describe('#48 iş emirleri ve servis geçmişi: HTTP sözleşmesi', () => {
  let ieId, fisNo, plaka;

  before(async () => {
    plaka = ('34' + benzersiz('F').replace(/[^A-Za-z0-9]/g, '')).toUpperCase().slice(0, 10);
    const r = await api('POST', '/api/is-emirleri', {
      musteri_ad_soyad: benzersiz('F10 Servis '), plaka, marka: 'Honda', model_tip: 'PCX', km: 1200,
      parcalar: [{ takilan_parca: 'Yağ değişimi', adet: 2, birim_fiyat: 100, maliyet: 60 }],
    }, admin);
    assert.equal(r.durum, 201);
    ieId = r.govde.id;
    fisNo = r.govde.fis_no;
  });

  it('oluşturma: toplam/maliyet/kâr hesaplanır, parçalar yanıtta gelir', async () => {
    const r = await api('GET', `/api/is-emirleri/${ieId}`, undefined, admin);
    assert.equal(r.durum, 200);
    assert.equal(Number(r.govde.gercek_toplam_ucret), 200);
    assert.equal(Number(r.govde.toplam_maliyet), 120);
    assert.equal(Number(r.govde.kar), 80);
    assert.equal(r.govde.parcalar.length, 1);
    assert.equal(r.govde.parcalar[0].takilan_parca, 'Yağ değişimi');
  });

  it('fiş numarası: önizleme sayı döner ve bir sonraki numara mevcut en büyükten büyüktür', async () => {
    const r = await api('GET', '/api/is-emirleri/next-fis-no/preview', undefined, admin);
    assert.equal(typeof r.govde.nextFisNo, 'number');
    assert.ok(r.govde.nextFisNo > fisNo);
  });

  it('olmayan iş emri 404 "İş emri bulunamadı" (detay ve güncelleme)', async () => {
    const g = await api('GET', '/api/is-emirleri/2147483000', undefined, admin);
    assert.equal(g.durum, 404);
    assert.equal(g.govde.message, 'İş emri bulunamadı');
    const p = await api('PUT', '/api/is-emirleri/2147483000', { musteri_ad_soyad: 'x', parcalar: [] }, admin);
    assert.equal(p.durum, 404);
  });

  it('liste durum filtresiyle çalışır', async () => {
    const r = await api('GET', '/api/is-emirleri?durum=beklemede', undefined, admin);
    assert.equal(r.durum, 200);
    assert.ok(r.govde.every((x) => x.durum === 'beklemede'));
    assert.ok(r.govde.some((x) => x.id === ieId));
  });

  it('tamamlanan iş emrini personel düzenleyemez (403), silemez (403); admin düzenler', async () => {
    const tamam = await api('PUT', `/api/is-emirleri/${ieId}`, { musteri_ad_soyad: 'x', plaka, durum: 'tamamlandi', parcalar: [{ takilan_parca: 'Yağ değişimi', adet: 2, birim_fiyat: 100, maliyet: 60 }] }, admin);
    assert.equal(tamam.durum, 200);
    assert.ok(tamam.govde.tamamlama_tarihi, 'geçişte tamamlama tarihi verilir');
    const personel = await api('PUT', `/api/is-emirleri/${ieId}`, { musteri_ad_soyad: 'y', parcalar: [] }, k.servis.token);
    assert.equal(personel.durum, 403);
    assert.equal(personel.govde.message, 'Tamamlanan iş emrini düzenleme yetkiniz yok');
    const sil = await api('DELETE', `/api/is-emirleri/${ieId}`, undefined, k.servis.token);
    assert.equal(sil.durum, 403);
    assert.equal(sil.govde.message, 'Admin yetkisi gerekli');
  });

  it('QR token: aynı plaka için aynı token; plakasız 400; herkese açık geçmiş maliyet/kâr/telefon içermez', async () => {
    const ilk = await api('POST', '/api/is-emirleri/qr-token', { plaka: plaka.toLowerCase() }, admin);
    assert.equal(ilk.durum, 200);
    assert.equal(ilk.govde.plaka, plaka);
    const ikinci = await api('POST', '/api/is-emirleri/qr-token', { plaka }, admin);
    assert.equal(ikinci.govde.token, ilk.govde.token);
    const bos = await api('POST', '/api/is-emirleri/qr-token', { plaka: ' - ' }, admin);
    assert.equal(bos.durum, 400);
    assert.equal(bos.govde.message, 'Plaka gerekli');

    const gecmis = await api('GET', `/api/servis-gecmisi/${ilk.govde.token}`);
    assert.equal(gecmis.durum, 200);
    assert.equal(gecmis.govde.plaka, plaka);
    assert.ok(gecmis.govde.servisler.length >= 1);
    assert.deepEqual(gecmis.govde.servisler.find((x) => x.fis_no === fisNo).islemler, [{ islem: 'Yağ değişimi', adet: 2 }]);
    const metin = JSON.stringify(gecmis.govde);
    for (const alan of ['maliyet', '"kar"', 'telefon', 'musteri_ad_soyad']) assert.ok(!metin.includes(alan), `${alan} sızıyor`);

    const yok = await api('GET', '/api/servis-gecmisi/yok-boyle-token');
    assert.equal(yok.durum, 404);
    assert.equal(yok.govde.message, 'Geçersiz veya süresi dolmuş bağlantı');
  });

  it('admin siler: 200 "İş emri silindi"; sonra detay 404', async () => {
    const r = await api('DELETE', `/api/is-emirleri/${ieId}`, undefined, admin);
    assert.equal(r.durum, 200);
    assert.equal(r.govde.message, 'İş emri silindi');
    assert.equal((await api('GET', `/api/is-emirleri/${ieId}`, undefined, admin)).durum, 404);
  });
});

describe('#49 aksesuar stok ve satışı: HTTP sözleşmesi', () => {
  let stokId, kod;

  before(async () => {
    kod = benzersiz('AK-').slice(0, 20);
    const r = await api('POST', '/api/aksesuar-stok', { stok_kodu: kod, stok_adi: benzersiz('Kask F10 '), giren_miktar: 10, satis_fiyati: 200 }, admin);
    assert.equal(r.durum, 201);
    stokId = r.govde.id;
  });

  it('stok: ekleme mevcut=giren; aynı kod 400; zorunlu alan 400; barkod ve otomatik kod', async () => {
    const b = await api('GET', `/api/aksesuar-stok/barkod/${kod}`, undefined, admin);
    assert.equal(Number(b.govde.mevcut), 10);
    assert.equal(Number(b.govde.envanter_degeri), 2000);
    const cift = await api('POST', '/api/aksesuar-stok', { stok_kodu: kod, stok_adi: 'x' }, admin);
    assert.equal(cift.durum, 400);
    assert.equal(cift.govde.message, 'Bu stok kodu zaten mevcut');
    const eksik = await api('POST', '/api/aksesuar-stok', { stok_adi: 'x' }, admin);
    assert.equal(eksik.govde.message, 'Stok kodu ve stok adı zorunludur');
    const sonraki = await api('GET', '/api/aksesuar-stok/next-stok-kodu', undefined, admin);
    assert.match(sonraki.govde.nextStokKodu, /^0\d{12}$/);
    assert.equal((await api('GET', '/api/aksesuar-stok/barkod/YOK-KOD', undefined, admin)).durum, 404);
  });

  it('stok: olmayan kaydı güncelleme 404 "Stok bulunamadı"; negatif giren 400', async () => {
    const yok = await api('PUT', '/api/aksesuar-stok/2147483000', { stok_kodu: 'Z', stok_adi: 'Z' }, admin);
    assert.equal(yok.durum, 404);
    assert.equal(yok.govde.message, 'Stok bulunamadı');
    const eksi = await api('PUT', `/api/aksesuar-stok/${stokId}`, { stok_kodu: kod, stok_adi: 'x', giren_miktar: -2 }, admin);
    assert.equal(eksi.durum, 400);
  });

  it('satış: indirim ve kâr hesabı; tamamlandı olunca stok id ile DÜŞER; silinince iade', async () => {
    const r = await api('POST', '/api/aksesuarlar', {
      ad_soyad: benzersiz('F10 Alıcı '), durum: 'tamamlandi', indirim: 20,
      parcalar: [{ stok_id: stokId, urun_adi: 'Kask', adet: 3, maliyet: 100, satis_fiyati: 200 }],
    }, admin);
    assert.equal(r.durum, 201);
    assert.equal(Number(r.govde.toplam_satis), 580);
    assert.equal(Number(r.govde.toplam_maliyet), 300);
    assert.equal(Number(r.govde.kar), 280);
    assert.equal(Number(r.govde.indirim), 20);
    assert.ok(r.govde.tamamlama_tarihi);
    assert.equal(r.govde.parcalar.length, 1);
    const dusmus = (await api('GET', `/api/aksesuar-stok/barkod/${kod}`, undefined, admin)).govde;
    assert.equal(Number(dusmus.mevcut), 7);
    const sil = await api('DELETE', `/api/aksesuarlar/${r.govde.id}`, undefined, admin);
    assert.equal(sil.durum, 200);
    assert.equal(sil.govde.message, 'Aksesuar satışı silindi');
    const iade = (await api('GET', `/api/aksesuar-stok/barkod/${kod}`, undefined, admin)).govde;
    assert.equal(Number(iade.mevcut), 10);
  });

  it('satış: olmayan kayıt 404 mesajları; geçersiz adet 400; liste parçalarla birlikte; istatistik alanları', async () => {
    const g = await api('GET', '/api/aksesuarlar/2147483000', undefined, admin);
    assert.equal(g.durum, 404);
    assert.equal(g.govde.message, 'Aksesuar bulunamadı');
    const p = await api('PUT', '/api/aksesuarlar/2147483000', { ad_soyad: 'x', parcalar: [] }, admin);
    assert.equal(p.durum, 404);
    assert.equal(p.govde.message, 'Bulunamadı');
    const kotu = await api('POST', '/api/aksesuarlar', { ad_soyad: 'x', parcalar: [{ urun_adi: 'a', adet: -1 }] }, admin);
    assert.equal(kotu.durum, 400);
    const liste = await api('GET', '/api/aksesuarlar', undefined, admin);
    assert.equal(liste.durum, 200);
    assert.ok(liste.govde.every((x) => Array.isArray(x.parcalar)));
    const ist = await api('GET', '/api/aksesuarlar/stats/genel', undefined, admin);
    for (const alan of ['toplam_satis', 'toplam_gelir', 'toplam_maliyet', 'toplam_kar', 'bekleyen', 'tamamlanan']) assert.ok(alan in ist.govde, alan);
  });

  it('stok silme 200 "Stok silindi"; toplu içe aktarma mesajı', async () => {
    const toplu = await api('POST', '/api/aksesuar-stok/toplu', { stoklar: [{ stok_kodu: benzersiz('AT-'), stok_adi: 'Toplu', giren_miktar: 1 }] }, admin);
    assert.equal(toplu.govde.message, '1 stok kaydı eklendi/güncellendi');
    const sil = await api('DELETE', `/api/aksesuar-stok/${stokId}`, undefined, admin);
    assert.equal(sil.govde.message, 'Stok silindi');
  });
});

describe('#50 e-ticaret: HTTP sözleşmesi', () => {
  let platformId, stokId, stokKodu;

  before(async () => {
    const p = await api('POST', '/api/eticaret/platformlar', { platform_adi: benzersiz('F10 Platform '), komisyon_orani: 10, kargo_ucreti: 20 }, admin);
    assert.equal(p.durum, 201);
    platformId = p.govde.id;
    stokKodu = benzersiz('ET-').slice(0, 20);
    const st = await api('POST', '/api/aksesuar-stok', { stok_kodu: stokKodu, stok_adi: benzersiz('E-ticaret ürün '), giren_miktar: 10, satis_fiyati: 300 }, admin);
    stokId = st.govde.id;
  });

  it('platform yönetimi yalnız admin: e-ticaret yetkilisi bile 403 "Admin yetkisi gerekli"', async () => {
    const e = await api('POST', '/api/eticaret/platformlar', { platform_adi: 'x' }, k.eticaret.token);
    assert.equal(e.durum, 403);
    assert.equal(e.govde.message, 'Admin yetkisi gerekli');
    assert.equal((await api('PUT', `/api/eticaret/platformlar/${platformId}`, { platform_adi: 'x' }, k.eticaret.token)).durum, 403);
    assert.equal((await api('DELETE', `/api/eticaret/platformlar/${platformId}`, undefined, k.eticaret.token)).durum, 403);
    // listeleme ise e-ticaret yetkilisine açık
    assert.equal((await api('GET', '/api/eticaret/platformlar', undefined, k.eticaret.token)).durum, 200);
  });

  it('platform: ad zorunlu 400; olmayan güncelleme 404; KDV varsayılanı 20', async () => {
    const bos = await api('POST', '/api/eticaret/platformlar', { platform_adi: '  ' }, admin);
    assert.equal(bos.durum, 400);
    assert.equal(bos.govde.message, 'Platform adı zorunludur');
    const yok = await api('PUT', '/api/eticaret/platformlar/2147483000', { platform_adi: 'x' }, admin);
    assert.equal(yok.durum, 404);
    assert.equal(yok.govde.message, 'Platform bulunamadı');
    const liste = (await api('GET', '/api/eticaret/platformlar', undefined, admin)).govde.find((x) => x.id === platformId);
    assert.equal(Number(liste.kdv_orani), 20);
  });

  it('satış: kâr hesaplanır, platform adı yanıtta; stok düşer; silinince iade edilir', async () => {
    const r = await api('POST', '/api/eticaret', { stok_id: stokId, platform_id: platformId, urun_adi: 'Kask', alis_fiyati: 100, satis_fiyati: 300, komisyon_orani: 10, kargo_ucreti: 20, adet: 2 }, admin);
    assert.equal(r.durum, 201);
    assert.ok(r.govde.platform_adi);
    assert.equal(typeof Number(r.govde.kar), 'number');
    assert.ok(Number(r.govde.komisyon_tutari) > 0);
    assert.equal((await api('GET', `/api/aksesuar-stok/barkod/${stokKodu}`, undefined, admin)).govde.mevcut, 8);
    const sil = await api('DELETE', `/api/eticaret/${r.govde.id}`, undefined, admin);
    assert.equal(sil.durum, 200);
    assert.equal(sil.govde.message, 'E-ticaret satışı silindi');
    assert.equal((await api('GET', `/api/aksesuar-stok/barkod/${stokKodu}`, undefined, admin)).govde.mevcut, 10);
  });

  it('satış: olmayan kayıt 404 mesajları; geçersiz adet 400; istatistik alanları; liste platform adıyla', async () => {
    const g = await api('GET', '/api/eticaret/2147483000', undefined, admin);
    assert.equal(g.durum, 404);
    assert.equal(g.govde.message, 'Satış bulunamadı');
    assert.equal((await api('PUT', '/api/eticaret/2147483000', { urun_adi: 'x', adet: 1 }, admin)).govde.message, 'Bulunamadı');
    assert.equal((await api('POST', '/api/eticaret', { urun_adi: 'x', adet: 0 }, admin)).durum, 400);
    const ist = await api('GET', '/api/eticaret/stats', undefined, admin);
    for (const alan of ['toplam_satis', 'toplam_gelir', 'toplam_komisyon', 'toplam_kar']) assert.ok(alan in ist.govde, alan);
    assert.equal((await api('GET', '/api/eticaret', undefined, admin)).durum, 200);
  });

  it('platform silme 200 "Platform silindi"', async () => {
    const r = await api('DELETE', `/api/eticaret/platformlar/${platformId}`, undefined, admin);
    assert.equal(r.durum, 200);
    assert.equal(r.govde.message, 'Platform silindi');
  });
});

describe('#51 motor ve satış belgeleri: HTTP sözleşmesi', () => {
  let motorId, plaka;
  const PDF = '%PDF-1.4 f10 sozlesme';
  const OCTET = { basliklar: { 'Content-Type': 'application/octet-stream' } };

  before(async () => {
    plaka = benzersiz('34M').slice(0, 12);
    const r = await api('POST', '/api/ikinci-el-motor', {
      plaka, marka: 'Honda', model: 'PCX', yil: 2021, km: 5000, alis_fiyati: 100000, satis_fiyati: 150000, masraflar: 2000,
      komisyoncu_tutari: 3000, durum: 'tamamlandi', alici_adi: benzersiz('F10 Alıcı '), tarih: '2026-08-05', satis_tarihi: '2026-09-20',
    }, admin);
    assert.equal(r.durum, 201);
    motorId = r.govde.id;
  });

  it('oluşturma: kâr hesaplanır (satış - alış - masraf - komisyon), tamamlama tarihi dolu', async () => {
    const r = await api('GET', `/api/ikinci-el-motor/${motorId}`, undefined, admin);
    assert.equal(Number(r.govde.kar), 45000);
    assert.ok(r.govde.tamamlama_tarihi);
    assert.equal(r.govde.durum, 'tamamlandi');
  });

  it('olmayan kayıt 404 "Kayıt bulunamadı" (detay ve güncelleme); geçersiz numara 400', async () => {
    const g = await api('GET', '/api/ikinci-el-motor/2147483000', undefined, admin);
    assert.equal(g.durum, 404);
    assert.equal(g.govde.message, 'Kayıt bulunamadı');
    assert.equal((await api('PUT', '/api/ikinci-el-motor/2147483000', { plaka: 'x' }, admin)).durum, 404);
    assert.equal((await api('GET', '/api/ikinci-el-motor/5abc', undefined, admin)).durum, 400);
  });

  it('kısmi güncelleme: yalnızca gönderilen alan değişir, satış verisi korunur, kâr yeniden hesaplanır', async () => {
    const r = await api('PUT', `/api/ikinci-el-motor/${motorId}`, { km: 6000 }, admin);
    assert.equal(r.durum, 200);
    assert.equal(Number(r.govde.km), 6000);
    assert.equal(Number(r.govde.satis_fiyati), 150000);
    assert.equal(r.govde.plaka, plaka);
    assert.equal(Number(r.govde.kar), 45000);
  });

  it('özet: alan adları; Motor Satış yetkilisi kâr toplamını göremez', async () => {
    const a = await api('GET', '/api/ikinci-el-motor/stats/ozet', undefined, admin);
    for (const alan of ['toplam', 'toplam_satis', 'toplam_alis', 'toplam_kar', 'bekleyen', 'tamamlanan']) assert.ok(alan in a.govde, alan);
    const p = await api('GET', '/api/ikinci-el-motor/stats/ozet', undefined, k.motor.token);
    assert.ok(!('toplam_kar' in p.govde), 'kariGizle kâr anahtarını yanıttan tamamen siler');
  });

  it('silme yalnız admin: Motor Satış yetkilisi 403 "Silme yetkiniz yok"', async () => {
    const r = await api('DELETE', `/api/ikinci-el-motor/${motorId}`, undefined, k.motor.token);
    assert.equal(r.durum, 403);
    assert.equal(r.govde.message, 'Silme yetkiniz yok');
  });

  it('belge: yükleme 201, listede görünür, indirilen içerik yüklenenle AYNI, arşivde tarihlerle gruplanır', async () => {
    const y = await api('POST', `/api/satis-belgeleri/motor/${motorId}?ad=sozlesme.pdf`, PDF, k.motor.token, OCTET);
    assert.equal(y.durum, 201);
    assert.equal(y.govde.dosya_adi, 'sozlesme.pdf');
    assert.equal(y.govde.mime, 'application/pdf');
    const liste = await api('GET', `/api/satis-belgeleri/motor/${motorId}`, undefined, k.motor.token);
    assert.equal(liste.govde.length, 1);
    const indir = await api('GET', `/api/satis-belgeleri/${y.govde.id}/indir`, undefined, k.motor.token);
    assert.equal(indir.durum, 200);
    assert.equal(indir.govde, PDF);
    assert.match(indir.basliklar.get('content-disposition'), /attachment; filename="sozlesme.pdf"/);
    const arsiv = await api('GET', '/api/satis-belgeleri/arsiv', undefined, admin);
    const grup = arsiv.govde.find((g) => g.motor_id === motorId);
    assert.equal(grup.alis_tarihi, '2026-08-05');
    assert.equal(grup.satis_tarihi, '2026-09-20');
    assert.equal(grup.belgeler.length, 1);
  });

  it('belge doğrulaması: tür, içerik uyuşmazlığı, boş gövde, olmayan satış, geçersiz numara', async () => {
    const exe = await api('POST', `/api/satis-belgeleri/motor/${motorId}?ad=virus.exe`, PDF, admin, OCTET);
    assert.equal(exe.durum, 400);
    assert.match(exe.govde.message, /Desteklenmeyen dosya türü/);
    const sahte = await api('POST', `/api/satis-belgeleri/motor/${motorId}?ad=foto.png`, PDF, admin, OCTET);
    assert.equal(sahte.durum, 400);
    assert.equal(sahte.govde.message, 'Dosya içeriği uzantısıyla uyuşmuyor');
    const yok = await api('POST', '/api/satis-belgeleri/motor/2147483000?ad=a.pdf', PDF, admin, OCTET);
    assert.equal(yok.durum, 404);
    assert.equal(yok.govde.message, 'Satış kaydı bulunamadı');
    assert.equal((await api('POST', '/api/satis-belgeleri/motor/abc?ad=a.pdf', PDF, admin, OCTET)).govde.message, 'Geçersiz satış');
    assert.equal((await api('GET', '/api/satis-belgeleri/xyz/indir', undefined, admin)).govde.message, 'Geçersiz belge');
    assert.equal((await api('GET', '/api/satis-belgeleri/2147483000/indir', undefined, admin)).govde.message, 'Belge bulunamadı');
  });

  it('belge erişimi: yetkisiz personel 403; muhasebeci arşivi görür ama yükleyemez/silemez', async () => {
    const yetkisiz = await api('GET', `/api/satis-belgeleri/motor/${motorId}`, undefined, k.servis.token);
    assert.equal(yetkisiz.durum, 403);
    assert.equal(yetkisiz.govde.message, 'Satış belgelerine erişim yetkiniz yok');
    const muh = await kullaniciOlustur(api, admin, benzersiz('f10_muh_'), 'muhasebeci');
    assert.equal((await api('GET', '/api/satis-belgeleri/arsiv', undefined, muh.token)).durum, 200);
    assert.equal((await api('POST', `/api/satis-belgeleri/motor/${motorId}?ad=a.pdf`, PDF, muh.token, OCTET)).durum, 403);
  });

  it('belge silme 200 "Belge silindi"; sonra indirme 404; admin motoru siler 200', async () => {
    const liste = (await api('GET', `/api/satis-belgeleri/motor/${motorId}`, undefined, admin)).govde;
    const sil = await api('DELETE', `/api/satis-belgeleri/${liste[0].id}`, undefined, k.motor.token);
    assert.equal(sil.durum, 200);
    assert.equal(sil.govde.message, 'Belge silindi');
    assert.equal((await api('GET', `/api/satis-belgeleri/${liste[0].id}/indir`, undefined, admin)).durum, 404);
    const motor = await api('DELETE', `/api/ikinci-el-motor/${motorId}`, undefined, admin);
    assert.equal(motor.durum, 200);
    assert.equal(motor.govde.message, 'Motor satışı silindi');
  });
});

describe('#52 raporlar ve veresiye: HTTP sözleşmesi', () => {
  let yat, bugun;

  before(async () => {
    yat = await kullaniciOlustur(api, admin, benzersiz('f10_yat_'), 'yatirimci');
    bugun = new Date().toISOString().split('T')[0];
  });

  it('günlük rapor: dört kaynak + toplam; tarih verilmezse bugün (UTC)', async () => {
    const r = await api('GET', '/api/raporlar/gunluk', undefined, admin);
    assert.equal(r.durum, 200);
    assert.equal(r.govde.tarih, bugun);
    for (const alan of ['is_emirleri', 'aksesuarlar', 'motorlar', 'eticaret']) assert.ok(Array.isArray(r.govde[alan].kayitlar), alan);
    assert.ok('gelir' in r.govde.toplam && 'kar' in r.govde.toplam);
    assert.equal((await api('GET', '/api/raporlar/gunluk?tarih=2020-01-02', undefined, admin)).govde.tarih, '2020-01-02');
  });

  it('aralık raporu: tarih eksikse 400 "Başlangıç ve bitiş tarihi gerekli"; tam istekte toplam alanları', async () => {
    const eksik = await api('GET', '/api/raporlar/aralik?baslangic=2026-01-01', undefined, admin);
    assert.equal(eksik.durum, 400);
    assert.equal(eksik.govde.message, 'Başlangıç ve bitiş tarihi gerekli');
    const tam = await api('GET', '/api/raporlar/aralik?baslangic=2026-01-01&bitis=2026-12-31', undefined, admin);
    assert.equal(tam.durum, 200);
    for (const alan of ['motorGelir', 'isEmriGelir', 'aksesuarGelir', 'eticaretGelir', 'yedekParcaToplamDeger', 'motorStokToplam']) assert.ok(alan in tam.govde, alan);
    assert.ok('gelir' in tam.govde.toplam && 'maliyet' in tam.govde.toplam && 'kar' in tam.govde.toplam);
  });

  it('genel rapor, fiş kâr ve personel listesi yanıt şekilleri', async () => {
    const genel = await api('GET', '/api/raporlar/genel', undefined, admin);
    for (const alan of ['is_emirleri', 'aksesuarlar', 'motorlar', 'eticaret', 'yedek_parcalar', 'toplam']) assert.ok(alan in genel.govde, alan);
    assert.ok(Array.isArray((await api('GET', '/api/raporlar/fis-kar', undefined, admin)).govde));
    assert.ok(Array.isArray((await api('GET', '/api/raporlar/personeller', undefined, admin)).govde));
  });

  it('erişim: personel raporlara giremez (403); yatırımcı genel raporlara giremez ama kendi raporunu görür', async () => {
    assert.equal((await api('GET', '/api/raporlar/genel', undefined, k.servis.token)).durum, 403);
    const genel = await api('GET', '/api/raporlar/genel', undefined, yat.token);
    assert.equal(genel.durum, 403);
    assert.equal(genel.govde.message, 'Bu rapora erişim yetkiniz yok');
    const kendi = await api('GET', '/api/raporlar/yatirimci-rapor', undefined, yat.token);
    assert.equal(kendi.durum, 200);
    for (const alan of ['stok_adet', 'satilan_adet', 'toplam_yatirimci_kar', 'toplam_satis', 'toplam_alis', 'stok_degeri']) assert.ok(alan in kendi.govde.ozet, alan);
  });

  it('yatırımcı raporu: admin yatirimci_id vermezse 400; verirse o yatırımcının raporu', async () => {
    const yok = await api('GET', '/api/raporlar/yatirimci-rapor', undefined, admin);
    assert.equal(yok.durum, 400);
    assert.equal(yok.govde.message, 'yatirimci_id gerekli');
    assert.equal((await api('GET', `/api/raporlar/yatirimci-rapor?yatirimci_id=${yat.id}`, undefined, admin)).durum, 200);
    const ozet = await api('GET', '/api/raporlar/yatirimci-ozet', undefined, admin);
    assert.ok(ozet.govde.some((x) => x.id === yat.id));
  });

  it('veresiye: yalnız admin; yanıt borclar + özet; açık borç aksesuar satışı listeye girer', async () => {
    assert.equal((await api('GET', '/api/veresiye', undefined, k.servis.token)).durum, 403);
    const ad = benzersiz('F10 Borçlu ');
    const s2 = await api('POST', '/api/aksesuarlar', { ad_soyad: ad, kalan_odeme: 123, parcalar: [{ urun_adi: 'Kask', adet: 1, satis_fiyati: 500 }] }, admin);
    assert.equal(s2.durum, 201);
    const r = await api('GET', '/api/veresiye', undefined, admin);
    assert.equal(r.durum, 200);
    const borc = r.govde.borclar.find((b) => b.musteri_adi === ad);
    assert.ok(borc, 'borç listede');
    assert.equal(borc.kaynak_key, 'aksesuar');
    assert.equal(borc.kalan_odeme, 123);
    assert.ok(r.govde.ozet.aksesuar >= 123);
    for (const alan of ['motor', 'servis', 'aksesuar', 'yedek_parca', 'toplam', 'kayit_sayisi']) assert.ok(alan in r.govde.ozet, alan);
    await api('DELETE', `/api/aksesuarlar/${s2.govde.id}`, undefined, admin);
  });
});
