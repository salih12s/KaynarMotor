/*
 * Faz 2 regression testleri (gerçek sunucu + gerçek MariaDB). Bkz. yerel-arsiv/notlar-ve-veri/YAPILACAKLAR-INCELEME.md
 *   #3   stok düzenleme / içe aktarma satışları silmemeli (mevcut = giren − çıkan)
 *   #10  aksesuar satışında adet tutarlılığı ve adet doğrulaması
 *   #11  müşteri kaydı başka kişinin bilgisini ezmemeli
 *   #18  silme: FK nedeniyle 500 yerine kayıtlar korunarak silinmeli
 *   #19  veritabanı erişilemezken işlem uçları yanıtsız kalmamalı
 *   #32  e-ticaret satışında boş metin stok_id/platform_id
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat, dbsizSunucuBaslat, kullaniciOlustur } = require('./yardimci');

const SON = Date.now().toString(36);
const num = (v) => Number(v);
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

const aksesuarStok = async (giren = 10) => {
  const kod = benzersiz('F2A').slice(0, 19);
  const ad = `Kask ${kod}`;
  const r = await api('POST', '/api/aksesuar-stok', { stok_kodu: kod, stok_adi: ad, giren_miktar: giren, alis_fiyati: 300, satis_fiyati: 700 }, admin);
  assert.equal(r.durum, 201);
  return { id: r.govde.id, kod, ad };
};
const stokOku = async (yol, kod) => (await api('GET', `${yol}/barkod/${kod}`, undefined, admin)).govde;
const satisYap = (ad, adet, durum = 'tamamlandi', ek = {}) =>
  api(
    'POST',
    '/api/aksesuarlar',
    {
      ad_soyad: benzersiz('Müşteri F2 '),
      durum,
      parcalar: [{ urun_adi: ad, adet, maliyet: 300, satis_fiyati: 700 }],
      ...ek,
    },
    admin,
  );

// ---------------------------------------------------------------- #3
describe('#3 stok düzenleme ve içe aktarma satışları silmez', () => {
  it('aksesuar: yalnız fiyat düzeltince mevcut stok değişmez', async () => {
    const st = await aksesuarStok(10);
    await satisYap(st.ad, 4);
    const once = await stokOku('/api/aksesuar-stok', st.kod);
    assert.equal(num(once.mevcut), 6);
    assert.equal(num(once.cikan_miktar), 4);
    const r = await api(
      'PUT',
      `/api/aksesuar-stok/${st.id}`,
      { stok_kodu: st.kod, stok_adi: st.ad, alis_fiyati: 300, satis_fiyati: 750, giren_miktar: 10 },
      admin,
    );
    assert.equal(r.durum, 200);
    const sonra = await stokOku('/api/aksesuar-stok', st.kod);
    assert.equal(num(sonra.mevcut), 6);
    assert.equal(num(sonra.cikan_miktar), 4);
    assert.equal(num(sonra.satis_fiyati), 750);
  });

  it('aksesuar: giren miktarı artırınca mevcut = yeni giren − çıkan', async () => {
    const st = await aksesuarStok(10);
    await satisYap(st.ad, 4);
    await api('PUT', `/api/aksesuar-stok/${st.id}`, { stok_kodu: st.kod, stok_adi: st.ad, alis_fiyati: 300, satis_fiyati: 700, giren_miktar: 15 }, admin);
    const sonra = await stokOku('/api/aksesuar-stok', st.kod);
    assert.equal(num(sonra.giren_miktar), 15);
    assert.equal(num(sonra.mevcut), 11);
    assert.equal(num(sonra.envanter_degeri), 11 * 700);
  });

  it('aksesuar: aynı listeyi /toplu ile tekrar içe aktarmak çıkan miktarı ve satışları korur', async () => {
    const st = await aksesuarStok(10);
    await satisYap(st.ad, 3);
    const liste = { stoklar: [{ stok_kodu: st.kod, stok_adi: st.ad, giren_miktar: 10, alis_fiyati: 300, satis_fiyati: 700 }] };
    const r = await api('POST', '/api/aksesuar-stok/toplu', liste, admin);
    assert.equal(r.durum, 200);
    const sonra = await stokOku('/api/aksesuar-stok', st.kod);
    assert.equal(num(sonra.cikan_miktar), 3);
    assert.equal(num(sonra.mevcut), 7);
  });

  it('aksesuar: /toplu ile yeni kod eklenirse mevcut = giren', async () => {
    const kod = benzersiz('F2N').slice(0, 19);
    await api(
      'POST',
      '/api/aksesuar-stok/toplu',
      { stoklar: [{ stok_kodu: kod, stok_adi: `Yeni ${kod}`, giren_miktar: 8, alis_fiyati: 1, satis_fiyati: 2 }] },
      admin,
    );
    const y = await stokOku('/api/aksesuar-stok', kod);
    assert.equal(num(y.mevcut), 8);
    assert.equal(num(y.cikan_miktar), 0);
  });

  it('yedek parça: satıştan sonra fiyat düzeltince mevcut stok değişmez', async () => {
    const kod = benzersiz('F2Y').slice(0, 19);
    const st = await api(
      'POST',
      '/api/yedek-parca-stok',
      { stok_kodu: kod, stok_adi: `Balata ${kod}`, giren_miktar: 10, alis_fiyati: 50, satis_fiyati: 120 },
      admin,
    );
    assert.equal(st.durum, 201);
    await api('POST', '/api/yedek-parcalar', { urun_adi: 'Balata', alis_fiyati: 200, satis_fiyati: 480, stok_id: st.govde.id, adet: 4 }, admin);
    await api(
      'PUT',
      `/api/yedek-parca-stok/${st.govde.id}`,
      { stok_kodu: kod, stok_adi: `Balata ${kod}`, giren_miktar: 10, alis_fiyati: 50, satis_fiyati: 125 },
      admin,
    );
    const sonra = await stokOku('/api/yedek-parca-stok', kod);
    assert.equal(num(sonra.mevcut), 6);
    assert.equal(num(sonra.cikan_miktar), 4);
  });
});

// ---------------------------------------------------------------- #10
describe('#10 adet tutarlılığı ve doğrulaması', () => {
  it('adet boşsa toplam ve kayıtlı satır tutarlı (1 adet) ve stoktan 1 düşer', async () => {
    const st = await aksesuarStok(10);
    const r = await api(
      'POST',
      '/api/aksesuarlar',
      { ad_soyad: benzersiz('X '), durum: 'tamamlandi', parcalar: [{ urun_adi: st.ad, adet: '', maliyet: 100, satis_fiyati: 200 }] },
      admin,
    );
    assert.equal(r.durum, 201);
    assert.equal(num(r.govde.toplam_satis), 200);
    assert.equal(num(r.govde.toplam_maliyet), 100);
    assert.equal(num(r.govde.kar), 100);
    assert.equal(num(r.govde.parcalar[0].adet), 1);
    assert.equal(num((await stokOku('/api/aksesuar-stok', st.kod)).mevcut), 9);
  });

  it('adet 0, negatif veya ondalık reddedilir (400) ve stok değişmez', async () => {
    const st = await aksesuarStok(10);
    for (const adet of [0, -2, 1.5, 'abc']) {
      const r = await satisYap(st.ad, adet);
      assert.equal(r.durum, 400, `adet=${adet}`);
      assert.match(r.govde.message, /adet/i);
    }
    assert.equal(num((await stokOku('/api/aksesuar-stok', st.kod)).mevcut), 10);
  });

  it('iş emri parçası, yedek parça satışı ve e-ticaret satışında da adet doğrulanır', async () => {
    const ie = await api(
      'POST',
      '/api/is-emirleri',
      { musteri_ad_soyad: 'Adet Test', telefon: '05550009911', parcalar: [{ takilan_parca: 'p', adet: -1, birim_fiyat: 10, maliyet: 5 }] },
      admin,
    );
    assert.equal(ie.durum, 400);
    const yp = await api('POST', '/api/yedek-parcalar', { urun_adi: 'x', satis_fiyati: 1, adet: 0.5 }, admin);
    assert.equal(yp.durum, 400);
    const et = await api('POST', '/api/eticaret', { urun_adi: 'x', satis_fiyati: 10, adet: -3 }, admin);
    assert.equal(et.durum, 400);
  });
});

// ---------------------------------------------------------------- #11
describe('#11 müşteri otomatik kaydı başkasının bilgisini ezmez', () => {
  const musteriler = async () => (await api('GET', '/api/musteriler', undefined, admin)).govde;
  const telefonlu = async (tel10) => (await musteriler()).filter((m) => (m.telefon || '').replace(/\D/g, '').endsWith(tel10));

  it('aynı telefon, farklı isim: mevcut müşterinin adı ve adresi korunur, çift kayıt açılmaz', async () => {
    const tel = `0555${String(Date.now()).slice(-7)}`;
    const m = await api('POST', '/api/musteriler', { ad_soyad: 'Ayşe F2', telefon: tel, adres: 'Eski adres' }, admin);
    assert.equal(m.durum, 201);
    await api('POST', '/api/aksesuarlar', { ad_soyad: 'Mehmet F2', telefon: tel, durum: 'beklemede', parcalar: [] }, admin);
    const liste = await telefonlu(tel.slice(-10));
    assert.equal(liste.length, 1);
    assert.equal(liste[0].ad_soyad, 'Ayşe F2');
    assert.equal(liste[0].adres, 'Eski adres');
  });

  it('aynı müşteri, boş adres: yeni gelen adres yalnızca boş alanı doldurur', async () => {
    const tel = `0556${String(Date.now()).slice(-7)}`;
    await api('POST', '/api/musteriler', { ad_soyad: 'Boş Adres F2', telefon: tel }, admin);
    await api('POST', '/api/is-emirleri', { musteri_ad_soyad: 'Boş Adres F2', telefon: tel, adres: 'Yeni adres', parcalar: [] }, admin);
    const liste = await telefonlu(tel.slice(-10));
    assert.equal(liste.length, 1);
    assert.equal(liste[0].adres, 'Yeni adres');
    await api('POST', '/api/is-emirleri', { musteri_ad_soyad: 'Boş Adres F2', telefon: tel, adres: 'Başka adres', parcalar: [] }, admin);
    assert.equal((await telefonlu(tel.slice(-10)))[0].adres, 'Yeni adres'); // dolu alan artık ezilmez
  });

  it('telefon yazım biçimi farklı olsa da (boşluklu/boşluksuz) aynı müşteri bulunur', async () => {
    const son = String(Date.now()).slice(-7);
    await api('POST', '/api/musteriler', { ad_soyad: 'Biçim F2', telefon: `0557 ${son.slice(0, 3)} ${son.slice(3)}` }, admin);
    await api('POST', '/api/aksesuarlar', { ad_soyad: 'Biçim F2', telefon: `0557${son}`, durum: 'beklemede', parcalar: [] }, admin);
    assert.equal((await telefonlu(`557${son}`)).length, 1);
  });

  it('hiç eşleşme yoksa yeni müşteri açılır', async () => {
    const tel = `0558${String(Date.now()).slice(-7)}`;
    const ad = benzersiz('Yepyeni F2 ');
    await api('POST', '/api/is-emirleri', { musteri_ad_soyad: ad, telefon: tel, parcalar: [] }, admin);
    const liste = await telefonlu(tel.slice(-10));
    assert.equal(liste.length, 1);
    assert.equal(liste[0].ad_soyad, ad);
  });

  it('aynı ad, FARKLI telefon: iki ayrı müşteri olur (adla birleştirilmez), yeni numara kaybolmaz', async () => {
    const ad = benzersiz('Aynı Ad F2 ');
    const tel1 = `0551${String(Date.now()).slice(-7)}`;
    const tel2 = `0552${String(Date.now()).slice(-7)}`;
    await api('POST', '/api/aksesuarlar', { ad_soyad: ad, telefon: tel1, durum: 'beklemede', parcalar: [] }, admin);
    await api('POST', '/api/aksesuarlar', { ad_soyad: ad, telefon: tel2, durum: 'beklemede', parcalar: [] }, admin);
    assert.equal((await telefonlu(tel1.slice(-10))).length, 1);
    assert.equal((await telefonlu(tel2.slice(-10))).length, 1);
  });

  it('telefon verilmemişse aynı ada sahip mevcut müşteri kullanılır (çift kayıt açılmaz)', async () => {
    const ad = benzersiz('Telefonsuz F2 ');
    await api('POST', '/api/musteriler', { ad_soyad: ad }, admin);
    await api('POST', '/api/aksesuarlar', { ad_soyad: ad, durum: 'beklemede', parcalar: [] }, admin);
    const adli = (await musteriler()).filter((m) => m.ad_soyad === ad);
    assert.equal(adli.length, 1);
  });
});

// ---------------------------------------------------------------- #18
describe('#18 silme: kayıtlar korunarak silinir (FK 500 vermez)', () => {
  it('iş emri olan müşteri silinir; iş emri kalır, bağlantısı boşalır', async () => {
    const tel = `0559${String(Date.now()).slice(-7)}`;
    const ie = await api('POST', '/api/is-emirleri', { musteri_ad_soyad: 'Silinecek F2', telefon: tel, parcalar: [] }, admin);
    const musteriId = ie.govde.musteri_id;
    assert.ok(musteriId);
    const d = await api('DELETE', `/api/musteriler/${musteriId}`, undefined, admin);
    assert.equal(d.durum, 200);
    const kalan = (await api('GET', `/api/is-emirleri/${ie.govde.id}`, undefined, admin)).govde;
    assert.equal(kalan.musteri_id, null);
    assert.equal(kalan.musteri_ad_soyad, 'Silinecek F2');
  });

  it('iş emri oluşturmuş kullanıcı silinir; iş emri kalır, oluşturan adı korunur', async () => {
    const p = await kullaniciOlustur(api, admin, benzersiz('f2_sil_'), 'personel', { servis_yetkisi: true });
    const ie = await api('POST', '/api/is-emirleri', { musteri_ad_soyad: 'Kullanıcı Silme F2', telefon: '05550007766', parcalar: [] }, p.token);
    assert.equal(ie.durum, 201);
    const d = await api('DELETE', `/api/auth/users/${p.id}`, undefined, admin);
    assert.equal(d.durum, 200);
    const kalan = (await api('GET', `/api/is-emirleri/${ie.govde.id}`, undefined, admin)).govde;
    assert.equal(kalan.olusturan_kullanici_id, null);
    assert.ok(kalan.olusturan_kisi);
  });

  it('motor silinince bağlı vitrin ilanı yayından kalkar ve bağlantısı kopar', async () => {
    const m = await api('POST', '/api/ikinci-el-motor', { plaka: benzersiz('34M').slice(0, 12), marka: 'X', alis_fiyati: 1, durum: 'stokta' }, admin);
    const v = await api(
      'POST',
      '/api/vitrin',
      { kategori: 'motor', baslik: benzersiz('Bağlı ilan '), segment: 'Naked', stok_motor_id: m.govde.id, yayinda: true },
      admin,
    );
    const d = await api('DELETE', `/api/ikinci-el-motor/${m.govde.id}`, undefined, admin);
    assert.equal(d.durum, 200);
    const ilan = (await api('GET', `/api/vitrin/${v.govde.id}`, undefined, admin)).govde;
    assert.equal(ilan.yayinda, false);
    assert.equal(ilan.stok_motor_id, null);
    const acik = (await api('GET', '/api/vitrin?kategori=motor')).govde;
    assert.ok(!acik.some((x) => x.id === v.govde.id));
  });
});

// ---------------------------------------------------------------- #32
describe("#32 e-ticaret satışında boş metin ('') stok_id / platform_id", () => {
  let platformId;
  before(async () => {
    platformId = (await api('GET', '/api/eticaret/platformlar', undefined, admin)).govde[0].id;
  });
  const govde = (ek) => ({
    urun_adi: benzersiz('Manuel '),
    alis_fiyati: 100,
    satis_fiyati: 200,
    komisyon_orani: 10,
    kdv_orani: 20,
    kargo_ucreti: 0,
    adet: 1,
    ...ek,
  });

  it("stok_id='' (manuel giriş) kaydedilir", async () => {
    const r = await api('POST', '/api/eticaret', govde({ stok_id: '', platform_id: platformId }), admin);
    assert.equal(r.durum, 201);
    assert.equal(r.govde.stok_id, null);
  });

  it("stok_id='' ve platform_id='' birlikte kaydedilir", async () => {
    const r = await api('POST', '/api/eticaret', govde({ stok_id: '', platform_id: '' }), admin);
    assert.equal(r.durum, 201);
    assert.equal(r.govde.platform_id, null);
  });

  it("düzenlemede de '' kabul edilir", async () => {
    const o = await api('POST', '/api/eticaret', govde({ stok_id: '', platform_id: platformId }), admin);
    const g = await api('PUT', `/api/eticaret/${o.govde.id}`, govde({ stok_id: '', platform_id: '', satis_fiyati: 250 }), admin);
    assert.equal(g.durum, 200);
    assert.equal(num(g.govde.satis_fiyati), 250);
  });

  it('stoklu satış hâlâ stoktan düşer ve silinince geri ekler', async () => {
    const st = await aksesuarStok(10);
    const o = await api('POST', '/api/eticaret', govde({ stok_id: st.id, platform_id: platformId, adet: 3 }), admin);
    assert.equal(o.durum, 201);
    assert.equal(num((await stokOku('/api/aksesuar-stok', st.kod)).mevcut), 7);
    await api('DELETE', `/api/eticaret/${o.govde.id}`, undefined, admin);
    assert.equal(num((await stokOku('/api/aksesuar-stok', st.kod)).mevcut), 10);
  });
});

// ---------------------------------------------------------------- #19
describe('#19 veritabanı erişilemezken uçlar yanıtsız kalmaz', () => {
  let d;
  before(async () => {
    d = await dbsizSunucuBaslat();
  });
  after(() => d && d.durdur());

  const hizliYanit = async (yontem, yol, govde) => {
    const t0 = Date.now();
    const r = await Promise.race([d.api(yontem, yol, govde, d.token), new Promise((c) => setTimeout(() => c({ durum: 'ZAMAN AŞIMI' }), 8000))]);
    return { ...r, sure: Date.now() - t0 };
  };

  it('okuma ucu 5xx döner', async () => {
    const r = await hizliYanit('GET', '/api/is-emirleri');
    assert.ok([500, 503].includes(r.durum), `durum=${r.durum}`);
  });

  for (const [ad, yontem, yol, govde] of [
    ['iş emri oluştur', 'POST', '/api/is-emirleri', { musteri_ad_soyad: 'x', parcalar: [] }],
    ['aksesuar satışı', 'POST', '/api/aksesuarlar', { ad_soyad: 'x', parcalar: [] }],
    ['e-ticaret satışı', 'POST', '/api/eticaret', { urun_adi: 'x', satis_fiyati: 1 }],
    ['yedek parça satışı', 'POST', '/api/yedek-parcalar', { urun_adi: 'x', satis_fiyati: 1 }],
    ['vitrin sıralama', 'PUT', '/api/vitrin/sirala', { kategori: 'motor', urun_ids: [1] }],
  ]) {
    it(`${ad}: 8 sn içinde 5xx yanıt verir`, async () => {
      const r = await hizliYanit(yontem, yol, govde);
      assert.ok([500, 503].includes(r.durum), `durum=${r.durum}`);
    });
  }

  it('sunucu ayakta kalır', async () => {
    assert.equal((await d.api('GET', '/api/health')).durum, 200);
  });
});

// ---------------------------------------------------------------- #29
describe('#29 vitrin yükleme sınırı sunucudan öğrenilir', () => {
  it('yetkili kullanıcı ham dosya sınırını (MB) alır, tokensız alamaz', async () => {
    const r = await api('GET', '/api/vitrin/yukleme-siniri', undefined, admin);
    assert.equal(r.durum, 200);
    assert.ok(Number.isInteger(r.govde.video_mb) && r.govde.video_mb >= 1 && r.govde.video_mb <= 85);
    assert.equal((await api('GET', '/api/vitrin/yukleme-siniri')).durum, 401);
  });

  it('sınırı aşan video 413 alır ve hata iletisi HAM dosya boyutunu söyler (base64 değil)', async () => {
    const sinir = (await api('GET', '/api/vitrin/yukleme-siniri', undefined, admin)).govde.video_mb;
    const veri = 'data:video/mp4;base64,' + Buffer.alloc((sinir + 6) * 1048576, 1).toString('base64');
    const r = await api('POST', '/api/vitrin', JSON.stringify({ kategori: 'motor', baslik: benzersiz('buyuk video '), segment: 'Naked', video: veri }), admin);
    assert.equal(r.durum, 413);
    const soylenen = Number(/~(\d+) MB/.exec(r.govde.message)[1]);
    assert.ok(soylenen <= sinir + 1, `iletide ${soylenen} MB, uç ${sinir} MB`);
  });
});
