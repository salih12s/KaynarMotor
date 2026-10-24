/*
 * Faz 12 testleri (gerçek sunucu + gerçek MariaDB): vitrin (site ilanları) modülünün HTTP SÖZLEŞMESİ. Taşıma davranışı
 * değiştirmemeli: durum kodları, mesajlar, medya başlıkları (önbellek, ETag, nosniff, Range) sabit kalır.
 *
 *   #54 vitrin: ilan akışı, gizlilik, medya sunumu, yayın/sıra yönetimi, iletişim ve segmentler
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

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const MP4 = `data:video/mp4;base64,${Buffer.alloc(100, 7).toString('base64')}`; // 100 baytlık sahte video

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
  k.motorcu = await kullaniciOlustur(api, admin, benzersiz('f12_mtr_'), 'personel', { motor_vitrin_yetkisi: true });
  k.aksesuarci = await kullaniciOlustur(api, admin, benzersiz('f12_aks_'), 'personel', { aksesuar_vitrin_yetkisi: true });
  k.bos = await kullaniciOlustur(api, admin, benzersiz('f12_bos_'), 'personel');
});
after(() => s && s.durdur());

describe('#54 vitrin: HTTP sözleşmesi', () => {
  let ilanId, ikinciId, gorselId, videoId, marka;

  before(async () => {
    marka = benzersiz('Marka');
    const r = await api(
      'POST',
      '/api/vitrin',
      {
        kategori: 'motor',
        baslik: benzersiz('F12 İlan '),
        segment: 'Scooter',
        marka,
        model: 'PCX',
        fiyat: 100000,
        motor_durumu: 'sifir',
        gorseller: [PNG, PNG],
        video: MP4,
      },
      admin,
    );
    assert.equal(r.durum, 201, JSON.stringify(r.govde));
    ilanId = r.govde.id;
    const detay = await api('GET', `/api/vitrin/${ilanId}`);
    gorselId = detay.govde.gorsel_idler[0];
    videoId = detay.govde.video_dosya_id;
    const r2 = await api('POST', '/api/vitrin', { kategori: 'motor', baslik: benzersiz('F12 İkinci '), segment: 'Scooter', marka }, admin);
    ikinciId = r2.govde.id;
  });

  it('oluşturma 201: id, ilan_no ve kapak görsel id döner', async () => {
    const r = await api('GET', `/api/vitrin/${ilanId}`);
    assert.equal(r.durum, 200);
    assert.equal(r.govde.kategori, 'motor');
    assert.equal(r.govde.motor_durumu, 'sifir');
    assert.equal(r.govde.gorsel_idler.length, 2);
    assert.equal(r.govde.kapak_gorsel_id, r.govde.gorsel_idler[0], 'ilk görsel kapak');
    assert.ok(r.govde.ilan_no);
  });

  it('herkese açık liste: yalnızca yayındakiler, base64 YOK (hafif), vitrin sırasıyla', async () => {
    const r = await api('GET', '/api/vitrin?kategori=motor');
    assert.equal(r.durum, 200);
    assert.ok(r.govde.some((x) => x.id === ilanId));
    assert.ok(!JSON.stringify(r.govde).includes('data:image'), 'liste görsel verisi taşımaz');
    assert.ok(r.govde.every((x) => x.yayinda === true || x.yayinda === 1));
  });

  it('markalar: yayındaki motor ilanları, adet SAYI olarak', async () => {
    const r = await api('GET', '/api/vitrin/markalar');
    const m = r.govde.find((x) => x.marka === marka);
    assert.ok(m);
    assert.equal(typeof m.adet, 'number');
    assert.equal(m.adet, 2);
  });

  it('görsel sunumu: tür, güvenlik başlıkları, "bir yıl değişmez" önbellek, ETag; koşullu istek 304', async () => {
    const r = await api('GET', `/api/vitrin/gorsel/${gorselId}`);
    assert.equal(r.durum, 200);
    assert.equal(r.basliklar.get('content-type'), 'image/png');
    assert.equal(r.basliklar.get('x-content-type-options'), 'nosniff');
    assert.equal(r.basliklar.get('content-security-policy'), "default-src 'none'; sandbox");
    assert.equal(r.basliklar.get('cache-control'), 'public, max-age=31536000, immutable');
    const etag = r.basliklar.get('etag');
    assert.equal(etag, `"vitrin-gorsel-${gorselId}"`);
    const kosullu = await api('GET', `/api/vitrin/gorsel/${gorselId}`, undefined, undefined, { basliklar: { 'If-None-Match': etag } });
    assert.equal(kosullu.durum, 304);
  });

  it('görsel hataları METİN döner: olmayan 404 kısa önbellekli (hata bir yıl saklanmaz); geçersiz numara 400 JSON', async () => {
    const yok = await api('GET', '/api/vitrin/gorsel/2147483000');
    assert.equal(yok.durum, 404);
    assert.equal(yok.govde, 'Görsel bulunamadı');
    assert.equal(yok.basliklar.get('cache-control'), 'public, max-age=60');
    const kotu = await api('GET', '/api/vitrin/gorsel/abc');
    assert.equal(kotu.durum, 400);
    assert.equal(kotu.govde.message, 'Geçersiz kayıt numarası');
  });

  it('video: tam içerik 200 + Accept-Ranges; Range isteği 206 + Content-Range; bozuk aralık tüm dosyayı verir', async () => {
    const tam = await api('GET', `/api/vitrin/video/${videoId}`);
    assert.equal(tam.durum, 200);
    assert.equal(tam.basliklar.get('content-type'), 'video/mp4');
    assert.equal(tam.basliklar.get('accept-ranges'), 'bytes');
    assert.equal(tam.basliklar.get('content-length'), '100');
    const parca = await api('GET', `/api/vitrin/video/${videoId}`, undefined, undefined, { basliklar: { Range: 'bytes=10-19' } });
    assert.equal(parca.durum, 206);
    assert.equal(parca.basliklar.get('content-range'), 'bytes 10-19/100');
    assert.equal(parca.basliklar.get('content-length'), '10');
    const tersi = await api('GET', `/api/vitrin/video/${videoId}`, undefined, undefined, { basliklar: { Range: 'bytes=90-5' } });
    assert.equal(tersi.durum, 206);
    assert.equal(tersi.basliklar.get('content-range'), 'bytes 0-99/100');
    assert.equal((await api('GET', '/api/vitrin/video/2147483000')).govde, 'Video bulunamadı');
  });

  it('yayın yönetimi yalnız admin: personel 403; boolean olmayan 400; admin kaldırır', async () => {
    const personel = await api('PATCH', `/api/vitrin/${ikinciId}/yayin`, { yayinda: false }, k.motorcu.token);
    assert.equal(personel.durum, 403);
    assert.equal(personel.govde.message, 'Bu işlem için admin yetkisi gerekli');
    const kotu = await api('PATCH', `/api/vitrin/${ikinciId}/yayin`, { yayinda: 'false' }, admin);
    assert.equal(kotu.durum, 400);
    assert.equal(kotu.govde.message, 'Yayın durumu geçersiz');
    const ok = await api('PATCH', `/api/vitrin/${ikinciId}/yayin`, { yayinda: false }, admin);
    assert.equal(ok.durum, 200);
    assert.equal(ok.govde.id, ikinciId);
    assert.equal(Number(ok.govde.yayinda), 0);
    assert.equal((await api('PATCH', '/api/vitrin/2147483000/yayin', { yayinda: true }, admin)).govde.message, 'Kayıt bulunamadı');
  });

  it('yayında olmayan ilan GİZLİ: anonim/yetkisiz 404, yetkili görür; arşiv listesi (hepsi=1) token ister', async () => {
    assert.equal((await api('GET', `/api/vitrin/${ikinciId}`)).durum, 404);
    assert.equal((await api('GET', `/api/vitrin/${ikinciId}`, undefined, k.bos.token)).durum, 404);
    assert.equal((await api('GET', `/api/vitrin/${ikinciId}`, undefined, admin)).durum, 200);
    assert.equal((await api('GET', `/api/vitrin/${ikinciId}`, undefined, k.motorcu.token)).durum, 200);
    const acik = await api('GET', '/api/vitrin?kategori=motor');
    assert.ok(!acik.govde.some((x) => x.id === ikinciId), 'arşiv ilan herkese açık listede yok');
    assert.equal((await api('GET', '/api/vitrin?hepsi=1')).durum, 401);
    assert.equal((await api('GET', '/api/vitrin?hepsi=1', undefined, k.bos.token)).durum, 403);
    const hepsi = await api('GET', '/api/vitrin?hepsi=1', undefined, admin);
    assert.ok(hepsi.govde.some((x) => x.id === ikinciId));
  });

  it('yayına geri alınan ilan listenin SONUNA girer', async () => {
    await api('PATCH', `/api/vitrin/${ikinciId}/yayin`, { yayinda: true }, admin);
    const liste = (await api('GET', '/api/vitrin?kategori=motor')).govde;
    const sonSira = Math.max(...liste.map((x) => Number(x.siralama)));
    assert.equal(Number(liste.find((x) => x.id === ikinciId).siralama), sonSira);
  });

  it('doğrudan sıra: istenen sıraya taşır {sira, urun_ids}; geçersiz sıra 400; olmayan ilan 404', async () => {
    const r = await api('PATCH', `/api/vitrin/${ikinciId}/sira`, { sira: 1 }, admin);
    assert.equal(r.durum, 200);
    assert.equal(r.govde.sira, 1);
    assert.equal(r.govde.urun_ids[0], ikinciId);
    const kotu = await api('PATCH', `/api/vitrin/${ikinciId}/sira`, { sira: 0 }, admin);
    assert.equal(kotu.durum, 400);
    assert.equal(kotu.govde.message, 'Sıra numarası 1 veya daha büyük olmalı');
    assert.equal((await api('PATCH', '/api/vitrin/2147483000/sira', { sira: 1 }, admin)).durum, 404);
  });

  it('toplu sıralama: kategori kuralları ve doğrulama mesajları', async () => {
    const ok = await api('PUT', '/api/vitrin/sirala', { kategori: 'motor', urun_ids: [ilanId, ikinciId] }, k.motorcu.token);
    assert.equal(ok.durum, 200);
    assert.equal(ok.govde.message, 'Vitrin sırası güncellendi');
    assert.equal((await api('PUT', '/api/vitrin/sirala', { kategori: 'x', urun_ids: [1] }, admin)).govde.message, 'Geçersiz kategori');
    const yetkisiz = await api('PUT', '/api/vitrin/sirala', { kategori: 'motor', urun_ids: [ilanId] }, k.aksesuarci.token);
    assert.equal(yetkisiz.durum, 403);
    assert.equal(yetkisiz.govde.message, 'Bu kategori için vitrin yetkiniz yok');
    assert.equal((await api('PUT', '/api/vitrin/sirala', { kategori: 'motor', urun_ids: [] }, admin)).govde.message, 'Sıralanacak ilan listesi geçersiz');
    assert.equal(
      (await api('PUT', '/api/vitrin/sirala', { kategori: 'motor', urun_ids: [ilanId, ilanId] }, admin)).govde.message,
      'İlan listesinde geçersiz veya tekrar eden kayıt var',
    );
    assert.equal(
      (await api('PUT', '/api/vitrin/sirala', { kategori: 'aksesuar', urun_ids: [ilanId] }, admin)).govde.message,
      'Bazı ilanlar bu kategoriye ait değil',
    );
  });

  it('oluşturma doğrulamaları: kategori, başlık, segment, medya türü, bağlantı; yetkisiz kategori 403', async () => {
    const gonder = (g, token = admin) => api('POST', '/api/vitrin', g, token);
    assert.equal((await gonder({ kategori: 'x', baslik: 'a' })).govde.message, 'Geçersiz kategori');
    assert.equal((await gonder({ kategori: 'motor', baslik: '', segment: 'S' })).govde.message, 'Başlık zorunlu');
    assert.equal((await gonder({ kategori: 'motor', baslik: 'a' })).govde.message, 'Motor ilanı için segment zorunlu');
    assert.match(
      (await gonder({ kategori: 'motor', baslik: 'a', segment: 'S', gorseller: ['data:text/html;base64,AAAA'] })).govde.message,
      /Görseller yalnızca/,
    );
    assert.equal(
      (await gonder({ kategori: 'motor', baslik: 'a', segment: 'S', rubik_link: 'javascript:alert(1)' })).govde.message,
      'Ödeme linki http:// veya https:// ile başlamalıdır',
    );
    const yetkisiz = await gonder({ kategori: 'motor', baslik: 'a', segment: 'S' }, k.aksesuarci.token);
    assert.equal(yetkisiz.durum, 403);
    assert.equal((await gonder({ kategori: 'motor', baslik: 'a', segment: 'S' }, k.bos.token)).govde.message, 'Vitrin yönetim yetkiniz yok');
  });

  it('güncelleme: "Güncellendi"; olmayan ilan 404; video_sil videoyu kaldırır', async () => {
    const r = await api('PUT', `/api/vitrin/${ilanId}`, { kategori: 'motor', baslik: 'Yeni Başlık', segment: 'Scooter', marka, video_sil: true }, admin);
    assert.equal(r.durum, 200);
    assert.equal(r.govde.message, 'Güncellendi');
    const detay = (await api('GET', `/api/vitrin/${ilanId}`)).govde;
    assert.equal(detay.baslik, 'Yeni Başlık');
    assert.equal(detay.video_dosya_id, null);
    assert.equal((await api('PUT', '/api/vitrin/2147483000', { kategori: 'motor', baslik: 'x', segment: 'S' }, admin)).govde.message, 'Kayıt bulunamadı');
  });

  it('iletişim ve segmentler: kaydet, görsel var/yok, hizmet görseli sunumu, yeni segment', async () => {
    const kayit = await api('PUT', '/api/vitrin/iletisim/sigorta', { personel_adi: 'Ayşe', telefon: '0555', baslik: 'Sigorta', gorsel: PNG }, admin);
    assert.equal(kayit.durum, 200);
    assert.equal(kayit.govde.message, 'Kaydedildi');
    const liste = (await api('GET', '/api/vitrin/iletisim')).govde.find((x) => x.kategori === 'sigorta');
    assert.equal(liste.gorsel_var, true);
    assert.ok(!('gorsel' in liste), 'görselin kendisi listede yok');
    const gorsel = await api('GET', '/api/vitrin/iletisim-gorsel/sigorta');
    assert.equal(gorsel.durum, 200);
    assert.equal(gorsel.basliklar.get('content-type'), 'image/png');
    assert.equal(gorsel.basliklar.get('cache-control'), 'public, max-age=3600');
    assert.equal((await api('GET', '/api/vitrin/iletisim-gorsel/yok-kategori')).govde, 'Görsel bulunamadı');
    assert.equal((await api('PUT', '/api/vitrin/iletisim/x', { personel_adi: 'a' }, admin)).govde.message, 'Geçersiz kategori');
    assert.equal((await api('PUT', '/api/vitrin/iletisim/motor', { personel_adi: 'a' }, k.aksesuarci.token)).durum, 403);

    const ad = benzersiz('Seg ');
    const seg = await api('POST', '/api/vitrin/segmentler', { ad: ` ${ad} ` }, admin);
    assert.equal(seg.durum, 201);
    assert.equal(seg.govde.ad, ad);
    assert.ok((await api('GET', '/api/vitrin/segmentler')).govde.some((x) => x.ad === ad));
    assert.equal((await api('POST', '/api/vitrin/segmentler', { ad: '  ' }, admin)).govde.message, 'Segment adı zorunlu');
  });

  it('silme: personel başka kategorideki ilanı silemez (403); admin siler 200 "Silindi"; sonra 404', async () => {
    const aksesuar = await api('POST', '/api/vitrin', { kategori: 'aksesuar', baslik: benzersiz('F12 Aks ') }, admin);
    assert.equal(aksesuar.durum, 201);
    assert.equal((await api('DELETE', `/api/vitrin/${aksesuar.govde.id}`, undefined, k.motorcu.token)).durum, 403);
    for (const id of [ilanId, ikinciId, aksesuar.govde.id]) {
      const r = await api('DELETE', `/api/vitrin/${id}`, undefined, admin);
      assert.equal(r.durum, 200);
      assert.equal(r.govde.message, 'Silindi');
    }
    assert.equal((await api('GET', `/api/vitrin/${ilanId}`, undefined, admin)).durum, 404);
    // Not: silinen ilanın görseli, bellek önbelleği yüzünden (10 dk ömür, bilinçli tasarım) bir süre sunulabilir; bu yüzden
    // görselin 404 olması burada beklenmez (önbellek davranışı unit testlerinde sınanır).
  });
});
