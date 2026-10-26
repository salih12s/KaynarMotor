/*
 * Sıfır motor kuralları (sahte veritabanıyla, sunucu/MariaDB yok).
 *   - Sıfır satışı modeli STOKTAN DÜŞÜRMEZ: sıfır stok tablosuna yazan hiçbir sorgu çalışmaz.
 *   - Boş bırakılan marka/model/yıl ve alış/satış fiyatı modelden gelir; formda yazılan fiyat modeli ezer (indirimli satış).
 *   - Sıfır satış her zaman "tamamlandi"dır, yatırımcıya bağlanamaz; düzenlenince de stoğa (ikinci el) düşemez.
 *   - Sıfır stok: marka zorunlu, alış fiyatını yalnız yetkili görür/yazar, liste fiyatı değişince bağlı ilan fiyatı değişir,
 *     silme yalnız admin ve ilan bağlantısı aynı işlemde kopar.
 *   - Rapor: sıfır satışlar adede/gelire/toplam kâra girer, kârları ayrıca verilir; sıfır kârı admin dışından silinir.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sahteDb } = require('./sahteDb');
const motorServis = require('../../modules/motor/ikinciElMotor/ikinciElMotor.service');
const sifirServis = require('../../modules/motor/sifirMotor/sifirMotor.service');
const { sanitizeSifirMotor } = require('../../modules/motor/sifirMotor/sifirMotor.gorunum');
const hesap = require('../../modules/raporlar/raporlar/raporlar.hesap');
const { alanlariSil, KAR_ALANLARI } = require('../../core/middleware/yetki');

const kul = (rol, ek = {}) => ({
  id: 10,
  kullanici_adi: 'u',
  ad_soyad: 'U',
  rol,
  motor_satis_yetkisi: false,
  alis_fiyati_gor: false,
  satis_fiyati_gor: false,
  musteri_gor: false,
  liste_fiyati_gor: false,
  satis_gecmisi_gor: false,
  kar_gor: false,
  motor_satis_gor: false,
  ...ek,
});
const ADMIN = kul('admin');
const MOTOR_SATIS = kul('personel', { motor_satis_yetkisi: true });
const SADECE_PERSONEL = kul('personel');

// Fixture: sıfır stoktaki model (DECIMAL'ler sürücüden metin gelir)
const PCX = { id: 3, marka: 'Honda', model: 'PCX 125', yil: 2026, alis_fiyati: '95000', liste_fiyati: '120000' };

const sorgular = (db, parca) => db.cagrilar.filter((c) => c.sql.includes(parca));
const SUTUNLAR = [
  'tarih',
  'plaka',
  'marka',
  'model',
  'km',
  'alis_fiyati',
  'satis_fiyati',
  'noter_alis',
  'noter_satis',
  'masraflar',
  'kar',
  'alici_adi',
  'alici_tc',
  'alici_telefon',
  'alici_adres',
  'odeme_sekli',
  'aciklama',
  'durum',
  'tamamlama_tarihi',
  'stok_tipi',
  'yil',
  'satici_adi',
  'satici_tc',
  'kalan_odeme',
  'fatura_kesildi',
  'yevmiye_no',
  'satis_tarihi',
  'komisyoncu_adi',
  'komisyoncu_telefon',
  'komisyoncu_tutari',
  'yatirimci_id',
  'yatirimci_kar_orani',
  'yatirimci_kar',
  'liste_fiyati',
  'odeme_detaylari',
  'vitrin_baslik',
  'vitrin_aciklama',
  'vitrin_segment',
  'vitrin_cc',
  'vitrin_hasar',
  'motor_durumu',
  'sifir_motor_id',
];
// INSERT parametrelerini sütun adıyla okunur yapar (sıra repository'deki INSERT ile aynı)
const eklenen = (db) => {
  const p = sorgular(db, 'INSERT INTO ikinci_el_motorlar')[0].params;
  return Object.fromEntries(SUTUNLAR.map((s, i) => [s, p[i]]));
};
const satisDb = (model = PCX) =>
  sahteDb([
    ['FROM sifir_motorlar WHERE id', model ? [model] : []],
    ['INSERT INTO ikinci_el_motorlar', [{ id: 77, motor_durumu: 'sifir' }]],
  ]);

describe('sıfır motor satışı (motor satış kaydı)', () => {
  it('modeli stoktan DÜŞÜRMEZ: sıfır stoğa yazan (UPDATE/DELETE) sorgu çalışmaz, model yalnızca okunur', async () => {
    const db = satisDb();
    await motorServis.olustur(db, { motor_durumu: 'sifir', sifir_motor_id: 3, alici_adi: '' }, ADMIN);
    const yazanlar = db.cagrilar.filter((c) => /UPDATE sifir_motorlar|DELETE FROM sifir_motorlar/.test(c.sql));
    assert.equal(yazanlar.length, 0);
    assert.equal(sorgular(db, 'FROM sifir_motorlar WHERE id').length, 1);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('boş alanlar modelden gelir; kâr = liste fiyatı − alış (120.000 − 95.000 = 25.000)', async () => {
    const db = satisDb();
    await motorServis.olustur(db, { motor_durumu: 'sifir', sifir_motor_id: '3', marka: '', satis_fiyati: '' }, MOTOR_SATIS);
    const e = eklenen(db);
    assert.deepEqual([e.marka, e.model, e.yil], ['Honda', 'PCX 125', 2026]);
    assert.deepEqual([e.alis_fiyati, e.satis_fiyati, e.kar], [95000, 120000, 25000]);
    assert.deepEqual([e.motor_durumu, e.sifir_motor_id], ['sifir', 3]);
  });

  it('formda yazılan fiyat modeli ezer (indirimli satış): kâr = 115.000 − 95.000 − 1.000 masraf = 19.000', async () => {
    const db = satisDb();
    await motorServis.olustur(db, { motor_durumu: 'sifir', sifir_motor_id: 3, satis_fiyati: 115000, masraflar: 1000 }, ADMIN);
    const e = eklenen(db);
    assert.deepEqual([e.alis_fiyati, e.satis_fiyati, e.masraflar, e.kar], [95000, 115000, 1000, 19000]);
  });

  it('her zaman "tamamlandi" ve satış anı yazılır; admin yatırımcı gönderse bile bağlanmaz', async () => {
    const db = satisDb();
    await motorServis.olustur(db, { motor_durumu: 'sifir', sifir_motor_id: 3, durum: 'stokta', yatirimci_id: 9, yatirimci_kar: 5000 }, ADMIN);
    const e = eklenen(db);
    assert.equal(e.durum, 'tamamlandi');
    assert.ok(e.tamamlama_tarihi instanceof Date);
    assert.deepEqual([e.yatirimci_id, e.yatirimci_kar], [null, 0]);
  });

  it('model seçilmemişse 400, hiçbir şey yazılmaz', async () => {
    const db = satisDb();
    await assert.rejects(motorServis.olustur(db, { motor_durumu: 'sifir' }, ADMIN), { status: 400, message: 'Sıfır motor satışı için stoktan model seçin' });
    assert.equal(sorgular(db, 'INSERT').length, 0);
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });

  it('stokta olmayan (silinmiş) model 400, satış yazılmaz', async () => {
    const db = satisDb(null);
    await assert.rejects(motorServis.olustur(db, { motor_durumu: 'sifir', sifir_motor_id: 99 }, ADMIN), {
      status: 400,
      message: 'Seçilen sıfır motor stokta bulunamadı',
    });
    assert.equal(sorgular(db, 'INSERT').length, 0);
  });

  it('REGRESYON: ikinci el satış eskisi gibi; sıfır stoğa hiç bakılmaz, motor_durumu "ikinci_el"', async () => {
    const db = satisDb();
    await motorServis.olustur(db, { plaka: '34ABC', alis_fiyati: 100, satis_fiyati: 150, durum: 'tamamlandi', sifir_motor_id: 3 }, ADMIN);
    const e = eklenen(db);
    assert.deepEqual([e.motor_durumu, e.sifir_motor_id, e.kar], ['ikinci_el', null, 50]);
    assert.equal(sorgular(db, 'FROM sifir_motorlar').length, 0);
  });

  it('düzenlenen sıfır satış "stokta"ya çekilemez (ikinci el stoğuna düşmez) ve yatırımcıya bağlanamaz', async () => {
    const mevcut = { id: 77, motor_durumu: 'sifir', sifir_motor_id: 3, durum: 'tamamlandi', alis_fiyati: '95000', satis_fiyati: '120000', yatirimci_id: null };
    const db = sahteDb([
      ['FOR UPDATE', [mevcut]],
      ['UPDATE ikinci_el_motorlar SET', [{ id: 77 }]],
    ]);
    await motorServis.guncelle(db, 77, { durum: 'stokta', yatirimci_id: 9 }, ADMIN);
    const p = sorgular(db, 'UPDATE ikinci_el_motorlar SET')[0].params;
    assert.equal(p[17], 'tamamlandi'); // durum=$18
    assert.equal(p[32], null); // yatirimci_id=$33
  });
});

describe('sıfır motor stoğu (model listesi)', () => {
  const modelDb = (mevcut = PCX) =>
    sahteDb([
      ['FOR UPDATE', mevcut ? [mevcut] : []],
      ['FROM sifir_motorlar s', mevcut ? [{ ...mevcut, gorsel_sayisi: '0', satilan_adet: '2' }] : []],
      ['INSERT INTO sifir_motorlar', [{ id: 5 }]],
      ['DELETE FROM sifir_motorlar', mevcut ? [{}] : []],
    ]);

  it('marka zorunlu (boşluk da boştur): 400, yazma yok', async () => {
    const db = modelDb();
    await assert.rejects(sifirServis.olustur(db, { marka: '  ', model: 'PCX' }, ADMIN), { status: 400, message: 'Marka zorunlu' });
    assert.equal(sorgular(db, 'INSERT').length, 0);
  });

  it('yalnızca izinli görsel türü kabul edilir (HTML yüklenip aynı kaynaktan sunulamaz): 400', async () => {
    const db = modelDb();
    await assert.rejects(sifirServis.olustur(db, { marka: 'Honda', gorseller: ['data:text/html;base64,PHNjcmlwdD4='] }, ADMIN), { status: 400 });
    assert.equal(sorgular(db, 'INSERT').length, 0);
  });

  it('alış fiyatı yetkisi olmayan personelin gönderdiği alış fiyatı yazılmaz', async () => {
    const db = modelDb();
    await sifirServis.olustur(db, { marka: 'Honda', alis_fiyati: 1, liste_fiyati: 120000 }, kul('personel', { liste_fiyati_gor: true }));
    const p = sorgular(db, 'INSERT INTO sifir_motorlar')[0].params;
    assert.deepEqual([p[5], p[6]], [0, 120000]); // alis_fiyati, liste_fiyati
  });

  it('liste fiyatı DEĞİŞİNCE bağlı vitrin ilanının fiyatı aynı işlemde güncellenir', async () => {
    const db = modelDb();
    await sifirServis.guncelle(db, 3, { liste_fiyati: 125000 }, ADMIN);
    const ilan = sorgular(db, 'UPDATE vitrin_urunleri SET fiyat');
    assert.equal(ilan.length, 1);
    assert.deepEqual(ilan[0].params, [125000, 3]);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('liste fiyatı aynıysa ilana dokunulmaz; gönderilmeyen alan korunur (kısmi güncelleme)', async () => {
    const db = modelDb();
    await sifirServis.guncelle(db, 3, { aciklama: 'Yeni renk: kırmızı' }, ADMIN);
    assert.equal(sorgular(db, 'UPDATE vitrin_urunleri').length, 0);
    const p = sorgular(db, 'UPDATE sifir_motorlar SET')[0].params;
    assert.deepEqual(p.slice(0, 8), ['Honda', 'PCX 125', 2026, null, null, 95000, 120000, 'Yeni renk: kırmızı']);
  });

  it('alış fiyatı yetkisi olmayan güncelleyemez: mevcut alış korunur', async () => {
    const db = modelDb();
    await sifirServis.guncelle(db, 3, { alis_fiyati: 1 }, SADECE_PERSONEL);
    assert.equal(sorgular(db, 'UPDATE sifir_motorlar SET')[0].params[5], 95000);
  });

  it('olmayan model 404 ve işlem geri alınır', async () => {
    const db = modelDb(null);
    await assert.rejects(sifirServis.guncelle(db, 404, { marka: 'X' }, ADMIN), { status: 404 });
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });

  it('silme yalnızca admin: motor satış yetkilisi 403, hiçbir şey silinmez', async () => {
    const db = modelDb();
    await assert.rejects(sifirServis.sil(db, 3, MOTOR_SATIS), { status: 403 });
    assert.equal(db.cagrilar.length, 0);
  });

  it('admin siler: bağlı ilan yayından kalkar ve bağlantı kopar (tek işlem); satışlara dokunulmaz', async () => {
    const db = modelDb();
    await sifirServis.sil(db, 3, ADMIN);
    assert.equal(sorgular(db, 'SET sifir_motor_id = NULL, yayinda = FALSE').length, 1);
    assert.equal(sorgular(db, 'ikinci_el_motorlar').length, 0);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('olmayan modeli silmek 404', async () => {
    await assert.rejects(sifirServis.sil(modelDb(null), 9, ADMIN), { status: 404 });
  });
});

describe('sıfır stok görünürlüğü', () => {
  const satir = { id: 1, marka: 'Honda', alis_fiyati: '95000', liste_fiyati: '120000', gorsel_sayisi: '3', satilan_adet: '2' };

  it('alış fiyatı: personelden gizli; motor satış ve alış yetkilisine, izinli muhasebeciye açık', () => {
    assert.equal('alis_fiyati' in sanitizeSifirMotor(satir, SADECE_PERSONEL), false);
    assert.equal(sanitizeSifirMotor(satir, MOTOR_SATIS).alis_fiyati, '95000');
    assert.equal(sanitizeSifirMotor(satir, kul('personel', { alis_fiyati_gor: true })).alis_fiyati, '95000');
    assert.equal(sanitizeSifirMotor(satir, kul('muhasebeci', { motor_satis_gor: true })).alis_fiyati, '95000');
  });

  it('liste fiyatı herkese açık; sayaçlar (MariaDB metni) sayıya çevrilir', () => {
    const r = sanitizeSifirMotor(satir, SADECE_PERSONEL);
    assert.deepEqual([r.liste_fiyati, r.gorsel_sayisi, r.satilan_adet], ['120000', 3, 2]);
  });
});

describe('rapor: sıfır satışlar ayrı kâr', () => {
  const motorlar = [
    { motor_durumu: 'ikinci_el', satis_fiyati: '150000', alis_fiyati: '100000', masraflar: '2000', kar: '45000', yatirimci_kar: '5000' },
    { motor_durumu: 'sifir', satis_fiyati: '120000', alis_fiyati: '95000', masraflar: '1000', kar: '24000', yatirimci_kar: '0' },
    { motor_durumu: 'sifir', satis_fiyati: '60000', alis_fiyati: '50000', masraflar: null, kar: '10000', yatirimci_kar: null },
  ];
  const bos = { isEmirleri: [], aksesuarlar: [], eticaret: [], yedekParcalar: [], motorStokToplam: 0 };

  it('aralık: sıfır adet/gelir/maliyet/kâr ayrı; toplam motor gelir ve kârı sıfırları İÇERİR', () => {
    const r = hesap.aralikHesapla('2026-10-01', '2026-10-31', { ...bos, motorlar });
    assert.deepEqual([r.motorSifirAdet, r.motorSifirGelir, r.motorSifirMaliyet, r.motorSifirKar], [2, 180000, 146000, 34000]);
    assert.equal(r.motorGelir, 330000);
    assert.equal(r.motorKar, 74000); // 45.000 + 24.000 + 10.000 − 5.000 yatırımcı
    assert.equal(r.motorKar - r.motorSifirKar, 40000); // ikinci el işletme payı
    assert.equal(r.toplam.kar, 74000);
  });

  it('sıfır satışı yoksa sıfır alanları 0 (NaN/undefined değil)', () => {
    const r = hesap.aralikHesapla('2026-10-01', '2026-10-31', { ...bos, motorlar: [motorlar[0]] });
    assert.deepEqual([r.motorSifirAdet, r.motorSifirGelir, r.motorSifirKar], [0, 0, 0]);
  });

  it('günlük: sıfır alanları motorlar altında', () => {
    const r = hesap.gunlukHesapla('2026-10-01', { isEmirleri: [], aksesuarlar: [], eticaret: [], motorlar });
    assert.deepEqual([r.motorlar.sifir_adet, r.motorlar.sifir_gelir, r.motorlar.sifir_kar], [2, 180000, 34000]);
  });

  it('GÜVENLİK: sıfır kârı (sifir_kar) admin dışındaki yanıttan silinir; adet ve gelir kalır', () => {
    const temiz = alanlariSil({ motorlar: { sifir_adet: 2, sifir_gelir: 180000, sifir_kar: 34000 } }, KAR_ALANLARI);
    assert.deepEqual(temiz, { motorlar: { sifir_adet: 2, sifir_gelir: 180000 } });
  });
});
