/*
 * motor-guncelleme-ve-istek-isleme: regression testleri (gerçek sunucu + gerçek MariaDB). Bkz. yerel-arsiv/notlar-ve-veri/YAPILACAKLAR-INCELEME.md
 *   #26/#27  motor PUT, formda olmayan alanları silmemeli
 *   #2       vitrin görseli/videosu yalnızca güvenli MIME türleri
 *   #4       kimlik doğrulama gövde ayrıştırılmadan ÖNCE
 *   #17      yayından kaldırılmış ilan herkese açık olmamalı
 *   #20      bozuk JSON 400, reddedilen CORS 403 (500 değil)
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat, hamIstek, kullaniciOlustur } = require('./yardimci');

const SON = Date.now().toString(36);
const num = (v) => Number(v);
const JPEG = 'data:image/jpeg;base64,' + Buffer.from('sahte-jpeg-baytlari').toString('base64');
const MP4 = 'data:video/mp4;base64,' + Buffer.from('sahte-mp4-baytlari').toString('base64');
const HTML = 'data:text/html;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64');

let s, api, admin, pVitrin, pYetkisiz;

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
  pVitrin = await kullaniciOlustur(api, admin, `f1_vitrin_${SON}`, 'personel', { motor_vitrin_yetkisi: true });
  pYetkisiz = await kullaniciOlustur(api, admin, `f1_yok_${SON}`, 'personel');
});
after(() => s && s.durdur());

// ---------------------------------------------------------------- #26 / #27
describe('#26/#27 motor PUT: gönderilmeyen alanlar korunur', () => {
  const SATIS = {
    plaka: `34F1${SON}`.slice(0, 12),
    marka: 'Yamaha',
    model: 'R25',
    yil: 2020,
    km: 5000,
    alis_fiyati: 100000,
    satis_fiyati: 150000,
    noter_alis: 1000,
    noter_satis: 5000,
    masraflar: 2000,
    alici_adi: 'Ali Veli',
    alici_tc: '11111111111',
    alici_telefon: '05551112233',
    alici_adres: 'Adres 1',
    odeme_sekli: 'havale',
    durum: 'tamamlandi',
    kalan_odeme: 20000,
    yevmiye_no: '55',
    komisyoncu_adi: 'Komisyoncu K',
    komisyoncu_telefon: '05329998877',
    komisyoncu_tutari: 3000,
    liste_fiyati: 160000,
    stok_tipi: 'konsinye',
    odeme_detaylari: [{ tip: 'Nakit', tutar: 130000 }],
    satici_adi: 'Satici S',
    satici_tc: '22222222222',
    tarih: '2026-09-01',
    satis_tarihi: '2026-10-01',
    aciklama: 'ilk not',
  };
  const motorGetir = async (id) => (await api('GET', `/api/ikinci-el-motor/${id}`, undefined, admin)).govde;
  const yeniMotor = async (ek = {}) => {
    const r = await api('POST', '/api/ikinci-el-motor', { ...SATIS, ...ek }, admin);
    assert.equal(r.durum, 201);
    return r.govde.id;
  };

  it('MotorStok formunun gövdesi (satış alanları yok) satılmış motorun satış verisini silmez', async () => {
    const id = await yeniMotor();
    // MotorStok.jsx'in handleSave'inin gönderdiği alanlar: satış alanı YOK
    const r = await api(
      'PUT',
      `/api/ikinci-el-motor/${id}`,
      {
        plaka: SATIS.plaka,
        marka: 'Yamaha',
        model: 'R25',
        yil: 2020,
        km: 5000,
        alis_fiyati: 100000,
        noter_alis: 1000,
        masraflar: 2000,
        liste_fiyati: 160000,
        satici_adi: 'Satici S',
        satici_tc: '22222222222',
        durum: 'tamamlandi',
        stok_tipi: 'konsinye',
        aciklama: 'fatura düzeltildi',
        tarih: '2026-09-01',
        fatura_kesildi: true,
        yatirimci: false,
        yatirimci_id: null,
        yatirimci_kar_orani: 0,
      },
      admin,
    );
    assert.equal(r.durum, 200);
    const m = await motorGetir(id);
    // değişmesi gerekenler
    assert.equal(m.fatura_kesildi, true);
    assert.equal(m.aciklama, 'fatura düzeltildi');
    // korunması gerekenler
    assert.equal(num(m.satis_fiyati), 150000);
    assert.equal(num(m.noter_satis), 5000);
    assert.equal(num(m.kalan_odeme), 20000);
    assert.equal(num(m.komisyoncu_tutari), 3000);
    assert.equal(m.komisyoncu_adi, 'Komisyoncu K');
    assert.equal(m.alici_adi, 'Ali Veli');
    assert.equal(m.alici_tc, '11111111111');
    assert.equal(m.alici_telefon, '05551112233');
    assert.equal(m.alici_adres, 'Adres 1');
    assert.equal(m.odeme_sekli, 'havale');
    assert.equal(m.yevmiye_no, '55');
    assert.equal(num(m.kar), 150000 - 100000 - 2000 - 3000); // kâr korunan değerlerden yeniden hesaplanır
  });

  it('IkinciElMotor formunun gövdesi (liste_fiyati ve stok_tipi yok) bu alanları sıfırlamaz', async () => {
    const id = await yeniMotor({ plaka: `34G1${SON}`.slice(0, 12) });
    const r = await api(
      'PUT',
      `/api/ikinci-el-motor/${id}`,
      {
        plaka: `34G1${SON}`.slice(0, 12),
        marka: 'Yamaha',
        model: 'R25',
        km: 5000,
        yil: 2020,
        alis_fiyati: 100000,
        satis_fiyati: 150000,
        noter_alis: 1000,
        noter_satis: 5000,
        masraflar: 2000,
        alici_adi: 'Ali Veli',
        alici_tc: '11111111111',
        alici_telefon: '05551112233',
        alici_adres: 'Adres 1',
        aciklama: 'x',
        satici_adi: 'Satici S',
        satici_tc: '22222222222',
        komisyoncu_adi: 'Komisyoncu K',
        komisyoncu_telefon: '05329998877',
        komisyoncu_tutari: 3000,
        durum: 'tamamlandi',
        odeme_sekli: 'havale',
        kalan_odeme: 20000,
        fatura_kesildi: false,
        yevmiye_no: '55',
        tarih: '2026-09-01',
        satis_tarihi: '2026-10-01',
        yatirimci_id: '',
        yatirimci_kar: '',
        yatirimci_adi: '',
      },
      admin,
    );
    assert.equal(r.durum, 200);
    const m = await motorGetir(id);
    assert.equal(m.stok_tipi, 'konsinye');
    assert.equal(num(m.liste_fiyati), 160000);
  });

  it('açıkça gönderilen değer uygulanır ve kâr yeniden hesaplanır', async () => {
    const id = await yeniMotor({ plaka: `34H1${SON}`.slice(0, 12) });
    await api('PUT', `/api/ikinci-el-motor/${id}`, { satis_fiyati: 170000, alici_adi: 'Yeni Alıcı' }, admin);
    const m = await motorGetir(id);
    assert.equal(num(m.satis_fiyati), 170000);
    assert.equal(m.alici_adi, 'Yeni Alıcı');
    assert.equal(num(m.kar), 170000 - 100000 - 2000 - 3000);
    assert.equal(m.plaka, `34H1${SON}`.slice(0, 12)); // sadece iki alan gönderildi: diğerleri duruyor
    assert.equal(m.marka, 'Yamaha');
  });

  it('boş metin gönderilirse alan bilerek temizlenir (alanın hiç gönderilmemesinden farklı)', async () => {
    const id = await yeniMotor({ plaka: `34J1${SON}`.slice(0, 12) });
    await api('PUT', `/api/ikinci-el-motor/${id}`, { kalan_odeme: '', alici_adres: '' }, admin);
    const m = await motorGetir(id);
    assert.equal(num(m.kalan_odeme), 0);
    assert.ok(m.alici_adres === '' || m.alici_adres === null);
    assert.equal(m.alici_adi, 'Ali Veli');
  });

  it('olmayan kayıt 404', async () => {
    const r = await api('PUT', '/api/ikinci-el-motor/999999999', { aciklama: 'x' }, admin);
    assert.equal(r.durum, 404);
  });

  it('yatırımcı kendi motorunda bile yazamaz (403); müşteri ve fiyat alanları değişmez', async () => {
    // yetki-ve-gorunurluk testleri: yatırımcı motor ekranında salt okunurdur. Eskiden yazabiliyordu ve bu test yalnızca müşteri/fiyat
    // alanlarının korunduğunu sınıyordu; şimdi yazma isteği tümden reddedilir.
    const yat = await kullaniciOlustur(api, admin, `f1_yat_${SON}`, 'yatirimci');
    const id = await yeniMotor({ plaka: `34K1${SON}`.slice(0, 12), yatirimci_id: yat.id });
    const r = await api('PUT', `/api/ikinci-el-motor/${id}`, { aciklama: 'yatırımcı notu', alici_adi: 'DEĞİŞMEMELİ', satis_fiyati: 1 }, yat.token);
    assert.equal(r.durum, 403);
    const m = await motorGetir(id);
    assert.equal(m.aciklama, 'ilk not');
    assert.equal(m.alici_adi, 'Ali Veli');
    assert.equal(num(m.satis_fiyati), 150000);
  });
});

// ---------------------------------------------------------------- #2
describe('#2 vitrin medya türleri', () => {
  const ilan = (ek = {}) => ({ kategori: 'motor', baslik: `f1 ilan ${SON}`, segment: 'Naked', ...ek });

  it('text/html "görsel" olarak reddedilir (400), hiçbir ilan oluşmaz', async () => {
    const baslik = `f1 html ${SON}`;
    const r = await api('POST', '/api/vitrin', ilan({ baslik, gorseller: [HTML] }), pVitrin.token);
    assert.equal(r.durum, 400);
    const liste = await api('GET', '/api/vitrin?kategori=motor');
    assert.ok(!liste.govde.some((u) => u.baslik === baslik));
  });

  it('geçerli JPEG kabul edilir ve doğru Content-Type + güvenlik başlıklarıyla sunulur', async () => {
    const r = await api('POST', '/api/vitrin', ilan({ baslik: `f1 jpeg ${SON}`, gorseller: [JPEG] }), pVitrin.token);
    assert.equal(r.durum, 201);
    const d = await api('GET', `/api/vitrin/${r.govde.id}`);
    const g = await fetch(`${s.url}/api/vitrin/gorsel/${d.govde.gorsel_idler[0]}`);
    assert.equal(g.status, 200);
    assert.equal(g.headers.get('content-type'), 'image/jpeg');
    assert.equal(g.headers.get('x-content-type-options'), 'nosniff');
    assert.match(g.headers.get('content-security-policy') || '', /sandbox/);
  });

  it('video: text/html reddedilir, video/mp4 kabul edilir', async () => {
    const kotu = await api('POST', '/api/vitrin', ilan({ baslik: `f1 vkotu ${SON}`, video: HTML }), pVitrin.token);
    assert.equal(kotu.durum, 400);
    const iyi = await api('POST', '/api/vitrin', ilan({ baslik: `f1 viyi ${SON}`, video: MP4 }), pVitrin.token);
    assert.equal(iyi.durum, 201);
  });

  it('düzenlemede de aynı kural: PUT ile text/html görsel 400', async () => {
    const olustur = await api('POST', '/api/vitrin', ilan({ baslik: `f1 put ${SON}` }), pVitrin.token);
    const r = await api('PUT', `/api/vitrin/${olustur.govde.id}`, ilan({ baslik: `f1 put ${SON}`, gorseller: [HTML] }), pVitrin.token);
    assert.equal(r.durum, 400);
  });

  it('hizmet sayfası görseli (iletişim) için de text/html reddedilir', async () => {
    const r = await api('PUT', '/api/vitrin/iletisim/motor', { personel_adi: 'x', gorsel: HTML }, pVitrin.token);
    assert.equal(r.durum, 400);
  });

  it("veritabanında kalmış eski kötü MIME'lı kayıt sunulmaz (404)", async () => {
    const { pool } = require('../../core/veritabani/db');
    const olustur = await api('POST', '/api/vitrin', ilan({ baslik: `f1 eski ${SON}` }), pVitrin.token);
    const ekle = await pool.query('INSERT INTO vitrin_gorseller (urun_id, data, sira) VALUES ($1, $2, 0)', [olustur.govde.id, HTML]);
    const g = await fetch(`${s.url}/api/vitrin/gorsel/${ekle.insertId}`);
    assert.equal(g.status, 404);
    await pool.end();
  });
});

// ---------------------------------------------------------------- #4
describe('#4 kimlik doğrulama gövde ayrıştırılmadan önce', () => {
  it('tokensız istek, bozuk JSON gövdesi okunmadan 401 alır', async () => {
    const r = await api('POST', '/api/vitrin', '{"bozuk":', undefined);
    assert.equal(r.durum, 401);
  });

  it('vitrin yetkisi olmayan kullanıcı 403 alır (gövde okunmadan)', async () => {
    const r = await api('POST', '/api/vitrin', '{"bozuk":', pYetkisiz.token);
    assert.equal(r.durum, 403);
  });

  it('vitrin yetkili kullanıcının normal isteği hâlâ çalışır', async () => {
    const r = await api('POST', '/api/vitrin', { kategori: 'motor', baslik: `f1 normal ${SON}`, segment: 'Naked' }, pVitrin.token);
    assert.equal(r.durum, 201);
  });

  it('herkese açık okuma uçları token istemez', async () => {
    assert.equal((await api('GET', '/api/vitrin')).durum, 200);
    assert.equal((await api('GET', '/api/vitrin/segmentler')).durum, 200);
  });
});

// ---------------------------------------------------------------- #20
describe('#20 istemci hataları 500 olmaz', () => {
  it('bozuk JSON 400 döner', async () => {
    const r = await api('POST', '/api/musteriler', '{"a":', admin);
    assert.equal(r.durum, 400);
    assert.ok(r.govde.message);
  });

  it('izin verilmeyen Origin 403 döner', async () => {
    const r = await hamIstek(s.url, 'GET', '/api/health', { Origin: 'https://kotu.example' });
    assert.equal(r.durum, 403);
  });

  it("izinli Origin ve Origin'siz istek çalışmaya devam eder", async () => {
    assert.equal((await hamIstek(s.url, 'GET', '/api/health', { Origin: 'http://localhost:3000' })).durum, 200);
    assert.equal((await hamIstek(s.url, 'GET', '/api/health')).durum, 200);
  });
});

// ---------------------------------------------------------------- #17
describe('#17 yayından kaldırılmış ilan', () => {
  let arsivId, yayindaId;
  before(async () => {
    arsivId = (await api('POST', '/api/vitrin', { kategori: 'motor', baslik: `f1 arsiv ${SON}`, segment: 'Naked', yayinda: false }, admin)).govde.id;
    yayindaId = (await api('POST', '/api/vitrin', { kategori: 'motor', baslik: `f1 yayinda ${SON}`, segment: 'Naked', yayinda: true }, admin)).govde.id;
  });

  it('tokensız ?hepsi=1 401 alır', async () => {
    assert.equal((await api('GET', '/api/vitrin?hepsi=1')).durum, 401);
  });

  it('vitrin yetkisi olmayan kullanıcı ?hepsi=1 ile 403 alır', async () => {
    assert.equal((await api('GET', '/api/vitrin?hepsi=1', undefined, pYetkisiz.token)).durum, 403);
  });

  it('yetkili kullanıcı ?hepsi=1 ile arşivi de görür', async () => {
    const r = await api('GET', '/api/vitrin?hepsi=1', undefined, pVitrin.token);
    assert.equal(r.durum, 200);
    assert.ok(r.govde.some((u) => u.id === arsivId));
    assert.ok(r.govde.some((u) => u.id === yayindaId));
  });

  it('normal liste arşivi içermez, yayındakini içerir', async () => {
    const r = await api('GET', '/api/vitrin?kategori=motor');
    assert.ok(!r.govde.some((u) => u.id === arsivId));
    assert.ok(r.govde.some((u) => u.id === yayindaId));
  });

  it('tokensız arşiv ilanı detayı 404, yayındaki 200', async () => {
    assert.equal((await api('GET', `/api/vitrin/${arsivId}`)).durum, 404);
    assert.equal((await api('GET', `/api/vitrin/${yayindaId}`)).durum, 200);
  });

  it('yetkili kullanıcı arşiv ilanının detayını alabilir (düzenleme ekranı)', async () => {
    assert.equal((await api('GET', `/api/vitrin/${arsivId}`, undefined, pVitrin.token)).durum, 200);
    assert.equal((await api('GET', `/api/vitrin/${arsivId}`, undefined, admin)).durum, 200);
  });

  it('vitrin yetkisi olmayan giriş yapmış kullanıcı arşiv detayını göremez', async () => {
    assert.equal((await api('GET', `/api/vitrin/${arsivId}`, undefined, pYetkisiz.token)).durum, 404);
  });

  it('geçersiz/süresi dolmuş token herkese açık okumayı bozmaz', async () => {
    assert.equal((await api('GET', `/api/vitrin/${yayindaId}`, undefined, 'bozuk.token.degeri')).durum, 200);
  });
});
