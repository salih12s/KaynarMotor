/*
 * Yedek parça servislerinin iş kuralları (sahte veritabanıyla, sunucu/MariaDB yok).
 *   - Stok kodu değişince iş emri parça kodları AYNI transaction'da yeni koda taşınır.
 *   - Toplu içe aktarma ya hep ya hiç: ortadaki hata ROLLBACK yapar.
 *   - Satış silinince / düzenlenince stok iadesi doğru adetle yapılır.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sahteDb } = require('./sahteDb');
const stok = require('../../modules/yedek-parca/yedekParcaStok/yedekParcaStok.service');
const satis = require('../../modules/yedek-parca/yedekParcalar/yedekParcalar.service');

const sorgular = (db, parca) => db.cagrilar.filter((c) => c.sql.includes(parca));

describe('stok: sonraki otomatik kod', () => {
  it('hiç otomatik kod yoksa ilk kodla başlar', async () => {
    assert.deepEqual(await stok.sonrakiStokKodu(sahteDb()), { nextStokKodu: '9000000000001' });
  });

  it('en büyük otomatik kodun bir fazlasını verir', async () => {
    const db = sahteDb([['REGEXP', [{ stok_kodu: '9000000000041' }]]]);
    assert.deepEqual(await stok.sonrakiStokKodu(db), { nextStokKodu: '9000000000042' });
  });
});

describe('stok: doğrulama', () => {
  it('stok kodu ya da adı boşsa 400 (veritabanına gidilmez)', async () => {
    const db = sahteDb();
    await assert.rejects(stok.ekle(db, { stok_kodu: ' ', stok_adi: 'Balata' }), (h) => h.status === 400 && h.message === 'Stok kodu ve stok adı zorunludur');
    await assert.rejects(stok.ekle(db, { stok_kodu: 'K1', stok_adi: '' }), (h) => h.status === 400);
    assert.equal(db.cagrilar.length, 0);
  });

  it('negatif giren miktar güncellemede 400', async () => {
    await assert.rejects(stok.guncelle(sahteDb(), 1, { stok_kodu: 'K1', stok_adi: 'A', giren_miktar: -3 }), (h) => h.status === 400 && h.message === 'Giren miktar negatif olamaz');
  });

  it('aynı stok kodu (UNIQUE ihlali) 400 "Bu stok kodu zaten mevcut"', async () => {
    const dup = Object.assign(new Error('Duplicate entry'), { code: 'ER_DUP_ENTRY' });
    const db = sahteDb([['INSERT INTO yedek_parca_stok', dup]]);
    await assert.rejects(stok.ekle(db, { stok_kodu: 'K1', stok_adi: 'A' }), (h) => h.status === 400 && h.message === 'Bu stok kodu zaten mevcut');
  });

  it('barkod: boş 400, bulunamayan 404', async () => {
    await assert.rejects(stok.barkodlaBul(sahteDb(), '  '), (h) => h.status === 400 && h.message === 'Barkod gerekli');
    await assert.rejects(stok.barkodlaBul(sahteDb(), '123'), (h) => h.status === 404 && h.message === 'Bu barkoda ait ürün bulunamadı');
  });

  it('arama: 2 harften kısa sorguda veritabanına gidilmez', async () => {
    const db = sahteDb();
    assert.deepEqual(await stok.ara(db, 'a'), []);
    assert.deepEqual(await stok.ara(db, undefined), []);
    assert.equal(db.cagrilar.length, 0);
  });
});

describe('stok: güncelleme ve kod değişimi', () => {
  it('olmayan stok: 404 "Stok bulunamadı" ve ROLLBACK', async () => {
    const db = sahteDb();
    await assert.rejects(stok.guncelle(db, 9, { stok_kodu: 'K1', stok_adi: 'A' }), (h) => h.status === 404 && h.message === 'Stok bulunamadı');
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });

  it('kod DEĞİŞİRSE iş emri parça kodları aynı transaction\'da taşınır', async () => {
    const db = sahteDb([['FOR UPDATE', [{ stok_kodu: 'ESKI' }]], ['UPDATE yedek_parca_stok', [{ id: 9 }]]]);
    await stok.guncelle(db, 9, { stok_kodu: 'YENI', stok_adi: 'A' });
    const tasima = sorgular(db, 'UPDATE parcalar SET parca_kodu');
    assert.equal(tasima.length, 1);
    assert.deepEqual(tasima[0].params, ['YENI', 'ESKI']);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('kod DEĞİŞMEZSE parça kodlarına dokunulmaz', async () => {
    const db = sahteDb([['FOR UPDATE', [{ stok_kodu: 'AYNI' }]], ['UPDATE yedek_parca_stok', [{ id: 9 }]]]);
    await stok.guncelle(db, 9, { stok_kodu: 'AYNI', stok_adi: 'A' });
    assert.equal(sorgular(db, 'UPDATE parcalar').length, 0);
  });
});

describe('stok: toplu içe aktarma', () => {
  it('liste dizi değilse 400 "Stok listesi gerekli"', async () => {
    await assert.rejects(stok.topluEkle(sahteDb(), {}), (h) => h.status === 400 && h.message === 'Stok listesi gerekli');
    await assert.rejects(stok.topluEkle(sahteDb(), { stoklar: 'x' }), (h) => h.message === 'Stok listesi gerekli');
  });

  it('boş kod/ad olan satırlar numarasıyla bildirilir; hiçbir şey yazılmaz', async () => {
    const db = sahteDb();
    await assert.rejects(
      stok.topluEkle(db, { stoklar: [{ stok_kodu: 'A', stok_adi: 'a' }, { stok_kodu: '', stok_adi: 'b' }, null] }),
      (h) => h.status === 400 && h.message === 'Stok kodu ve adı boş olamaz (satır: 2, 3)'
    );
    assert.equal(db.cagrilar.length, 0);
    assert.deepEqual(db.olaylar, []);
  });

  it('hepsi geçerliyse tek transaction\'da yazılır ve sayı döner', async () => {
    const db = sahteDb();
    const sayi = await stok.topluEkle(db, { stoklar: [{ stok_kodu: 'A', stok_adi: 'a', giren_miktar: '3', satis_fiyati: '10' }, { stok_kodu: 'B', stok_adi: 'b' }] });
    assert.equal(sayi, 2);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
    assert.deepEqual(db.cagrilar[0].params.slice(3, 4).concat(db.cagrilar[0].params.slice(8)), [3, 30], 'giren 3, envanter 3*10');
  });

  it('ortadaki satır patlarsa ROLLBACK (yarım içe aktarma kalmaz)', async () => {
    const db = sahteDb([['ON DUPLICATE KEY', new Error('veritabanı hatası')]]);
    await assert.rejects(stok.topluEkle(db, { stoklar: [{ stok_kodu: 'A', stok_adi: 'a' }] }), /veritabanı hatası/);
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });
});

describe('satış: stok düşümü ve iadesi', () => {
  it('stoğa bağlı satış: kayıt eklenir, stok adet kadar DÜŞER (tek transaction)', async () => {
    const db = sahteDb([['INSERT INTO yedek_parcalar', [{ id: 1 }]]]);
    await satis.ekle(db, { urun_adi: 'Balata', satis_fiyati: 100, stok_id: 5, adet: 2 });
    const dusum = sorgular(db, 'UPDATE yedek_parca_stok');
    assert.equal(dusum.length, 1);
    assert.equal(dusum[0].params[0], 2);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('stoğa bağlı olmayan satış stoğa dokunmaz', async () => {
    const db = sahteDb([['INSERT INTO yedek_parcalar', [{ id: 1 }]]]);
    await satis.ekle(db, { urun_adi: 'Serbest', adet: 3 });
    assert.equal(sorgular(db, 'UPDATE yedek_parca_stok').length, 0);
  });

  it('geçersiz adet 400 ve işlem geri alınır', async () => {
    const db = sahteDb();
    await assert.rejects(satis.ekle(db, { urun_adi: 'x', adet: -2 }), (h) => h.status === 400 && h.message === 'Adet pozitif bir tam sayı olmalıdır');
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });

  it('silme: eski adet kadar stok İADE edilir (negatif miktar)', async () => {
    const db = sahteDb([['FOR UPDATE', [{ stok_id: 5, adet: 4 }]]]);
    await satis.sil(db, 1);
    const iade = sorgular(db, 'UPDATE yedek_parca_stok');
    assert.equal(iade.length, 1);
    assert.equal(iade[0].params[0], -4);
  });

  it('olmayan satışı silmek sessizce başarılı (eski davranış), stok iadesi yok', async () => {
    const db = sahteDb();
    await satis.sil(db, 1);
    assert.equal(sorgular(db, 'UPDATE yedek_parca_stok').length, 0);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('güncelleme: önce ESKİ düşüm iade, sonra yenisi düşer; olmayan satış 404', async () => {
    const db = sahteDb([['FOR UPDATE', [{ stok_id: 5, adet: 2 }]], ['UPDATE yedek_parcalar', [{ id: 1 }]]]);
    await satis.guncelle(db, 1, { urun_adi: 'x', stok_id: 5, adet: 7 });
    const hareketler = sorgular(db, 'UPDATE yedek_parca_stok').map((c) => c.params[0]);
    assert.deepEqual(hareketler, [-2, 7]);
    await assert.rejects(satis.guncelle(sahteDb(), 1, { urun_adi: 'x' }), (h) => h.status === 404 && h.message === 'Yedek parça bulunamadı');
  });
});
