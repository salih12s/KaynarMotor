/*
 * Gerçek sunucu + gerçek MariaDB: sıfır motor stoğu, sıfır satışı, rapor ayrımı ve vitrin bağlantısı.
 *
 *   #S1 kimlik ve yetki: anonim 401, yatırımcı ve izinsiz muhasebeci 403, motor yetkisi olmayan personel yazamaz (403),
 *       okurken alış fiyatını görmez; silme yalnız admin
 *   #S2 görsel: herkese açık uçtan doğru türle ve nosniff ile sunulur; HTML "görsel" 400
 *   #S3 iki satış sonrası model HÂLÂ stokta (satış stoktan düşmez), sayaç 2; satış kârı = liste − alış
 *   #S4 model seçilmeden / olmayan modelle satış 400
 *   #S5 rapor: sıfır satışlar adede ve gelire girer, kârları ayrı alanda (önce/sonra farkıyla ölçülür: DB paylaşımlı)
 *   #S6 vitrin: liste fiyatı değişince bağlı ilanın fiyatı değişir; model silinince ilan yayından kalkar, satış "sıfır" kalır
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
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
// Raporu kirletmemek için satışlar bu tarihe yazılır; ölçüm yine de önce/sonra farkıyla yapılır
const SATIS_TARIHI = '2031-03-14';
let modelId;

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
  k.motorcu = await kullaniciOlustur(api, admin, benzersiz('sf_mot_'), 'personel', { motor_satis_yetkisi: true });
  k.personel = await kullaniciOlustur(api, admin, benzersiz('sf_prs_'), 'personel');
  k.yatirimci = await kullaniciOlustur(api, admin, benzersiz('sf_yat_'), 'yatirimci');
  k.muhasebeci = await kullaniciOlustur(api, admin, benzersiz('sf_muh_'), 'muhasebeci');
  const r = await api(
    'POST',
    '/api/sifir-motor',
    { marka: 'Honda', model: benzersiz('PCX '), yil: 2026, motor_cc: 125, segment: 'Scooter', alis_fiyati: 95000, liste_fiyati: 120000, gorseller: [PNG] },
    k.motorcu.token,
  );
  assert.equal(r.durum, 201, JSON.stringify(r.govde));
  modelId = r.govde.id;
});
after(() => s && s.durdur());

describe('#S1 kimlik ve yetki', () => {
  it('anonim liste ve ekleme 401', async () => {
    assert.equal((await api('GET', '/api/sifir-motor')).durum, 401);
    assert.equal((await api('POST', '/api/sifir-motor', { marka: 'X' })).durum, 401);
  });

  it('yatırımcı ve izinsiz muhasebeci 403', async () => {
    assert.equal((await api('GET', '/api/sifir-motor', undefined, k.yatirimci.token)).durum, 403);
    assert.equal((await api('GET', `/api/sifir-motor/${modelId}`, undefined, k.muhasebeci.token)).durum, 403);
  });

  it('motor yetkisi olmayan personel okur ama alış fiyatını görmez; ekleyemez (403)', async () => {
    const r = await api('GET', `/api/sifir-motor/${modelId}`, undefined, k.personel.token);
    assert.equal(r.durum, 200);
    assert.equal(r.govde.liste_fiyati, '120000.00');
    assert.equal('alis_fiyati' in r.govde, false);
    assert.equal((await api('POST', '/api/sifir-motor', { marka: 'X' }, k.personel.token)).durum, 403);
  });

  it('motor satış yetkilisi alış fiyatını görür ama modeli SİLEMEZ (403)', async () => {
    const r = await api('GET', `/api/sifir-motor/${modelId}`, undefined, k.motorcu.token);
    assert.equal(r.govde.alis_fiyati, '95000.00');
    assert.equal((await api('DELETE', `/api/sifir-motor/${modelId}`, undefined, k.motorcu.token)).durum, 403);
  });

  it('marka boşsa 400; olmayan model 404; bozuk id 400', async () => {
    assert.equal((await api('POST', '/api/sifir-motor', { marka: '' }, admin)).durum, 400);
    assert.equal((await api('GET', '/api/sifir-motor/999999999', undefined, admin)).durum, 404);
    assert.equal((await api('PUT', '/api/sifir-motor/999999999', { marka: 'X' }, admin)).durum, 404);
    assert.equal((await api('GET', '/api/sifir-motor/5abc', undefined, admin)).durum, 400);
  });
});

describe('#S2 görsel', () => {
  it('giriş gerekmeden doğru türle ve nosniff ile sunulur', async () => {
    const d = await api('GET', `/api/sifir-motor/${modelId}`, undefined, admin);
    assert.equal(d.govde.gorsel_idler.length, 1);
    assert.equal(d.govde.kapak_gorsel_id, d.govde.gorsel_idler[0]);
    const r = await fetch(`${s.url}/api/sifir-motor/gorsel/${d.govde.gorsel_idler[0]}`);
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'image/png');
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  });

  it('HTML "görsel" 400 (yazılmaz); olmayan görsel 404', async () => {
    const r = await api('POST', '/api/sifir-motor', { marka: 'Kötü', gorseller: ['data:text/html;base64,PHNjcmlwdD4='] }, admin);
    assert.equal(r.durum, 400);
    assert.equal((await fetch(`${s.url}/api/sifir-motor/gorsel/999999999`)).status, 404);
  });
});

const sat = (govde, token = k.motorcu.token) =>
  api('POST', '/api/ikinci-el-motor', { motor_durumu: 'sifir', satis_tarihi: SATIS_TARIHI, alici_adi: 'Test Alıcı', ...govde }, token);
const aralik = async () => (await api('GET', `/api/raporlar/aralik?baslangic=${SATIS_TARIHI}&bitis=${SATIS_TARIHI}`, undefined, admin)).govde;

describe('#S3-#S5 sıfır satışı ve rapor', () => {
  it('iki satış: model stokta kalır, sayaç 2; boş fiyat modelden, yazılan fiyat ondan önce gelir; rapor kârı ayrı', async () => {
    const once = await aralik();

    const a = await sat({ sifir_motor_id: modelId });
    assert.equal(a.durum, 201, JSON.stringify(a.govde));
    assert.equal(a.govde.motor_durumu, 'sifir');
    assert.equal(a.govde.durum, 'tamamlandi');
    assert.equal(a.govde.satis_fiyati, '120000.00');
    const b = await sat({ sifir_motor_id: modelId, satis_fiyati: 115000, masraflar: 1000 });
    assert.equal(b.durum, 201);

    // Model hâlâ stokta (satış stoktan düşmedi), 2 satış sayıldı
    const model = await api('GET', `/api/sifir-motor/${modelId}`, undefined, admin);
    assert.equal(model.durum, 200);
    assert.equal(model.govde.satilan_adet, 2);

    // Kâr yalnız admin'de: admin satış kaydında kârı görür, motor satış yetkilisi görmez
    assert.equal((await api('GET', `/api/ikinci-el-motor/${a.govde.id}`, undefined, admin)).govde.kar, '25000.00');
    assert.equal('kar' in (await api('GET', `/api/ikinci-el-motor/${a.govde.id}`, undefined, k.motorcu.token)).govde, false);

    const sonra = await aralik();
    assert.equal(sonra.motorSifirAdet - once.motorSifirAdet, 2);
    assert.equal(sonra.motorSifirGelir - once.motorSifirGelir, 235000);
    assert.equal(sonra.motorSifirKar - once.motorSifirKar, 25000 + 19000);
    // Toplam motor satışına ve gelirine de girer
    assert.equal(sonra.motorlar.length - once.motorlar.length, 2);
    assert.equal(sonra.motorGelir - once.motorGelir, 235000);
  });

  it('#S4 model seçilmeden 400; olmayan modelle 400', async () => {
    assert.equal((await sat({})).durum, 400);
    assert.equal((await sat({ sifir_motor_id: 999999999 })).durum, 400);
  });

  it('motor özetinde sıfır kârı admin dışına gitmez', async () => {
    const ozet = await api('GET', '/api/ikinci-el-motor/stats/ozet', undefined, k.motorcu.token);
    assert.equal(ozet.durum, 200);
    assert.equal('sifir_kar' in ozet.govde, false);
    assert.ok(Number(ozet.govde.sifir_adet) >= 2);
    assert.ok('sifir_kar' in (await api('GET', '/api/ikinci-el-motor/stats/ozet', undefined, admin)).govde);
  });
});

describe('#S6 vitrin bağlantısı', () => {
  it('liste fiyatı değişince ilan fiyatı değişir; model silinince ilan yayından kalkar, satış "sıfır" kalır', async () => {
    const m = await api('POST', '/api/sifir-motor', { marka: 'Yamaha', model: benzersiz('NMAX '), liste_fiyati: 140000 }, admin);
    const id = m.govde.id;
    const ilan = await api(
      'POST',
      '/api/vitrin',
      { kategori: 'motor', baslik: benzersiz('NMAX ilan '), segment: 'Scooter', motor_durumu: 'sifir', sifir_motor_id: id, fiyat: 140000 },
      admin,
    );
    assert.equal(ilan.durum, 201, JSON.stringify(ilan.govde));
    const satis = await sat({ sifir_motor_id: id });
    assert.equal(satis.durum, 201);

    // Satış ilanı yayından KALDIRMAZ (eskiden ikinci el stoğuna bağlı sıfır ilanı satılınca kalkıyordu)
    let d = await api('GET', `/api/vitrin/${ilan.govde.id}`, undefined, admin);
    assert.equal(d.govde.yayinda, true);
    assert.equal(d.govde.sifir_motor_id, id);

    assert.equal((await api('PUT', `/api/sifir-motor/${id}`, { liste_fiyati: 145000 }, admin)).durum, 200);
    d = await api('GET', `/api/vitrin/${ilan.govde.id}`, undefined, admin);
    assert.equal(Number(d.govde.fiyat), 145000);

    assert.equal((await api('DELETE', `/api/sifir-motor/${id}`, undefined, admin)).durum, 200);
    d = await api('GET', `/api/vitrin/${ilan.govde.id}`, undefined, admin);
    assert.equal(d.govde.yayinda, false);
    assert.equal(d.govde.sifir_motor_id, null);
    const kalan = await api('GET', `/api/ikinci-el-motor/${satis.govde.id}`, undefined, admin);
    assert.equal(kalan.govde.motor_durumu, 'sifir');
    assert.equal(kalan.govde.sifir_motor_id, null);
    assert.equal((await api('GET', `/api/sifir-motor/${id}`, undefined, admin)).durum, 404);
  });
});
