/**
 * YAZMA karşılaştırması: aynı yazma senaryoları eski (PostgreSQL) ve yeni (MariaDB) sunucuda aynı
 * sırayla çalıştırılır. Her adımda yanıt (durum kodu + gövde) VE senaryo sonunda iki veritabanının
 * tüm tabloları (stok düşümleri, transaction yan etkileri dahil) karşılaştırılır.
 *
 * Kapsanan riskler: stok düşme/geri ekleme (SET sırası), transaction geri alma, kayıt silme/cascade,
 * yetki (401/403), doğrulama (400), olmayan kayıt (404), tekrarlı kayıt (UNIQUE), ON CONFLICT yolları,
 * fiş numarası yarışı (eşzamanlı istekler), belge yükleme (ikili veri).
 *
 * Çalıştırma: PG_REF_DIR=<eski backend> node --test tests/parity/yazma.parity.test.js
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { SUNUCULAR, veritabanlariniHazirla, sunucuBaslat, hazirOlmayiBekle, istek, girisYap, kiyasla, farklar, sunuculariKapat } = require('./ortam');

// Çalışma anında üretilen alanlar (iki sunucuda milisaniye farkıyla yazılır) karşılaştırılmaz.
const MASKE = new Set(['created_at', 'updated_at', 'tamamlama_tarihi', 'token']);

const ROLLER = ['p_admin', 'p_personel', 'p_kisitli', 'p_yatirimci', 'p_muhasebeci', 'p_vitrin'];

// Küçük geçerli dosyalar
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000001e221bc330000000049454e44ae426082',
  'hex',
);
const GORSEL = `data:image/png;base64,${PNG.toString('base64')}`;

describe('yazma senaryoları: eski (PostgreSQL) ve yeni (MariaDB) sunucu', { timeout: 20 * 60 * 1000 }, () => {
  const tokenlar = {};
  const sorunlar = [];

  // Her iki sunucuya aynı isteği atar, farkları kaydeder; { ref, yeni } döner
  async function adim(ad, yontem, yol, secenek = {}) {
    // rol verilmezse admin; açıkça undefined/null verilirse GİRİŞSİZ istek
    const rol = 'rol' in secenek ? secenek.rol : 'p_admin';
    const { govde, ham, maske = MASKE, sirasiz } = secenek;
    const s = await kiyasla(yontem, yol, { tokenlar: rol ? tokenlar[rol] : undefined, govde, ham, sirasiz }, maske);
    if (s.fark.length) sorunlar.push({ adim: ad, istek: s.yol, fark: s.fark.slice(0, 8) });
    return s;
  }
  const idYeni = (s) => (s.yeni.json && s.yeni.json.id) || undefined;

  before(async () => {
    await veritabanlariniHazirla();
    sunucuBaslat(SUNUCULAR.ref);
    sunucuBaslat(SUNUCULAR.yeni);
    await Promise.all([hazirOlmayiBekle(SUNUCULAR.ref), hazirOlmayiBekle(SUNUCULAR.yeni)]);
    for (const rol of ROLLER) tokenlar[rol] = { ref: await girisYap(SUNUCULAR.ref, rol), yeni: await girisYap(SUNUCULAR.yeni, rol) };
  });
  after(sunuculariKapat);

  it('kimlik doğrulama ve yetki', async () => {
    // Girişsiz erişim
    for (const yol of ['/api/musteriler', '/api/is-emirleri', '/api/ikinci-el-motor', '/api/raporlar/genel', '/api/veresiye', '/api/auth/users']) {
      const r = await adim(`girişsiz ${yol}`, 'GET', yol, { rol: null });
      assert.equal(r.yeni.durum, 401, `${yol} girişsiz 401 vermeli`);
    }
    // Geçersiz token
    const gecersiz = await Promise.all(Object.values(SUNUCULAR).map((s) => istek(s, 'GET', '/api/musteriler', { token: 'bozuk.token.degeri' })));
    assert.deepEqual(
      gecersiz.map((x) => x.durum),
      [403, 403],
    );
    // Rol / yetki
    await adim('kısıtlı personel iş emri', 'GET', '/api/is-emirleri', { rol: 'p_kisitli' });
    await adim('kısıtlı personel motor yaz', 'POST', '/api/ikinci-el-motor', { rol: 'p_kisitli', govde: { plaka: 'X' } });
    await adim('personel müşteri listesi (admin işi)', 'GET', '/api/musteriler', { rol: 'p_personel' });
    await adim('yatırımcı raporlar', 'GET', '/api/raporlar/genel', { rol: 'p_yatirimci' });
    await adim('muhasebeci belge indir arşivi', 'GET', '/api/satis-belgeleri/arsiv', { rol: 'p_muhasebeci' });
    await adim('muhasebeci belge yükle yasak', 'POST', '/api/satis-belgeleri/motor/1?ad=a.pdf', { rol: 'p_muhasebeci', ham: PDF });
    // Kayıt ve giriş akışı
    await adim('kayıt: eksik alan 400', 'POST', '/api/auth/register', { rol: null, govde: { kullanici_adi: 'x' } });
    const kayit = await adim('kayıt', 'POST', '/api/auth/register', {
      rol: null,
      govde: { kullanici_adi: 'yeni_kisi', sifre: 'Sifre-123', ad_soyad: 'Yeni Kişi' },
    });
    assert.equal(kayit.yeni.durum, 201);
    await adim('kayıt: aynı kullanıcı adı 400', 'POST', '/api/auth/register', { rol: null, govde: { kullanici_adi: 'yeni_kisi', sifre: 'x', ad_soyad: 'y' } });
    await adim('onaysız giriş 403', 'POST', '/api/auth/login', { rol: null, govde: { kullanici_adi: 'yeni_kisi', sifre: 'Sifre-123' } });
    const kid = kayit.yeni.json.user.id;
    await adim('onayla', 'PATCH', `/api/auth/users/${kid}/approve`);
    const giris = await adim(
      'giriş (maskeli token)',
      'POST',
      '/api/auth/login',
      { rol: null, govde: { kullanici_adi: 'yeni_kisi', sifre: 'Sifre-123' } },
      new Set([...MASKE, 'token']),
    );
    assert.equal(giris.yeni.durum, 200);
    await adim('yanlış şifre 401', 'POST', '/api/auth/login', { rol: null, govde: { kullanici_adi: 'yeni_kisi', sifre: 'yanlis' } });
    await adim('olmayan kullanıcı 401', 'POST', '/api/auth/login', { rol: null, govde: { kullanici_adi: 'yok_boyle', sifre: 'x' } });
    // SQL enjeksiyonu denemeleri: ne hata ne yetkisiz giriş olmamalı
    for (const kullanici of ["' OR '1'='1", "admin' --", '" OR ""="', 'admin\\', { $ne: 1 }, ['p_admin']]) {
      const r = await adim(`enjeksiyon ${JSON.stringify(kullanici)}`, 'POST', '/api/auth/login', {
        rol: null,
        govde: { kullanici_adi: kullanici, sifre: 'x' },
      });
      assert.ok([400, 401, 500].includes(r.yeni.durum) && r.yeni.durum !== 200, 'enjeksiyon girişe izin vermemeli');
    }
    await adim('yetki güncelle', 'PATCH', `/api/auth/users/${kid}/yetkiler`, { govde: { aksesuar_yetkisi: true, kar_gor: true, bilinmeyen: true } });
    await adim('boş yetki güncelle 400', 'PATCH', `/api/auth/users/${kid}/yetkiler`, { govde: { bilinmeyen: true } });
    await adim('aksesuar yetkisi', 'PATCH', `/api/auth/users/${kid}/aksesuar-yetkisi`, { govde: { aksesuar_yetkisi: false } });
    await adim('reddet', 'PATCH', `/api/auth/users/${kid}/reject`);
    await adim('yönetici kullanıcı oluştur', 'POST', '/api/auth/users', {
      govde: { kullanici_adi: 'muh_yeni', sifre: 'Sifre-123', ad_soyad: 'Muh', rol: 'muhasebeci' },
    });
    await adim('yönetici kullanıcı: geçersiz rol personel olur', 'POST', '/api/auth/users', {
      govde: { kullanici_adi: 'rol_yok', sifre: 'Sifre-123', ad_soyad: 'Rol', rol: 'admin' },
    });
    await adim('kendini silemez', 'DELETE', '/api/auth/users/9001');
    await adim('kullanıcı sil', 'DELETE', `/api/auth/users/${kid}`);
    await adim('kullanıcılar', 'GET', '/api/auth/users', {}, new Set([...MASKE, 'plain_sifre']));
  });

  it('geçersiz kayıt numarası reddedilir (eski sürümde PostgreSQL hata verirdi, MariaDB sessizce başka kayda dönüşürdü)', async () => {
    const kotu = ['abc', '5abc', '1.5', '-1', '0x10', '99999999999', '1;DROP', 'undefined', 'null'];
    const yollar = [
      '/api/musteriler/%ID%',
      '/api/is-emirleri/%ID%',
      '/api/aksesuarlar/%ID%',
      '/api/aksesuar-stok/barkod/x',
      '/api/ikinci-el-motor/%ID%',
      '/api/eticaret/%ID%',
      '/api/yedek-parcalar/%ID%',
      '/api/vitrin/%ID%',
      '/api/vitrin/gorsel/%ID%',
    ];
    for (const yol of yollar) {
      if (!yol.includes('%ID%')) continue;
      for (const k of kotu) {
        const r = await istek(SUNUCULAR.yeni, 'GET', yol.replace('%ID%', encodeURIComponent(k)), { token: tokenlar.p_admin.yeni });
        assert.equal(r.durum, 400, `${yol} ← ${k}: 400 beklenirdi, ${r.durum} geldi`);
      }
    }
    for (const [yontem, yol] of [
      ['PATCH', '/api/auth/users/5abc/approve'],
      ['DELETE', '/api/auth/users/5abc'],
      ['DELETE', '/api/musteriler/5abc'],
      ['DELETE', '/api/aksesuar-stok/5abc'],
      ['PUT', '/api/musteriler/5abc'],
    ]) {
      const r = await istek(SUNUCULAR.yeni, yontem, yol, { token: tokenlar.p_admin.yeni, govde: {} });
      assert.equal(r.durum, 400, `${yontem} ${yol}: 400 beklenirdi, ${r.durum} geldi`);
    }
  });

  it('müşteri yönetimi', async () => {
    const olustur = await adim('müşteri ekle', 'POST', '/api/musteriler', {
      govde: { ad_soyad: 'Parity Müşteri', adres: 'Adres 1', telefon: '0555 111 22 33' },
    });
    assert.equal(olustur.yeni.durum, 201);
    const id = idYeni(olustur);
    await adim('müşteri güncelle', 'PUT', `/api/musteriler/${id}`, { govde: { ad_soyad: 'Parity Müşteri 2', adres: 'Adres 2', telefon: '0555 111 22 34' } });
    await adim('müşteri getir', 'GET', `/api/musteriler/${id}`);
    await adim('telefonla bul', 'GET', '/api/musteriler/telefon/5551112234');
    await adim('olmayan müşteri güncelle 404', 'PUT', '/api/musteriler/999999', { govde: { ad_soyad: 'x', adres: 'y', telefon: '1' } });
    await adim('müşteri sil', 'DELETE', `/api/musteriler/${id}`);
    await adim('silinen müşteri 404', 'GET', `/api/musteriler/${id}`);
  });

  it('yedek parça stoğu ve satışı (stok düşümü / geri ekleme)', async () => {
    const stok = await adim('yedek parça stok ekle', 'POST', '/api/yedek-parca-stok', {
      govde: { stok_kodu: '9000000000001', stok_adi: 'Parity Balata', marka: 'X', giren_miktar: 10, alis_fiyati: 50, satis_fiyati: 120 },
    });
    assert.equal(stok.yeni.durum, 201);
    const sid = idYeni(stok);
    await adim('aynı stok kodu 400', 'POST', '/api/yedek-parca-stok', { govde: { stok_kodu: '9000000000001', stok_adi: 'Tekrar', giren_miktar: 1 } });
    await adim('sonraki kod', 'GET', '/api/yedek-parca-stok/next-stok-kodu');
    await adim('toplu stok (ekle + güncelle)', 'POST', '/api/yedek-parca-stok/toplu', {
      govde: {
        stoklar: [
          { stok_kodu: '9000000000001', stok_adi: 'Parity Balata Güncel', marka: 'Y', giren_miktar: 12, alis_fiyati: 55, satis_fiyati: 130 },
          { stok_kodu: '9000000000002', stok_adi: 'Parity Disk', giren_miktar: 4, alis_fiyati: 200, satis_fiyati: 400 },
        ],
      },
    });
    await adim('stok güncelle', 'PUT', `/api/yedek-parca-stok/${sid}`, {
      govde: { stok_kodu: '9000000000001', stok_adi: 'Parity Balata', marka: 'X', giren_miktar: 10, alis_fiyati: 50, satis_fiyati: 120 },
    });
    await adim('barkodla bul', 'GET', '/api/yedek-parca-stok/barkod/9000000000001');

    const satis = await adim('yedek parça satışı (stoktan düşer)', 'POST', '/api/yedek-parcalar', {
      govde: {
        urun_adi: 'Parity Balata',
        alis_fiyati: 50,
        satis_fiyati: 120,
        musteri_adi: 'Veresiyeci',
        musteri_telefon: '0500',
        kalan_odeme: 20,
        stok_id: sid,
        adet: 3,
      },
    });
    assert.equal(satis.yeni.durum, 201);
    const yid = idYeni(satis);
    await adim('stok: 3 düştü', 'GET', '/api/yedek-parca-stok');
    await adim('satışı 5 adete çıkar', 'PUT', `/api/yedek-parcalar/${yid}`, {
      govde: { urun_adi: 'Parity Balata', alis_fiyati: 50, satis_fiyati: 120, stok_id: sid, adet: 5, kalan_odeme: 0 },
    });
    await adim('stok: 5 düştü', 'GET', '/api/yedek-parca-stok');
    await adim("stoktan fazla satış: 0'ın altına inmez", 'POST', '/api/yedek-parcalar', {
      govde: { urun_adi: 'Parity Balata', satis_fiyati: 1, stok_id: sid, adet: 50 },
    });
    await adim('stok: 0', 'GET', '/api/yedek-parca-stok');
    await adim('olmayan satış güncelle 404', 'PUT', '/api/yedek-parcalar/999999', { govde: { urun_adi: 'x' } });
    await adim('satış sil (stok geri)', 'DELETE', `/api/yedek-parcalar/${yid}`);
    await adim('stok: geri eklendi', 'GET', '/api/yedek-parca-stok');
    await adim('veresiye', 'GET', '/api/veresiye');
    await adim('stok sil', 'DELETE', `/api/yedek-parca-stok/${sid}`);
  });

  it('iş emri: fiş numarası, parçalar, tamamlama, silme', async () => {
    const stok = await adim('stok (iş emri parçası için)', 'POST', '/api/yedek-parca-stok', {
      govde: { stok_kodu: '9000000000010', stok_adi: 'Parity Yağ', giren_miktar: 20, alis_fiyati: 10, satis_fiyati: 30 },
    });
    const govde = {
      musteri_ad_soyad: 'İş Emri Müşterisi',
      adres: 'Mersin',
      telefon: '0533 000 11 22',
      km: '12345',
      model_tip: 'CG125',
      marka: 'Honda',
      plaka: '33 ABC 123',
      aciklama: 'Bakım',
      ariza_sikayetler: 'Ses yapıyor',
      tahmini_teslim_tarihi: '2026-10-20',
      tahmini_toplam_ucret: '1500',
      durum: 'beklemede',
      odeme_detaylari: JSON.stringify([{ tur: 'nakit', tutar: 500 }]),
      kalan_odeme: '200',
      parcalar: [
        { parca_kodu: '9000000000010', takilan_parca: 'Yağ', adet: 2, birim_fiyat: 30, maliyet: 10 },
        { parca_kodu: '', takilan_parca: 'İşçilik', adet: 1, birim_fiyat: 500, maliyet: 0 },
      ],
    };
    await adim('fiş numarası önizleme', 'GET', '/api/is-emirleri/next-fis-no/preview');
    const e1 = await adim('iş emri oluştur', 'POST', '/api/is-emirleri', { govde });
    assert.equal(e1.yeni.durum, 201);
    const eid = idYeni(e1);
    await adim('stok: 2 düştü', 'GET', '/api/yedek-parca-stok');
    await adim('müşteri otomatik oluştu', 'GET', '/api/musteriler/telefon/5330001122');
    await adim('iş emri getir', 'GET', `/api/is-emirleri/${eid}`);
    await adim('tamamla (parçalar yenilenir)', 'PUT', `/api/is-emirleri/${eid}`, {
      govde: {
        ...govde,
        durum: 'tamamlandi',
        teslim_tarihi: '2026-10-12',
        parcalar: [{ parca_kodu: '9000000000010', takilan_parca: 'Yağ', adet: 5, birim_fiyat: 30, maliyet: 10 }],
      },
    });
    await adim('stok: 5 düştü', 'GET', '/api/yedek-parca-stok');
    await adim('tamamlanmışı personel düzenleyemez 403', 'PUT', `/api/is-emirleri/${eid}`, { rol: 'p_personel', govde });
    await adim('olmayan iş emri 404', 'PUT', '/api/is-emirleri/999999', { govde });
    const q0 = await adim('QR token', 'POST', '/api/is-emirleri/qr-token', { govde: { plaka: '33 abc 123' } });
    const q1 = await adim('QR token tekrar (aynı kalır)', 'POST', '/api/is-emirleri/qr-token', { govde: { plaka: '33 abc 123' } });
    assert.ok(q1.yeni.json.token);
    assert.equal(q1.yeni.json.token, q0.yeni.json.token, 'aynı plaka için token değişmemeli');
    assert.equal(q1.ref.json.token, q0.ref.json.token);
    await adim('QR: plaka gerekli 400', 'POST', '/api/is-emirleri/qr-token', { govde: {} });
    await adim('müşteri servis geçmişi (QR)', 'GET', (s) => `/api/servis-gecmisi/${q1[s].json.token}`, { maske: new Set([...MASKE, 'tarih']) });
    await adim('tarih aralığı filtresi', 'GET', '/api/is-emirleri?baslangic=2026-10-01&bitis=2026-10-31');
    await adim('personel silemez 403', 'DELETE', `/api/is-emirleri/${eid}`, { rol: 'p_personel' });
    await adim('admin siler (stok geri)', 'DELETE', `/api/is-emirleri/${eid}`);
    await adim('stok: geri eklendi', 'GET', '/api/yedek-parca-stok');
    await adim('günlük rapor', 'GET', '/api/raporlar/gunluk');
    void stok;
  });

  it('fiş numarası yarışı: eşzamanlı iş emirleri aynı numarayı almaz', async () => {
    const govde = (i) => ({
      musteri_ad_soyad: `Yarış ${i}`,
      telefon: `055000000${i}`,
      durum: 'beklemede',
      parcalar: [{ takilan_parca: 'İşçilik', adet: 1, birim_fiyat: 10, maliyet: 0 }],
    });
    for (const s of Object.values(SUNUCULAR)) {
      const token = tokenlar.p_admin[s === SUNUCULAR.ref ? 'ref' : 'yeni'];
      const sonuclar = await Promise.all(Array.from({ length: 8 }, (_, i) => istek(s, 'POST', '/api/is-emirleri', { token, govde: govde(i) })));
      const durumlar = sonuclar.map((r) => r.durum);
      const fisler = sonuclar.filter((r) => r.durum === 201).map((r) => r.json.fis_no);
      if (s === SUNUCULAR.yeni) {
        assert.deepEqual(durumlar, Array(8).fill(201), `${s.ad}: eşzamanlı iş emirlerinin hepsi 201 olmalı (${durumlar})`);
        assert.equal(new Set(fisler).size, 8, `${s.ad}: fiş numaraları benzersiz olmalı (${fisler})`);
        const sirali = [...fisler].sort((a, b) => a - b);
        assert.equal(sirali[7] - sirali[0], 7, `${s.ad}: fiş numaraları ardışık olmalı (${sirali})`);
      }
    }
  });

  it('aksesuar stoğu, aksesuar satışı ve e-ticaret', async () => {
    const stok = await adim('aksesuar stok ekle', 'POST', '/api/aksesuar-stok', {
      govde: {
        stok_kodu: '0000000099001',
        stok_adi: 'Parity Kask',
        marka: 'Z',
        giren_miktar: 10,
        birimi: 'Adet',
        alis_fiyati: 300,
        satis_fiyati: 700,
        platform: 'Trendyol',
        beden: 'M',
        renk: 'Siyah',
        kategori: 'Kask',
      },
    });
    assert.equal(stok.yeni.durum, 201);
    const sid = idYeni(stok);
    await adim('aynı kod 400', 'POST', '/api/aksesuar-stok', { govde: { stok_kodu: '0000000099001', stok_adi: 'Tekrar', giren_miktar: 1 } });
    await adim('aynı koda güncelle 400', 'PUT', `/api/aksesuar-stok/${sid}`, { govde: { stok_kodu: '0000000000008', stok_adi: 'Çakışan', giren_miktar: 1 } });
    await adim('toplu stok', 'POST', '/api/aksesuar-stok/toplu', {
      govde: {
        stoklar: [
          { stok_kodu: '0000000099001', stok_adi: 'Parity Kask', marka: 'Z2', giren_miktar: 10, alis_fiyati: 310, satis_fiyati: 710 },
          { stok_kodu: '0000000099002', stok_adi: 'Parity Eldiven', giren_miktar: 3, alis_fiyati: 100, satis_fiyati: 250 },
        ],
      },
    });
    await adim('toplu stok: liste geçersiz 400', 'POST', '/api/aksesuar-stok/toplu', { govde: { stoklar: 'x' } });
    await adim('barkod', 'GET', '/api/aksesuar-stok/barkod/0000000099001');
    await adim('sonraki kod', 'GET', '/api/aksesuar-stok/next-stok-kodu');

    // Aksesuar satışı: tamamlanınca ürün ADIYLA eşlenen stoktan düşer
    const govde = {
      ad_soyad: 'Aksesuar Müşteri',
      telefon: '0544 100 10 10',
      odeme_sekli: 'Nakit',
      aciklama: 'Test',
      durum: 'tamamlandi',
      odeme_detaylari: null,
      kalan_odeme: '0',
      indirim: '50',
      satis_tarihi: '2026-10-12',
      parcalar: [
        { urun_adi: 'Parity Kask', adet: 2, maliyet: 310, satis_fiyati: 710 },
        { urun_adi: 'Stokta Olmayan Ürün', adet: 1, maliyet: 10, satis_fiyati: 30 },
      ],
    };
    const a = await adim('aksesuar satışı (tamamlandı)', 'POST', '/api/aksesuarlar', { govde });
    assert.equal(a.yeni.durum, 201);
    const aid = idYeni(a);
    await adim('stok: 2 düştü', 'GET', '/api/aksesuar-stok/barkod/0000000099001');
    await adim('aksesuar satışı güncelle (3 adet)', 'PUT', `/api/aksesuarlar/${aid}`, {
      govde: { ...govde, parcalar: [{ urun_adi: 'Parity Kask', adet: 3, maliyet: 310, satis_fiyati: 710 }] },
    });
    await adim('stok: 3 düştü', 'GET', '/api/aksesuar-stok/barkod/0000000099001');
    await adim('aksesuar getir', 'GET', `/api/aksesuarlar/${aid}`);
    await adim('aksesuar listesi (parçalarla)', 'GET', '/api/aksesuarlar');
    await adim('aksesuar istatistik', 'GET', '/api/aksesuarlar/stats/genel');
    await adim('olmayan aksesuar 404', 'PUT', '/api/aksesuarlar/999999', { govde });
    await adim('aksesuar sil (stok geri)', 'DELETE', `/api/aksesuarlar/${aid}`);
    await adim('stok: geri', 'GET', '/api/aksesuar-stok/barkod/0000000099001');

    // E-ticaret
    const plat = await adim('platform ekle', 'POST', '/api/eticaret/platformlar', {
      govde: { platform_adi: 'Parity Pazar', komisyon_orani: '12', kdv_orani: '20', kargo_ucreti: '30' },
    });
    assert.equal(plat.yeni.durum, 201);
    const pid = idYeni(plat);
    await adim('platform: ad zorunlu 400', 'POST', '/api/eticaret/platformlar', { govde: { platform_adi: '  ' } });
    await adim('platform personel yapamaz 403', 'POST', '/api/eticaret/platformlar', { rol: 'p_personel', govde: { platform_adi: 'x' } });
    await adim('platform güncelle', 'PUT', `/api/eticaret/platformlar/${pid}`, { govde: { platform_adi: 'Parity Pazar 2', komisyon_orani: '10' } });
    const satis = await adim('e-ticaret satışı (stoktan düşer)', 'POST', '/api/eticaret', {
      govde: {
        stok_id: sid,
        platform_id: pid,
        urun_adi: 'Parity Kask',
        alis_fiyati: 310,
        satis_fiyati: 710,
        komisyon_orani: 12,
        kdv_orani: 20,
        kargo_ucreti: 30,
        adet: 2,
        tarih: '2026-10-12',
      },
    });
    assert.equal(satis.yeni.durum, 201);
    const eid = idYeni(satis);
    await adim('stok: e-ticaret 2 düştü', 'GET', '/api/aksesuar-stok/barkod/0000000099001');
    await adim('e-ticaret satışı güncelle', 'PUT', `/api/eticaret/${eid}`, {
      govde: {
        stok_id: sid,
        platform_id: pid,
        urun_adi: 'Parity Kask',
        alis_fiyati: 310,
        satis_fiyati: 800,
        komisyon_orani: 12,
        kdv_orani: 20,
        kargo_ucreti: 30,
        adet: 4,
        tarih: '2026-10-12',
      },
    });
    await adim('stok: e-ticaret 4 düştü', 'GET', '/api/aksesuar-stok/barkod/0000000099001');
    await adim('e-ticaret istatistik', 'GET', '/api/eticaret/stats');
    await adim('e-ticaret listesi', 'GET', '/api/eticaret');
    await adim('e-ticaret satışı sil (stok geri)', 'DELETE', `/api/eticaret/${eid}`);
    await adim('stok: geri', 'GET', '/api/aksesuar-stok/barkod/0000000099001');
    await adim('platform sil', 'DELETE', `/api/eticaret/platformlar/${pid}`);
    await adim('stok sil', 'DELETE', `/api/aksesuar-stok/${sid}`);
  });

  it('motor stok ve satış, belgeler, vitrin bağlantısı', async () => {
    const vitrinIlan = await adim('vitrin ilanı ekle (görselli)', 'POST', '/api/vitrin', {
      govde: {
        kategori: 'motor',
        baslik: 'Parity Motor İlanı',
        aciklama: 'Test',
        fiyat: 100000,
        marka: 'Parity',
        model: 'P1',
        yil: 2022,
        segment: 'Parity Segment',
        motor_cc: 125,
        km: 1000,
        yayinda: true,
        siralama: 0,
        one_cikan: true,
        gorseller: [GORSEL, GORSEL],
        motor_durumu: 'sifir',
      },
    });
    assert.equal(vitrinIlan.yeni.durum, 201);
    const vid = idYeni(vitrinIlan);

    const motor = await adim('motor ekle', 'POST', '/api/ikinci-el-motor', {
      govde: {
        tarih: '2026-10-01',
        plaka: '33 PRT 001',
        marka: 'Parity',
        model: 'P1',
        km: '1000',
        alis_fiyati: '50000',
        satis_fiyati: '0',
        noter_alis: '1000',
        masraflar: '500',
        durum: 'stokta',
        stok_tipi: 'sahip',
        yil: 2022,
        satici_adi: 'Satıcı Kişi',
        satici_tc: '11111111111',
        liste_fiyati: '70000',
        odeme_detaylari: [{ tur: 'nakit', tutar: 1 }],
        vitrin_baslik: 'Baslik',
        vitrin_segment: 'Parity Segment',
        vitrin_cc: '125',
      },
    });
    assert.equal(motor.yeni.durum, 201);
    const mid = idYeni(motor);
    await adim('motor getir', 'GET', `/api/ikinci-el-motor/${mid}`);
    await adim('motor getir (personel)', 'GET', `/api/ikinci-el-motor/${mid}`, { rol: 'p_personel' });
    await adim('motor getir (yatırımcı başkasının: 403)', 'GET', `/api/ikinci-el-motor/${mid}`, { rol: 'p_yatirimci' });

    // Belgeler
    await adim('belge: uzantı geçersiz 400', 'POST', `/api/satis-belgeleri/motor/${mid}?ad=virus.exe`, { ham: PDF });
    await adim('belge: içerik uyuşmuyor 400', 'POST', `/api/satis-belgeleri/motor/${mid}?ad=sahte.pdf`, { ham: Buffer.from('MZ not a pdf') });
    await adim('belge: boş 400', 'POST', `/api/satis-belgeleri/motor/${mid}?ad=bos.pdf`, { ham: Buffer.alloc(0) });
    await adim('belge: olmayan motor 404', 'POST', '/api/satis-belgeleri/motor/999999?ad=a.pdf', { ham: PDF });
    const b1 = await adim('belge yükle (pdf)', 'POST', `/api/satis-belgeleri/motor/${mid}?ad=S%C3%B6zle%C5%9Fme%20%C4%B0lk.pdf`, { ham: PDF });
    assert.equal(b1.yeni.durum, 201);
    const b2 = await adim('belge yükle (png)', 'POST', `/api/satis-belgeleri/motor/${mid}?ad=foto.png`, { ham: PNG });
    assert.equal(b2.yeni.durum, 201);
    // Büyük dosya (64 KB üstü): MariaDB tarafında hazır ifadeyle (ikili) gönderilen yol
    const BUYUK = Buffer.concat([PDF, Buffer.alloc(400 * 1024, 7)]);
    const b3 = await adim('belge yükle (400 KB pdf, hazır ifade yolu)', 'POST', `/api/satis-belgeleri/motor/${mid}?ad=buyuk.pdf`, { ham: BUYUK });
    assert.equal(b3.yeni.durum, 201);
    await adim('büyük belgeyi indir (içerik özeti aynı)', 'GET', `/api/satis-belgeleri/${idYeni(b3)}/indir`);
    await adim('belge listesi', 'GET', `/api/satis-belgeleri/motor/${mid}`);
    await adim('belge indir', 'GET', `/api/satis-belgeleri/${idYeni(b1)}/indir`);
    await adim('muhasebeci belge indirir', 'GET', `/api/satis-belgeleri/${idYeni(b2)}/indir`, { rol: 'p_muhasebeci' });
    await adim('belge arşivi', 'GET', '/api/satis-belgeleri/arsiv');
    await adim('belge sil', 'DELETE', `/api/satis-belgeleri/${idYeni(b2)}`);
    await adim('olmayan belge 404', 'DELETE', '/api/satis-belgeleri/999999');

    // Satış: tamamlanınca bağlı vitrin ilanı yayından kalkar
    await adim('vitrin ilanını motora bağla', 'PUT', `/api/vitrin/${vid}`, {
      govde: {
        kategori: 'motor',
        baslik: 'Parity Motor İlanı',
        fiyat: 100000,
        segment: 'Parity Segment',
        yayinda: true,
        stok_motor_id: mid,
        gorseller: [GORSEL],
      },
    });
    await adim('motoru sat (tamamlandı)', 'PUT', `/api/ikinci-el-motor/${mid}`, {
      govde: {
        tarih: '2026-10-01',
        plaka: '33 PRT 001',
        marka: 'Parity',
        model: 'P1',
        km: '1000',
        alis_fiyati: '50000',
        satis_fiyati: '65000',
        noter_alis: '1000',
        noter_satis: '1200',
        masraflar: '500',
        alici_adi: 'Alıcı Kişi',
        alici_tc: '22222222222',
        alici_telefon: '0555 999 88 77',
        alici_adres: 'Adres',
        odeme_sekli: 'nakit',
        durum: 'tamamlandi',
        stok_tipi: 'sahip',
        yil: 2022,
        satici_adi: 'Satıcı Kişi',
        kalan_odeme: '5000',
        fatura_kesildi: true,
        yevmiye_no: '12',
        satis_tarihi: '2026-10-12',
        komisyoncu_adi: 'Komisyoncu',
        komisyoncu_telefon: '0500',
        komisyoncu_tutari: '1000',
        liste_fiyati: '70000',
        odeme_detaylari: [{ tur: 'nakit', tutar: 60000 }],
      },
    });
    await adim('vitrin ilanı yayından kalktı', 'GET', `/api/vitrin/${vid}`);
    await adim('alıcı müşteri oldu', 'GET', '/api/musteriler/telefon/5559998877');
    await adim('motor istatistik', 'GET', '/api/ikinci-el-motor/stats/ozet');
    await adim('veresiye (motor kalan ödeme)', 'GET', '/api/veresiye');
    await adim('aralık raporu (eşit tarihli satırların sırası serbest)', 'GET', '/api/raporlar/aralik?baslangic=2026-10-01&bitis=2026-10-31', {
      sirasiz: true,
    });
    await adim('personel silemez 403', 'DELETE', `/api/ikinci-el-motor/${mid}`, { rol: 'p_personel' });
    await adim('motoru sil (belgeler cascade)', 'DELETE', `/api/ikinci-el-motor/${mid}`);
    await adim('belge arşivi: cascade', 'GET', '/api/satis-belgeleri/arsiv');
    await adim('vitrin ilanı sil (görseller cascade)', 'DELETE', `/api/vitrin/${vid}`);
  });

  it('vitrin yönetimi: sıra, yayın, segment, iletişim, yetki', async () => {
    const yeni = [];
    for (const [i, baslik] of ['Sıra A', 'Sıra B', 'Sıra C'].entries()) {
      const r = await adim(`ilan ${baslik}`, 'POST', '/api/vitrin', {
        govde: { kategori: 'aksesuar', baslik, fiyat: 100 + i, yayinda: true, siralama: i, gorseller: [GORSEL] },
      });
      assert.equal(r.yeni.durum, 201);
      yeni.push(idYeni(r));
    }
    await adim('vitrin liste (aksesuar)', 'GET', '/api/vitrin?kategori=aksesuar&hepsi=1');
    await adim('toplu sırala', 'PUT', '/api/vitrin/sirala', { govde: { kategori: 'aksesuar', urun_ids: [...yeni].reverse() } });
    await adim('sırala: başka kategorinin ilanı 400', 'PUT', '/api/vitrin/sirala', { govde: { kategori: 'motor', urun_ids: yeni } });
    await adim('sırala: tekrar eden id 400', 'PUT', '/api/vitrin/sirala', { govde: { kategori: 'aksesuar', urun_ids: [yeni[0], yeni[0]] } });
    await adim('sırala: geçersiz kategori 400', 'PUT', '/api/vitrin/sirala', { govde: { kategori: 'yok', urun_ids: yeni } });
    await adim('doğrudan sıra', 'PATCH', `/api/vitrin/${yeni[0]}/sira`, { govde: { sira: 3 } });
    await adim('doğrudan sıra: geçersiz 400', 'PATCH', `/api/vitrin/${yeni[0]}/sira`, { govde: { sira: 0 } });
    await adim('yayından kaldır', 'PATCH', `/api/vitrin/${yeni[1]}/yayin`, { govde: { yayinda: false } });
    await adim('tekrar yayına al (sona gider)', 'PATCH', `/api/vitrin/${yeni[1]}/yayin`, { govde: { yayinda: true } });
    await adim('yayın: geçersiz tip 400', 'PATCH', `/api/vitrin/${yeni[1]}/yayin`, { govde: { yayinda: 'evet' } });
    await adim('yayın: olmayan ilan 404', 'PATCH', '/api/vitrin/999999/yayin', { govde: { yayinda: true } });
    await adim('liste (sıra sonrası)', 'GET', '/api/vitrin?kategori=aksesuar&hepsi=1');
    await adim('güncelle (görselsiz: görseller korunur)', 'PUT', `/api/vitrin/${yeni[2]}`, {
      govde: { kategori: 'aksesuar', baslik: 'Sıra C güncel', fiyat: 5 },
    });
    await adim('ilan detayı', 'GET', `/api/vitrin/${yeni[2]}`);
    // Yetki: vitrin yetkisi olmayan personel, yatırımcı
    await adim('vitrin yetkisiz 403', 'POST', '/api/vitrin', { rol: 'p_kisitli', govde: { kategori: 'aksesuar', baslik: 'x' } });
    await adim('vitrin yetkili personel ekler', 'POST', '/api/vitrin', { rol: 'p_vitrin', govde: { kategori: 'aksesuar', baslik: 'Vitrin Personeli' } });
    await adim('vitrin: hizmet kategorisi yalnız admin 403', 'POST', '/api/vitrin', { rol: 'p_vitrin', govde: { kategori: 'nakliye', baslik: 'x' } });
    await adim('vitrin: kategori geçersiz 400', 'POST', '/api/vitrin', { govde: { kategori: 'yok', baslik: 'x' } });
    await adim('vitrin: başlık zorunlu 400', 'POST', '/api/vitrin', { govde: { kategori: 'aksesuar' } });
    await adim('vitrin: motor segment zorunlu 400', 'POST', '/api/vitrin', { govde: { kategori: 'motor', baslik: 'x' } });
    // Segment / iletişim
    await adim('segment ekle', 'POST', '/api/vitrin/segmentler', { govde: { ad: 'Parity Yeni Segment' } });
    await adim('segment: aynı ad (INSERT IGNORE)', 'POST', '/api/vitrin/segmentler', { govde: { ad: 'Parity Yeni Segment' } });
    await adim('segment: boş 400', 'POST', '/api/vitrin/segmentler', { govde: { ad: ' ' } });
    await adim('segmentler', 'GET', '/api/vitrin/segmentler');
    await adim('iletişim kaydet (ilk kez / üzerine yaz)', 'PUT', '/api/vitrin/iletisim/aksesuar', {
      govde: {
        personel_adi: 'A Kişi',
        telefon: '0500 000 00 01',
        personel_adi_2: 'B Kişi',
        telefon_2: '0500 000 00 02',
        aciklama: 'Açıklama',
        baslik: 'Başlık',
        gorsel: GORSEL,
      },
    });
    await adim('iletişim tekrar (ON DUPLICATE KEY)', 'PUT', '/api/vitrin/iletisim/aksesuar', {
      govde: { personel_adi: 'C Kişi', telefon: '0500 000 00 03', gorsel_sil: true },
    });
    await adim('iletişim: yeni kategori', 'PUT', '/api/vitrin/iletisim/nakliye', { govde: { personel_adi: 'N', telefon: '1', baslik: 'Nakliye' } });
    await adim('iletişim: geçersiz kategori 400', 'PUT', '/api/vitrin/iletisim/yok', { govde: {} });
    await adim('iletişim: yetkisiz 403', 'PUT', '/api/vitrin/iletisim/nakliye', { rol: 'p_vitrin', govde: { personel_adi: 'x' } });
    await adim('iletişim listesi (SQL içinde ORDER BY yok)', 'GET', '/api/vitrin/iletisim', { sirasiz: true });
    await adim('markalar', 'GET', '/api/vitrin/markalar');
    for (const id of yeni) await adim(`ilan sil ${id}`, 'DELETE', `/api/vitrin/${id}`);
  });

  it('veritabanı durumu: senaryolardan sonra iki veritabanının tüm tabloları aynıdır', async () => {
    const { Client, types } = require('pg');
    types.setTypeParser(1082, (v) => v); // DATE: 'YYYY-MM-DD' metni (yerel saat dilimi kaymasın)
    types.setTypeParser(1700, (v) => v);
    const mysql = require('mysql2/promise');
    const env = (d) =>
      Object.fromEntries(
        fs
          .readFileSync(d, 'utf8')
          .split(/\r?\n/)
          .map((l) => /^([A-Z_]+)=(.*)$/.exec(l))
          .filter(Boolean)
          .map((m) => [m[1], m[2]]),
      );
    const pe = env(SUNUCULAR.ref.env);
    const me = env(SUNUCULAR.yeni.env);
    const pg = new Client({ host: pe.DB_HOST, port: +pe.DB_PORT, database: pe.DB_NAME, user: pe.DB_USER, password: pe.DB_PASSWORD });
    await pg.connect();
    await pg.query("SET timezone TO 'UTC'");
    const my = await mysql.createConnection({
      host: '127.0.0.1',
      port: +me.DB_PORT,
      database: me.DB_NAME,
      user: me.DB_USER,
      password: me.DB_PASSWORD,
      supportBigNumbers: true,
      bigNumberStrings: true,
      dateStrings: true,
    });
    // Eşzamanlı (yarış) iş emirleri ve enjeksiyon denemeleri: satırların sırası ve kayıt biçimi doğası gereği farklıdır.
    for (const q of [
      "DELETE FROM is_emirleri WHERE musteri_ad_soyad LIKE 'Yarış %'",
      "DELETE FROM musteriler WHERE ad_soyad LIKE 'Yarış %'",
      "DELETE FROM aktivite_log WHERE islem_detay LIKE '%Yarış %'",
      "DELETE FROM aktivite_log WHERE kullanici_adi LIKE '{%' OR kullanici_adi LIKE '[%' OR kullanici_adi LIKE '%\"%'",
    ]) {
      await pg.query(q);
      await my.query(q);
    }
    const tablolar = [
      'kullanicilar',
      'musteriler',
      'is_emirleri',
      'parcalar',
      'aksesuar_stok',
      'aksesuarlar',
      'aksesuar_parcalar',
      'ikinci_el_motorlar',
      'eticaret_platformlar',
      'eticaret_satislar',
      'yedek_parcalar',
      'yedek_parca_stok',
      'vitrin_urunleri',
      'vitrin_kategori_iletisim',
      'vitrin_segmentler',
      'servis_qr_tokenler',
      'satis_belgeleri',
      'vitrin_gorseller',
      'aktivite_log',
    ];
    const zamanKolonu = /(_at|tamamlama_tarihi|^token)$/;
    const farkListesi = [];
    for (const t of tablolar) {
      const pk = t === 'vitrin_kategori_iletisim' ? 'kategori' : 'id';
      // Büyük ikili/metin kolonlar özetle karşılaştırılır
      const buyuk = { satis_belgeleri: ['icerik'], vitrin_gorseller: ['data'], vitrin_kategori_iletisim: ['gorsel'] }[t] || [];
      const kolonlar = (await pg.query('SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position', [t])).rows.map(
        (r) => r.column_name,
      );
      const secPg = kolonlar
        .map((k) => (buyuk.includes(k) ? (k === 'icerik' ? `md5("${k}") AS "${k}"` : `md5(convert_to("${k}", 'UTF8')) AS "${k}"`) : `"${k}"`))
        .join(', ');
      const secMy = kolonlar.map((k) => (buyuk.includes(k) ? `MD5(${k}) AS ${k}` : k)).join(', ');
      const a = (await pg.query(`SELECT ${secPg} FROM ${t} ORDER BY ${pk}`)).rows;
      const [b] = await my.query(`SELECT ${secMy} FROM ${t} ORDER BY ${pk}`);
      const norm = (satir) =>
        Object.fromEntries(
          Object.entries(satir)
            .filter(([k]) => !zamanKolonu.test(k))
            .map(([k, v]) => [k, typeof v === 'boolean' ? (v ? '1' : '0') : v === null ? null : String(v)]),
        );
      const na = a.map(norm);
      const nb = b.map(norm);
      // PostgreSQL tarih (date) kolonlarını yerel gece yarısı Date olarak, MariaDB (dateStrings) 'YYYY-MM-DD' verir
      const f = farklar(na, nb, new Set(['plain_sifre', 'sifre']));
      if (a.length !== b.length) farkListesi.push(`${t}: satır sayısı ${a.length} ≠ ${b.length}`);
      else if (f.length) farkListesi.push(`${t}: ${f.slice(0, 4).join(' | ')}`);
    }
    await pg.end();
    await my.end();
    // Özet: önce adım farkları
    if (sorunlar.length) {
      console.log(`\nADIM FARKLARI: ${sorunlar.length}`);
      for (const s of sorunlar) console.log(`✖ ${s.adim}  (${s.istek})\n   ${s.fark.join('\n   ')}`);
    }
    assert.equal(sorunlar.length, 0, `${sorunlar.length} adımda yanıt farkı`);
    assert.deepEqual(farkListesi, []);
  });
});
