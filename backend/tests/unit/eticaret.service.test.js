/*
 * E-ticaret servisinin iş kuralları (sahte veritabanıyla, sunucu/MariaDB yok).
 *   - Platform yönetimi yalnız admin; ad zorunlu; KDV boşsa %20, 0 geçerli.
 *   - Kâr/komisyon, platform tipine göre komisyon.ts formülüyle hesaplanır.
 *   - Aksesuar stoğundan düşüm/iade: oluşturmada düşer, düzenlemede önce eski iade sonra yeni düşer, silmede iade.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sahteDb } = require('./sahteDb');
const servis = require('../../modules/eticaret/eticaret.service');
const { hesaplaKomisyon } = require('../../modules/eticaret/komisyon');

const ADMIN = { id: 1, kullanici_adi: 'admin', rol: 'admin' };
const PERSONEL = { id: 2, kullanici_adi: 'ali', rol: 'personel' };

const sorgular = (db, parca) => db.cagrilar.filter((c) => c.sql.includes(parca));
const satisDb = (ek = []) => sahteDb([
  ...ek,
  ['INSERT INTO eticaret_satislar', [{ id: 7 }]],
  ['FROM eticaret_satislar es', [{ id: 7, adet: 2 }]],
]);

describe('platform yönetimi', () => {
  const platform = { platform_adi: ' Trendyol ', komisyon_orani: '12', kargo_ucreti: '' };

  it('admin dışı: ekleme, güncelleme ve silme 403 "Admin yetkisi gerekli" (veritabanına dokunulmaz)', async () => {
    const db = sahteDb();
    for (const islem of [servis.platformEkle(db, platform, PERSONEL), servis.platformGuncelle(db, 1, platform, PERSONEL), servis.platformSil(db, 1, PERSONEL)]) {
      await assert.rejects(islem, (h) => h.status === 403 && h.message === 'Admin yetkisi gerekli');
    }
    assert.equal(db.cagrilar.length, 0);
  });

  it('ad boş/yalnız boşluk: 400 "Platform adı zorunludur"', async () => {
    await assert.rejects(servis.platformEkle(sahteDb(), { platform_adi: '   ' }, ADMIN), (h) => h.status === 400 && h.message === 'Platform adı zorunludur');
    await assert.rejects(servis.platformEkle(sahteDb(), {}, ADMIN), (h) => h.message === 'Platform adı zorunludur');
  });

  it('ad kırpılır; KDV boşsa 20, kargo boşsa 0; KDV 0 GEÇERLİ (20 yapılmaz)', async () => {
    const db = sahteDb([['INSERT INTO eticaret_platformlar', [{ id: 1 }]]]);
    await servis.platformEkle(db, platform, ADMIN);
    assert.deepEqual(sorgular(db, 'INSERT')[0].params, ['Trendyol', 12, 20, 0]);
    const sifir = sahteDb([['INSERT INTO eticaret_platformlar', [{ id: 1 }]]]);
    await servis.platformEkle(sifir, { platform_adi: 'X', kdv_orani: 0 }, ADMIN);
    assert.equal(sorgular(sifir, 'INSERT')[0].params[2], 0);
  });

  it('olmayan platform güncelleme: 404; silme: kayıt vardıysa true, yoksa false', async () => {
    await assert.rejects(servis.platformGuncelle(sahteDb(), 9, platform, ADMIN), (h) => h.status === 404 && h.message === 'Platform bulunamadı');
    const var1 = { query: async () => ({ rows: [], rowCount: 1 }) };
    const yok = { query: async () => ({ rows: [], rowCount: 0 }) };
    assert.equal(await servis.platformSil(var1, 1, ADMIN), true);
    assert.equal(await servis.platformSil(yok, 1, ADMIN), false);
  });
});

describe('satış: komisyon/kâr hesabı', () => {
  const govde = { urun_adi: 'Kask', alis_fiyati: 100, satis_fiyati: 300, komisyon_orani: 10, kdv_orani: 20, kargo_ucreti: 20, adet: 2 };

  it('platform yoksa Trendyol formülü; kâr ve komisyon tutarı komisyon.ts ile birebir aynı', async () => {
    const db = satisDb();
    await servis.satisOlustur(db, govde);
    const p = sorgular(db, 'INSERT INTO eticaret_satislar')[0].params;
    const beklenen = hesaplaKomisyon(300, 100, 10, 20, 20, 2, 'trendyol');
    assert.equal(p[6], beklenen.komisyonTutari);
    assert.equal(p[9], beklenen.netKar);
    assert.equal(p[10], 2);
  });

  it('platform adı Hepsiburada ise o formül kullanılır (farklı kâr)', async () => {
    const db = satisDb([['SELECT platform_adi', [{ platform_adi: 'Hepsiburada' }]]]);
    await servis.satisOlustur(db, { ...govde, platform_id: 3 });
    const p = sorgular(db, 'INSERT INTO eticaret_satislar')[0].params;
    assert.equal(p[9], hesaplaKomisyon(300, 100, 10, 20, 20, 2, 'hepsiburada').netKar);
    assert.notEqual(p[9], hesaplaKomisyon(300, 100, 10, 20, 20, 2, 'trendyol').netKar);
  });

  it('boş KDV %20 sayılır; geçersiz adet 400 ve işlem geri alınır', async () => {
    const db = satisDb();
    await servis.satisOlustur(db, { ...govde, kdv_orani: '' });
    assert.equal(sorgular(db, 'INSERT INTO eticaret_satislar')[0].params[7], 20);
    const kotu = satisDb();
    await assert.rejects(servis.satisOlustur(kotu, { ...govde, adet: -1 }), (h) => h.status === 400);
    assert.deepEqual(kotu.olaylar, ['BEGIN', 'ROLLBACK']);
  });
});

describe('satış: stok düşümü ve iadesi', () => {
  const govde = { urun_adi: 'Kask', satis_fiyati: 100, adet: 3 };

  it('stoğa bağlı satış adet kadar DÜŞER; bağlı olmayan satış stoğa dokunmaz', async () => {
    const bagli = satisDb();
    await servis.satisOlustur(bagli, { ...govde, stok_id: 5 });
    assert.deepEqual(sorgular(bagli, 'UPDATE aksesuar_stok').map((c) => c.params), [[3, 5]]);
    const serbest = satisDb();
    await servis.satisOlustur(serbest, govde);
    assert.equal(sorgular(serbest, 'UPDATE aksesuar_stok').length, 0);
  });

  it('düzenleme: ÖNCE eski adet iade (negatif), SONRA yeni adet düşer', async () => {
    const db = satisDb([['FOR UPDATE', [{ id: 7, stok_id: 5, adet: 2 }]]]);
    await servis.satisGuncelle(db, 7, { ...govde, stok_id: 6 });
    assert.deepEqual(sorgular(db, 'UPDATE aksesuar_stok').map((c) => c.params), [[-2, 5], [3, 6]]);
  });

  it('olmayan satışı güncelleme 404 "Bulunamadı"; ROLLBACK', async () => {
    const db = sahteDb();
    await assert.rejects(servis.satisGuncelle(db, 7, govde), (h) => h.status === 404 && h.message === 'Bulunamadı');
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });

  it('silme: stoğa bağlıysa iade edilir ve true döner; kayıt yoksa false', async () => {
    const var1 = sahteDb([['FOR UPDATE', [{ id: 7, stok_id: 5, adet: 4 }]]]);
    assert.equal(await servis.satisSil(var1, 7), true);
    assert.deepEqual(sorgular(var1, 'UPDATE aksesuar_stok').map((c) => c.params), [[-4, 5]]);
    const yok = sahteDb();
    assert.equal(await servis.satisSil(yok, 7), false);
  });

  it('detay: olmayan satış 404 "Satış bulunamadı"', async () => {
    await assert.rejects(servis.satisDetay(sahteDb(), 1), (h) => h.status === 404 && h.message === 'Satış bulunamadı');
  });
});
