/*
 * Aksesuar servislerinin iş kuralları (sahte veritabanıyla, sunucu/MariaDB yok).
 *   - İndirim ürün toplamından düşülür, brüt toplamı AŞAMAZ; kâr = net satış - maliyet.
 *   - Boş adet 1 sayılır (toplam, kayıt ve stok düşümü aynı adedi kullanır); geçersiz adet 400.
 *   - Stok yalnızca "tamamlandı" satışta düşer; stok id ile, yoksa ada göre eşleşir.
 *   - Düzenleme/silmede eski stok düşümü iade edilir; silmede günlük için "kayıt vardı mı" bilgisi döner.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sahteDb } = require('./sahteDb');
const satis = require('../../modules/aksesuar/aksesuarlar/aksesuarlar.service');
const stok = require('../../modules/aksesuar/aksesuarStok/aksesuarStok.service');

const KULLANICI = { id: 1, kullanici_adi: 'ali', ad_soyad: 'Ali Usta', rol: 'personel' };

const kayitDb = (ek = []) => sahteDb([
  ...ek,
  ['INSERT INTO aksesuarlar', [{ id: 21 }]],
  ['SELECT * FROM aksesuarlar WHERE id', [{ id: 21 }]],
]);
const sorgular = (db, parca) => db.cagrilar.filter((c) => c.sql.includes(parca));
const ekleme = (db) => sorgular(db, 'INSERT INTO aksesuarlar')[0].params;
const dusumler = (db) => sorgular(db, 'UPDATE aksesuar_stok').map((c) => c.params);

describe('satış: toplam, indirim ve kâr', () => {
  const parcalar = [{ adet: 2, maliyet: 30, satis_fiyati: 100 }, { adet: 1, maliyet: 10, satis_fiyati: 50 }];

  it('net satış = brüt - indirim; kâr = net - maliyet', async () => {
    const db = kayitDb();
    await satis.olustur(db, { ad_soyad: 'A', parcalar, indirim: 20 }, KULLANICI);
    const p = ekleme(db);
    assert.deepEqual([p[7], p[8], p[9], p[13]], [70, 230, 160, 20], 'maliyet 70, net 230, kâr 160, indirim 20');
  });

  it('indirim brüt toplamı AŞAMAZ (net 0\'ın altına düşmez)', async () => {
    const db = kayitDb();
    await satis.olustur(db, { ad_soyad: 'A', parcalar, indirim: 9999 }, KULLANICI);
    const p = ekleme(db);
    assert.deepEqual([p[8], p[13]], [0, 250]);
  });

  it('boş adet 1 sayılır; geçersiz adet 400 ve işlem geri alınır', async () => {
    const db = kayitDb();
    await satis.olustur(db, { ad_soyad: 'A', parcalar: [{ maliyet: 10, satis_fiyati: 40 }] }, KULLANICI);
    assert.deepEqual([ekleme(db)[7], ekleme(db)[8]], [10, 40]);
    const kotu = kayitDb();
    await assert.rejects(satis.olustur(kotu, { ad_soyad: 'A', parcalar: [{ adet: 0 }] }, KULLANICI), (h) => h.status === 400);
    assert.deepEqual(kotu.olaylar, ['BEGIN', 'ROLLBACK']);
  });

  it('oluşturan kişi: ad soyad, yoksa kullanıcı adı', async () => {
    const db = kayitDb();
    await satis.olustur(db, { ad_soyad: 'A', parcalar: [] }, KULLANICI);
    assert.equal(ekleme(db)[11], 'Ali Usta');
    const db2 = kayitDb();
    await satis.olustur(db2, { ad_soyad: 'A', parcalar: [] }, { ...KULLANICI, ad_soyad: '' });
    assert.equal(ekleme(db2)[11], 'ali');
  });
});

describe('satış: stok eşleştirme ve düşüm', () => {
  const tamam = (ek = {}) => ({ ad_soyad: 'A', durum: 'tamamlandi', parcalar: [{ stok_id: 5, urun_adi: 'Kask', adet: 3, satis_fiyati: 10 }], ...ek });

  it('tamamlandı + geçerli stok id: adet kadar DÜŞER', async () => {
    const db = kayitDb([['SELECT id FROM aksesuar_stok WHERE id', [{ id: 5 }]]]);
    await satis.olustur(db, tamam(), KULLANICI);
    assert.deepEqual(dusumler(db), [[3, 5]]);
  });

  it('beklemede satış stoğa DOKUNMAZ', async () => {
    const db = kayitDb([['SELECT id FROM aksesuar_stok WHERE id', [{ id: 5 }]]]);
    await satis.olustur(db, tamam({ durum: 'beklemede' }), KULLANICI);
    assert.deepEqual(dusumler(db), []);
  });

  it('stok id yoksa/yanlışsa ada göre eşleşir ve satır o id ile kaydedilir', async () => {
    const db = kayitDb([['WHERE stok_adi', [{ id: 9 }]]]);
    await satis.olustur(db, tamam({ parcalar: [{ urun_adi: 'Kask', adet: 2 }] }), KULLANICI);
    assert.deepEqual(dusumler(db), [[2, 9]]);
    assert.equal(sorgular(db, 'INSERT INTO aksesuar_parcalar')[0].params[1], 9);
  });

  it('hiç eşleşme yoksa stok güncellenmez, satır stok_id=NULL yazılır (uyarı günlüğü)', async () => {
    const db = kayitDb();
    const asil = console.warn;
    let uyari = '';
    console.warn = (m) => { uyari = String(m); };
    try {
      await satis.olustur(db, tamam({ parcalar: [{ urun_adi: 'Bilinmeyen', adet: 1 }] }), KULLANICI);
    } finally {
      console.warn = asil;
    }
    assert.deepEqual(dusumler(db), []);
    assert.equal(sorgular(db, 'INSERT INTO aksesuar_parcalar')[0].params[1], null);
    assert.match(uyari, /Bilinmeyen/);
  });
});

describe('satış: düzenleme ve silme', () => {
  const eskiTamam = (parcalar = [{ stok_id: 5, urun_adi: 'Kask', adet: 2 }]) => sahteDb([
    ['FOR UPDATE', [{ id: 21, durum: 'tamamlandi' }]],
    ['SELECT * FROM aksesuar_parcalar WHERE aksesuar_id = $1 ORDER BY id', []],
    ['FROM aksesuar_parcalar', parcalar],
    ['SELECT id FROM aksesuar_stok WHERE id', [{ id: 5 }]],
    ['SELECT * FROM aksesuarlar WHERE id', [{ id: 21 }]],
  ]);

  it('olmayan satış: 404 "Bulunamadı", ROLLBACK', async () => {
    const db = sahteDb();
    await assert.rejects(satis.guncelle(db, 21, { ad_soyad: 'A', parcalar: [] }), (h) => h.status === 404 && h.message === 'Bulunamadı');
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });

  it('eski durum tamamlandıysa eski parçaların stoğu önce İADE edilir (parçalar silinmeden önce)', async () => {
    const db = eskiTamam();
    await satis.guncelle(db, 21, { ad_soyad: 'A', durum: 'beklemede', parcalar: [] });
    const iade = db.cagrilar.findIndex((c) => c.sql.includes('UPDATE aksesuar_stok'));
    const silme = db.cagrilar.findIndex((c) => c.sql.includes('DELETE FROM aksesuar_parcalar'));
    assert.ok(iade >= 0 && iade < silme);
    assert.deepEqual(db.cagrilar[iade].params, [-2, 5]);
  });

  it('tamamlama tarihi yalnızca "tamamlandı"ya geçişte verilir (zaten tamamsa COALESCE eskisini korur)', async () => {
    const db = eskiTamam([]);
    await satis.guncelle(db, 21, { ad_soyad: 'A', durum: 'tamamlandi', parcalar: [] });
    assert.equal(sorgular(db, 'UPDATE aksesuarlar SET')[0].params[10], null);
  });

  it('silme: kayıt vardıysa true (günlük yazılır) ve tamamlanmışsa stok iade edilir; yoksa false', async () => {
    const var1 = eskiTamam();
    assert.equal(await satis.sil(var1, 21), true);
    assert.deepEqual(dusumler(var1), [[-2, 5]]);
    const yok = sahteDb();
    assert.equal(await satis.sil(yok, 21), false);
    assert.deepEqual(yok.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('detay: olmayan satış 404 "Aksesuar bulunamadı"', async () => {
    await assert.rejects(satis.detay(sahteDb(), 1), (h) => h.status === 404 && h.message === 'Aksesuar bulunamadı');
  });
});

describe('aksesuar stok', () => {
  it('sonraki dahili kod 13 haneye sıfırla tamamlanır', async () => {
    assert.deepEqual(await stok.sonrakiStokKodu(sahteDb()), { nextStokKodu: '0000000000001' });
    const db = sahteDb([['REGEXP', [{ stok_kodu: '0000000000099' }]]]);
    assert.deepEqual(await stok.sonrakiStokKodu(db), { nextStokKodu: '0000000000100' });
  });

  it('doğrulama: zorunlu alan, negatif giren, UNIQUE, olmayan stok güncelleme 404', async () => {
    await assert.rejects(stok.ekle(sahteDb(), { stok_kodu: '', stok_adi: 'x' }), (h) => h.message === 'Stok kodu ve stok adı zorunludur');
    await assert.rejects(stok.guncelle(sahteDb(), 1, { stok_kodu: 'K', stok_adi: 'x', giren_miktar: -1 }), (h) => h.message === 'Giren miktar negatif olamaz');
    const dup = Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
    await assert.rejects(stok.ekle(sahteDb([['INSERT INTO aksesuar_stok', dup]]), { stok_kodu: 'K', stok_adi: 'x' }), (h) => h.status === 400 && h.message === 'Bu stok kodu zaten mevcut');
    await assert.rejects(stok.guncelle(sahteDb(), 99, { stok_kodu: 'K', stok_adi: 'x' }), (h) => h.status === 404 && h.message === 'Stok bulunamadı');
  });

  it('toplu: satır hatası numarasıyla, hata ortada olursa ROLLBACK', async () => {
    await assert.rejects(stok.topluEkle(sahteDb(), { stoklar: [{ stok_kodu: 'A', stok_adi: 'a' }, { stok_adi: 'b' }] }), (h) => h.message === 'Stok kodu ve adı boş olamaz (satır: 2)');
    const db = sahteDb([['ON DUPLICATE KEY', new Error('hata')]]);
    await assert.rejects(stok.topluEkle(db, { stoklar: [{ stok_kodu: 'A', stok_adi: 'a' }] }), /hata/);
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });
});
