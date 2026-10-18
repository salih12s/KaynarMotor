/*
 * Servis modülünün iş kuralları (sahte veritabanıyla, sunucu/MariaDB yok).
 *   - Fiş numarası: önce kilit, sonra MAX+1 (iki iş emri aynı numarayı almasın).
 *   - Parça toplamı, maliyet ve kâr hesabı.
 *   - Tamamlama tarihi yalnızca "tamamlandı"ya GEÇİŞTE ya da doğrudan tamamlanmış açılışta verilir.
 *   - Tamamlanan iş emrini personel düzenleyemez; silmek yalnız admin.
 *   - Parça düzenlenirken eski stok düşümü SİLMEDEN ÖNCE iade edilir.
 *   - Müşteriye açık servis geçmişi maliyet/kâr/iletişim bilgisi sızdırmaz.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sahteDb } = require('./sahteDb');
const isEmri = require('../../modules/servis/isEmirleri/isEmirleri.service');
const gecmis = require('../../modules/servis/servisGecmisi/servisGecmisi.service');

const ADMIN = { id: 1, kullanici_adi: 'admin', ad_soyad: 'Admin', rol: 'admin' };
const PERSONEL = { id: 2, kullanici_adi: 'ali', ad_soyad: 'Ali Usta', rol: 'personel' };

const kayitDb = (ekKurallar = []) => sahteDb([
  ...ekKurallar,
  ['INSERT INTO is_emirleri', [{ id: 11, fis_no: 8 }]],
  ['MAX(fis_no)', [{ next_fis_no: '8' }]],
  ['SELECT * FROM is_emirleri WHERE id', [{ id: 11, fis_no: 8 }]],
]);
const sorgular = (db, parca) => db.cagrilar.filter((c) => c.sql.includes(parca));
const sira = (db, parca) => db.cagrilar.findIndex((c) => c.sql.includes(parca));

describe('iş emri oluştur', () => {
  it('fiş numarası: KİLİT önce alınır, sonra MAX+1 okunur; numara INSERT\'e gider', async () => {
    const db = kayitDb();
    await isEmri.olustur(db, { musteri_ad_soyad: 'Ali', parcalar: [] }, ADMIN);
    assert.ok(sira(db, 'fis_no_kilidi') >= 0 && sira(db, 'fis_no_kilidi') < sira(db, 'MAX(fis_no)'));
    assert.equal(sorgular(db, 'INSERT INTO is_emirleri')[0].params[0], 8);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('toplam, maliyet ve kâr: adet x birim fiyat; kâr = toplam - maliyet', async () => {
    const db = kayitDb();
    await isEmri.olustur(db, {
      musteri_ad_soyad: 'Ali',
      parcalar: [
        { takilan_parca: 'Yağ', adet: 2, birim_fiyat: 100, maliyet: 60 },
        { takilan_parca: 'İşçilik', adet: 1, birim_fiyat: '50', maliyet: '20' },
      ],
    }, ADMIN);
    const toplam = sorgular(db, 'SET gercek_toplam_ucret')[0];
    assert.deepEqual(toplam.params, [250, 140, 110, 11]);
  });

  it('doğrudan "tamamlandı" açılırsa tamamlama tarihi dolu; "beklemede" ise boş', async () => {
    const tamam = kayitDb();
    await isEmri.olustur(tamam, { musteri_ad_soyad: 'A', durum: 'tamamlandi', parcalar: [] }, ADMIN);
    assert.ok(sorgular(tamam, 'INSERT INTO is_emirleri')[0].params[19] instanceof Date);
    const bekleyen = kayitDb();
    await isEmri.olustur(bekleyen, { musteri_ad_soyad: 'A', parcalar: [] }, ADMIN);
    const p = sorgular(bekleyen, 'INSERT INTO is_emirleri')[0].params;
    assert.equal(p[19], null);
    assert.equal(p[12], 'beklemede', 'durum boşsa beklemede');
  });

  it('oluşturan kişi ve teslim eden teknisyen kullanıcıdan gelir', async () => {
    const db = kayitDb();
    await isEmri.olustur(db, { musteri_ad_soyad: 'A', parcalar: [] }, PERSONEL);
    const p = sorgular(db, 'INSERT INTO is_emirleri')[0].params;
    assert.deepEqual([p[15], p[16], p[17]], [2, 'Ali Usta', 'Ali Usta']);
  });

  it('müşteri kaydı yalnızca TELEFON varsa açılır/aranır', async () => {
    const telefonsuz = kayitDb();
    await isEmri.olustur(telefonsuz, { musteri_ad_soyad: 'A', parcalar: [] }, ADMIN);
    assert.equal(sorgular(telefonsuz, 'FROM musteriler').length, 0);
    const telefonlu = kayitDb([['INSERT INTO musteriler', [{ id: 3 }]]]);
    await isEmri.olustur(telefonlu, { musteri_ad_soyad: 'A', telefon: '05551112233', parcalar: [] }, ADMIN);
    assert.ok(sorgular(telefonlu, 'FROM musteriler').length > 0);
    assert.equal(sorgular(telefonlu, 'INSERT INTO is_emirleri')[0].params[1], 3, 'müşteri id iş emrine bağlanır');
  });

  it('parça kodu olan satır yedek parça stoğundan DÜŞER; kodsuz satır düşmez', async () => {
    const db = kayitDb();
    await isEmri.olustur(db, {
      musteri_ad_soyad: 'A',
      parcalar: [{ parca_kodu: 'K1', takilan_parca: 'Balata', adet: 3, birim_fiyat: 10 }, { takilan_parca: 'İşçilik', adet: 1, birim_fiyat: 5 }],
    }, ADMIN);
    const dusumler = sorgular(db, 'UPDATE yedek_parca_stok');
    assert.equal(dusumler.length, 1);
    assert.deepEqual(dusumler[0].params, [3, 'K1']);
  });

  it('geçersiz adet: 400 ve işlem geri alınır (iş emri yazılmış olsa bile)', async () => {
    const db = kayitDb();
    await assert.rejects(isEmri.olustur(db, { musteri_ad_soyad: 'A', parcalar: [{ takilan_parca: 'x', adet: -1 }] }, ADMIN), (h) => h.status === 400);
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });
});

describe('iş emri güncelle', () => {
  const govde = { musteri_ad_soyad: 'A', durum: 'tamamlandi', parcalar: [] };
  const mevcutDb = (durum, parcalar = []) => sahteDb([
    ['SELECT durum FROM is_emirleri', durum === null ? [] : [{ durum }]],
    ['SELECT parca_kodu, adet FROM parcalar', parcalar],
    ['SELECT * FROM is_emirleri WHERE id', [{ id: 5 }]],
  ]);

  it('olmayan iş emri: 404, ROLLBACK', async () => {
    const db = mevcutDb(null);
    await assert.rejects(isEmri.guncelle(db, 5, govde, ADMIN), (h) => h.status === 404 && h.message === 'İş emri bulunamadı');
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });

  it('tamamlanan iş emrini PERSONEL düzenleyemez (403), ADMIN düzenler', async () => {
    await assert.rejects(isEmri.guncelle(mevcutDb('tamamlandi'), 5, govde, PERSONEL), (h) => h.status === 403 && h.message === 'Tamamlanan iş emrini düzenleme yetkiniz yok');
    const db = mevcutDb('tamamlandi');
    await isEmri.guncelle(db, 5, govde, ADMIN);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('tamamlama tarihi yalnızca "tamamlandı"ya GEÇİŞTE verilir', async () => {
    const gecis = mevcutDb('beklemede');
    await isEmri.guncelle(gecis, 5, govde, PERSONEL);
    assert.ok(sorgular(gecis, 'tamamlama_tarihi=COALESCE')[0].params[15] instanceof Date, 'geçişte tarih verilir');
    const zatenTamam = mevcutDb('tamamlandi');
    await isEmri.guncelle(zatenTamam, 5, govde, ADMIN);
    assert.equal(sorgular(zatenTamam, 'tamamlama_tarihi=COALESCE')[0].params[15], null, 'eski tarih korunur (COALESCE)');
  });

  it('eski parçaların stok düşümü, parçalar SİLİNMEDEN ÖNCE iade edilir', async () => {
    const db = mevcutDb('beklemede', [{ parca_kodu: 'K1', adet: 2 }]);
    await isEmri.guncelle(db, 5, { musteri_ad_soyad: 'A', parcalar: [] }, ADMIN);
    const iade = db.cagrilar.findIndex((c) => c.sql.includes('UPDATE yedek_parca_stok'));
    assert.ok(iade >= 0 && iade < sira(db, 'DELETE FROM parcalar'));
    assert.deepEqual(db.cagrilar[iade].params, [-2, 'K1']);
  });
});

describe('iş emri sil', () => {
  it('admin değilse 403 ve veritabanına dokunulmaz', async () => {
    const db = sahteDb();
    await assert.rejects(isEmri.sil(db, 5, PERSONEL), (h) => h.status === 403 && h.message === 'Admin yetkisi gerekli');
    assert.equal(db.cagrilar.length, 0);
  });

  it('admin: stok iade edilir, sonra silinir, tek transaction', async () => {
    const db = sahteDb([['SELECT parca_kodu, adet FROM parcalar', [{ parca_kodu: 'K1', adet: 4 }]]]);
    await isEmri.sil(db, 5, ADMIN);
    assert.deepEqual(db.cagrilar.find((c) => c.sql.includes('UPDATE yedek_parca_stok')).params, [-4, 'K1']);
    assert.ok(sira(db, 'UPDATE yedek_parca_stok') < sira(db, 'DELETE FROM is_emirleri'));
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });
});

describe('QR token ve müşteriye açık servis geçmişi', () => {
  it('plaka büyük harfe ve A-Z0-9\'a indirgenir; token 16 hex', async () => {
    const db = sahteDb([['SELECT plaka, token', [{ plaka: 'AB123CD', token: 'x' }]]]);
    await gecmis.qrTokenAl(db, 'ab 123-cd');
    const ekleme = sorgular(db, 'INSERT IGNORE')[0];
    assert.equal(ekleme.params[0], 'AB123CD');
    assert.match(ekleme.params[1], /^[0-9a-f]{16}$/);
  });

  it('boş plaka 400 "Plaka gerekli"', async () => {
    await assert.rejects(gecmis.qrTokenAl(sahteDb(), '  -- '), (h) => h.status === 400 && h.message === 'Plaka gerekli');
  });

  it('geçmiş: boş token 400, bilinmeyen token 404', async () => {
    await assert.rejects(gecmis.gecmisiGetir(sahteDb(), ' '), (h) => h.status === 400 && h.message === 'Geçersiz bağlantı');
    await assert.rejects(gecmis.gecmisiGetir(sahteDb(), 'yok'), (h) => h.status === 404 && h.message === 'Geçersiz veya süresi dolmuş bağlantı');
  });

  it('geçmiş maliyet/kâr/telefon/müşteri adı SIZDIRMAZ; işlemler iş emrine göre eşleşir', async () => {
    const db = sahteDb([
      ['SELECT plaka FROM servis_qr_tokenler', [{ plaka: 'AB123CD' }]],
      ['FROM is_emirleri', [{
        id: 1, fis_no: 7, plaka: 'AB 123 CD', marka: 'Honda', model_tip: 'PCX', km: 1000, durum: 'tamamlandi',
        created_at: 'T1', teslim_tarihi: null, tamamlama_tarihi: 'T2', gercek_toplam_ucret: 250,
        maliyet: 999, kar: 111, telefon: '0555', musteri_ad_soyad: 'Gizli Kişi',
      }]],
      ['FROM parcalar', [{ is_emri_id: 1, takilan_parca: 'Yağ', adet: 2 }, { is_emri_id: 99, takilan_parca: 'Başkası', adet: 1 }]],
    ]);
    const sonuc = await gecmis.gecmisiGetir(db, 'tok');
    const servis = sonuc.servisler[0];
    assert.deepEqual(servis.islemler, [{ islem: 'Yağ', adet: 2 }]);
    assert.equal(servis.toplam_tutar, 250);
    const metin = JSON.stringify(sonuc);
    for (const sizinti of ['maliyet', '"kar"', 'telefon', 'Gizli Kişi', 'musteri_ad_soyad']) assert.ok(!metin.includes(sizinti), `${sizinti} sızıyor`);
  });
});
