/*
 * Motor servisinin iş kuralları (sahte veritabanıyla, sunucu/MariaDB yok).
 *   - Kâr = satış - alış - masraf - komisyoncu tutarı.
 *   - Yatırımcı ataması/payı YALNIZCA admin tarafından yapılır; başkasının gönderdiği değer yok sayılır.
 *   - KISMİ güncelleme: gönderilmeyen alan mevcut değeriyle korunur; yetkisiz kullanıcının gönderdiği hassas alan yok sayılır.
 *   - Satışa geçişte bağlı vitrin ilanı yayından kalkar; liste fiyatı değişince ilan fiyatı da değişir (yetkiliyse).
 *   - Silme yalnız admin; ilan bağlantısı koparılır; her şey tek transaction'da.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sahteDb } = require('./sahteDb');
const servis = require('../../modules/motor/ikinciElMotor.service');

const kul = (rol, ek = {}) => ({
  id: 10, kullanici_adi: 'u', ad_soyad: 'U', rol, motor_satis_yetkisi: false, alis_fiyati_gor: false, satis_fiyati_gor: false,
  musteri_gor: false, liste_fiyati_gor: false, satis_gecmisi_gor: false, kar_gor: false, motor_satis_gor: false, ...ek,
});
const ADMIN = kul('admin');
const MOTOR_SATIS = kul('personel', { motor_satis_yetkisi: true });
const SADECE_PERSONEL = kul('personel');

const sorgular = (db, parca) => db.cagrilar.filter((c) => c.sql.includes(parca));
const ekleme = (db) => sorgular(db, 'INSERT INTO ikinci_el_motorlar')[0].params;
const guncelleme = (db) => sorgular(db, 'UPDATE ikinci_el_motorlar SET')[0].params;
const olusturDb = () => sahteDb([['INSERT INTO ikinci_el_motorlar', [{ id: 21, plaka: 'X' }]]]);
const mevcutDb = (satir) => sahteDb([['FOR UPDATE', [satir]], ['UPDATE ikinci_el_motorlar SET', [{ id: 5 }]]]);

const MEVCUT = {
  id: 5, durum: 'stokta', plaka: '34ABC', marka: 'Honda', model: 'PCX', km: 1000, yil: 2020,
  alis_fiyati: '100000', satis_fiyati: '0', noter_alis: '90000', noter_satis: '0', masraflar: '2000',
  komisyoncu_tutari: '0', yatirimci_id: null, yatirimci_kar_orani: '0', yatirimci_kar: '0', liste_fiyati: '160000',
  alici_adi: 'Eski Alıcı', satici_adi: 'Eski Satıcı', odeme_detaylari: '[{"a":1}]',
};

describe('odemeyiNormalle (saf)', () => {
  it('boş/null/undefined → null; metin olduğu gibi; nesne/dizi JSON metni', () => {
    assert.equal(servis.odemeyiNormalle(undefined), null);
    assert.equal(servis.odemeyiNormalle(''), null);
    assert.equal(servis.odemeyiNormalle('{"x":1}'), '{"x":1}');
    assert.equal(servis.odemeyiNormalle([{ a: 1 }]), '[{"a":1}]');
  });
});

describe('karHesapla (saf)', () => {
  it('satış - alış - masraf - komisyon; zararına satışta eksi olabilir', () => {
    assert.equal(servis.karHesapla(150000, 100000, 2000, 3000), 45000);
    assert.equal(servis.karHesapla(90000, 100000, 0, 0), -10000);
  });
});

describe('oluştur', () => {
  it('kâr hesaplanır; boş sayılar 0; durum boşsa stokta, ödeme boşsa nakit', async () => {
    const db = olusturDb();
    await servis.olustur(db, { plaka: 'P', alis_fiyati: '100000', satis_fiyati: 150000, masraflar: 2000, komisyoncu_tutari: '3000' }, ADMIN);
    const p = ekleme(db);
    assert.equal(p[10], 45000);
    assert.equal(p[4], 0, 'km boş → 0');
    assert.equal(p[17], 'stokta');
    assert.equal(p[15], 'nakit');
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('YATIRIMCI ataması yalnızca admin: personelin gönderdiği id ve payı yok sayılır', async () => {
    const admin = olusturDb();
    await servis.olustur(admin, { plaka: 'P', yatirimci_id: '7', yatirimci_kar_orani: 10, yatirimci_kar: 5000 }, ADMIN);
    assert.deepEqual([ekleme(admin)[30], ekleme(admin)[31], ekleme(admin)[32]], [7, 10, 5000]);
    const personel = olusturDb();
    await servis.olustur(personel, { plaka: 'P', yatirimci_id: '7', yatirimci_kar_orani: 10, yatirimci_kar: 5000 }, MOTOR_SATIS);
    assert.deepEqual([ekleme(personel)[30], ekleme(personel)[31], ekleme(personel)[32]], [null, 0, 0]);
  });

  it('doğrudan "tamamlandı" açılırsa tamamlama tarihi dolu, değilse boş', async () => {
    const tamam = olusturDb();
    await servis.olustur(tamam, { plaka: 'P', durum: 'tamamlandi' }, ADMIN);
    assert.ok(ekleme(tamam)[18] instanceof Date);
    const stok = olusturDb();
    await servis.olustur(stok, { plaka: 'P' }, ADMIN);
    assert.equal(ekleme(stok)[18], null);
  });

  it('satıcı, alıcı ve komisyoncu müşteri kayıtları AYNI transaction\'da açılır', async () => {
    const db = sahteDb([['INSERT INTO ikinci_el_motorlar', [{ id: 21 }]], ['INSERT INTO musteriler', [{ id: 1 }]]]);
    await servis.olustur(db, { plaka: 'P', satici_adi: 'Veli', alici_adi: 'Ali', alici_telefon: '05551112233', komisyoncu_adi: 'Kem' }, ADMIN);
    assert.equal(sorgular(db, 'INSERT INTO musteriler').length, 3);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('kayıt yanıtı kullanıcının yetkisine göre süzülür (personel kâr görmez)', async () => {
    const db = sahteDb([['INSERT INTO ikinci_el_motorlar', [{ id: 21, plaka: 'P', kar: 999, alis_fiyati: 1 }]]]);
    const kayit = await servis.olustur(db, { plaka: 'P' }, SADECE_PERSONEL);
    assert.equal(kayit.id, 21);
    assert.ok(!('kar' in kayit) && !('alis_fiyati' in kayit));
  });
});

describe('güncelle: yetki ve kısmi güncelleme', () => {
  it('olmayan kayıt 404 "Kayıt bulunamadı", ROLLBACK', async () => {
    const db = sahteDb();
    await assert.rejects(servis.guncelle(db, 5, {}, ADMIN), (h) => h.status === 404 && h.message === 'Kayıt bulunamadı');
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });

  it('yatırımcı başkasının motorunu güncelleyemez (403)', async () => {
    const db = mevcutDb({ ...MEVCUT, yatirimci_id: 99 });
    await assert.rejects(servis.guncelle(db, 5, { plaka: 'Y' }, kul('yatirimci', { id: 10 })), (h) => h.status === 403 && h.message === 'Bu kayda erişim yetkiniz yok');
  });

  it('KISMİ: gövdede olmayan alanlar mevcut değerle korunur (satış verisi silinmez)', async () => {
    const db = mevcutDb({ ...MEVCUT, satis_fiyati: '150000', alici_adi: 'Ali', durum: 'tamamlandi' });
    await servis.guncelle(db, 5, { plaka: 'YENI' }, ADMIN);
    const p = guncelleme(db);
    assert.equal(p[1], 'YENI', 'gönderilen alan uygulanır');
    assert.equal(p[2], 'Honda', 'gönderilmeyen alan korunur');
    assert.equal(p[6], 150000, 'satış fiyatı sıfırlanmaz');
    assert.equal(p[11], 'Ali', 'alıcı korunur');
    assert.equal(p[34 + 2], MEVCUT.odeme_detaylari, 'ödeme detayı korunur');
  });

  it('YETKİSİ OLMAYAN personelin gönderdiği alış/satış/masraf/müşteri/yatırımcı alanları yok sayılır (DB değeri korunur)', async () => {
    const db = mevcutDb({ ...MEVCUT });
    await servis.guncelle(db, 5, {
      alis_fiyati: 1, satis_fiyati: 999999, masraflar: 0, noter_alis: 1, alici_adi: 'Kötü', komisyoncu_tutari: 777,
      yatirimci_id: 5, yatirimci_kar: 1234, liste_fiyati: 1,
    }, SADECE_PERSONEL);
    const p = guncelleme(db);
    assert.equal(p[5], 100000, 'alış korunur');
    assert.equal(p[6], 0, 'satış korunur (mevcut 0)');
    assert.equal(p[9], 2000, 'masraf korunur');
    assert.equal(p[11], 'Eski Alıcı', 'alıcı korunur');
    assert.equal(p[31], 0, 'komisyoncu tutarı korunur');
    assert.equal(p[32], null, 'yatırımcı ataması yok sayılır');
    assert.equal(p[35], 160000, 'liste fiyatı korunur');
  });

  it('Motor Satış yetkilisi satış/alış/müşteriyi değiştirir ama YATIRIMCI alanlarını değiştiremez', async () => {
    const db = mevcutDb({ ...MEVCUT });
    await servis.guncelle(db, 5, { alis_fiyati: 90000, satis_fiyati: 150000, alici_adi: 'Yeni', yatirimci_id: 5, yatirimci_kar: 1234 }, MOTOR_SATIS);
    const p = guncelleme(db);
    assert.deepEqual([p[5], p[6], p[11]], [90000, 150000, 'Yeni']);
    assert.equal(p[10], 150000 - 90000 - 2000, 'kâr yeniden hesaplanır');
    assert.equal(p[32], null);
  });

  it('admin yatırımcıyı atar ve kaldırır (null gönderilirse kaldırılır, gönderilmezse korunur)', async () => {
    const ata = mevcutDb({ ...MEVCUT });
    await servis.guncelle(ata, 5, { yatirimci_id: 7, yatirimci_kar: 500 }, ADMIN);
    assert.deepEqual([guncelleme(ata)[32], guncelleme(ata)[34]], [7, 500]);
    const kaldir = mevcutDb({ ...MEVCUT, yatirimci_id: 7, yatirimci_kar: '500' });
    await servis.guncelle(kaldir, 5, { yatirimci_id: null }, ADMIN);
    assert.deepEqual([guncelleme(kaldir)[32], guncelleme(kaldir)[34]], [null, 0]);
    const koru = mevcutDb({ ...MEVCUT, yatirimci_id: 7, yatirimci_kar: '500' });
    await servis.guncelle(koru, 5, { plaka: 'Z' }, ADMIN);
    assert.deepEqual([guncelleme(koru)[32], guncelleme(koru)[34]], [7, 500]);
  });
});

describe('güncelle: satışa geçiş ve vitrin ilanı', () => {
  it('stoktan tamamlandıya geçişte tamamlama tarihi verilir ve bağlı İLAN yayından kalkar', async () => {
    const db = mevcutDb({ ...MEVCUT });
    await servis.guncelle(db, 5, { durum: 'tamamlandi' }, ADMIN);
    assert.ok(guncelleme(db)[18] instanceof Date);
    assert.equal(sorgular(db, 'SET yayinda = FALSE').length, 1);
  });

  it('zaten satılmış motoru tekrar kaydetmek ilana/tarihe dokunmaz', async () => {
    const db = mevcutDb({ ...MEVCUT, durum: 'tamamlandi' });
    await servis.guncelle(db, 5, { durum: 'tamamlandi' }, ADMIN);
    assert.equal(guncelleme(db)[18], null, 'COALESCE eski tarihi korur');
    assert.equal(sorgular(db, 'SET yayinda = FALSE').length, 0);
  });

  it('liste fiyatı değişince ilan fiyatı da güncellenir (yetkiliyse); yetkisizde dokunulmaz', async () => {
    const admin = mevcutDb({ ...MEVCUT });
    await servis.guncelle(admin, 5, { liste_fiyati: 170000 }, ADMIN);
    const fiyat = sorgular(admin, 'SET fiyat = $1')[0];
    assert.deepEqual(fiyat.params, [170000, 5]);
    const yetkisiz = mevcutDb({ ...MEVCUT });
    await servis.guncelle(yetkisiz, 5, { liste_fiyati: 170000 }, MOTOR_SATIS);
    assert.equal(sorgular(yetkisiz, 'SET fiyat = $1').length, 0);
  });

  it('ilan güncellemesi patlarsa motor güncellemesi de geri alınır (tek transaction)', async () => {
    const db = sahteDb([['FOR UPDATE', [{ ...MEVCUT }]], ['UPDATE ikinci_el_motorlar SET', [{ id: 5 }]], ['SET yayinda = FALSE', new Error('ilan hatası')]]);
    await assert.rejects(servis.guncelle(db, 5, { durum: 'tamamlandi' }, ADMIN), /ilan hatası/);
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });
});

describe('detay: erişim kuralları', () => {
  it('olmayan kayıt 404; yatırımcı başkasının motorunu göremez 403', async () => {
    await assert.rejects(servis.detay(sahteDb(), 5, ADMIN), (h) => h.status === 404);
    const db = sahteDb([['SELECT * FROM ikinci_el_motorlar WHERE id', [{ ...MEVCUT, yatirimci_id: 99 }]]]);
    await assert.rejects(servis.detay(db, 5, kul('yatirimci', { id: 10 })), (h) => h.status === 403);
  });

  it('yetkisiz personel SATILMIŞ motoru id ile de göremez (listeyle aynı kural)', async () => {
    const db = sahteDb([['SELECT * FROM ikinci_el_motorlar WHERE id', [{ ...MEVCUT, durum: 'tamamlandi' }]]]);
    await assert.rejects(servis.detay(db, 5, SADECE_PERSONEL), (h) => h.status === 404 && h.message === 'Kayıt bulunamadı');
    const gorur = await servis.detay(db, 5, MOTOR_SATIS);
    assert.equal(gorur.id, 5);
  });
});

describe('sil', () => {
  it('admin değilse 403 "Silme yetkiniz yok" (veritabanına dokunulmaz)', async () => {
    const db = sahteDb();
    await assert.rejects(servis.sil(db, 5, MOTOR_SATIS), (h) => h.status === 403 && h.message === 'Silme yetkiniz yok');
    assert.equal(db.cagrilar.length, 0);
  });

  it('admin: ilan bağlantısı ÖNCE koparılır, sonra motor silinir; tek transaction', async () => {
    const db = sahteDb();
    await servis.sil(db, 5, ADMIN);
    assert.match(db.cagrilar[0].sql, /SET stok_motor_id = NULL, yayinda = FALSE/);
    assert.match(db.cagrilar[1].sql, /DELETE FROM ikinci_el_motorlar/);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });
});
