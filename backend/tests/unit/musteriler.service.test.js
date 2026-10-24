/*
 * Müşteri servisinin iş kuralları (sahte veritabanıyla, sunucu/MariaDB yok).
 *   - Otomatik müşteri kaydı mevcut kaydı ASLA ezmez, yalnızca boş alanları doldurur.
 *   - Telefon verilmiş ama eşleşmediyse ada bakılmaz (aynı adlı başka kişi olabilir).
 *   - Silme: iş emri bağlantısı boşaltılır + müşteri silinir, tek transaction'da.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sahteDb } = require('./sahteDb');
const servis = require('../../modules/musteriler/musteriler.service');

const VAR_MI = (db, parca) => db.cagrilar.some((c) => c.sql.includes(parca));

describe('doldurulacakAlanlar (saf kural)', () => {
  it('dolu kayıt değişmez: hiçbir alan doldurulmaz', () => {
    const mevcut = { ad_soyad: 'Ali Veli', telefon: '05551112233', adres: 'Adres 1' };
    assert.deepEqual(servis.doldurulacakAlanlar(mevcut, 'Başka Ad', '05329998877', 'Başka Adres'), []);
  });

  it('yalnızca boş olan alanlar doldurulur; dolu olan ezilmez', () => {
    const mevcut = { ad_soyad: 'Ali Veli', telefon: null, adres: '  ' };
    assert.deepEqual(servis.doldurulacakAlanlar(mevcut, 'Başka Ad', '05329998877', 'Yeni Adres'), [
      ['telefon', '05329998877'],
      ['adres', 'Yeni Adres'],
    ]);
  });

  it('gelen telefon/adres boşsa boş alan doldurulmaz', () => {
    const mevcut = { ad_soyad: 'Ali', telefon: null, adres: null };
    assert.deepEqual(servis.doldurulacakAlanlar(mevcut, 'Ali', '', ''), []);
  });
});

describe('upsertMusteri', () => {
  it('boş ad: kayıt açılmaz, veritabanına dokunulmaz', async () => {
    const db = sahteDb();
    assert.equal(await servis.upsertMusteri('   ', '05551112233', 'x', db), null);
    assert.equal(await servis.upsertMusteri(null, null, null, db), null);
    assert.equal(db.cagrilar.length, 0);
  });

  it('telefondan bulunan DOLU kayıt değişmez (UPDATE yok), id döner', async () => {
    const db = sahteDb([['REGEXP_REPLACE', [{ id: 7, ad_soyad: 'Ali Veli', telefon: '05551112233', adres: 'Adres 1' }]]]);
    assert.equal(await servis.upsertMusteri('Başka Ad', '0555 111 22 33', 'Başka Adres', db), 7);
    assert.equal(VAR_MI(db, 'UPDATE musteriler'), false);
    assert.equal(VAR_MI(db, 'INSERT'), false);
  });

  it('bulunan kaydın yalnızca BOŞ adresi doldurulur, adı ezilmez', async () => {
    const db = sahteDb([['REGEXP_REPLACE', [{ id: 7, ad_soyad: 'Ali Veli', telefon: '05551112233', adres: null }]]]);
    assert.equal(await servis.upsertMusteri('Başka Ad', '05551112233', 'Yeni Adres', db), 7);
    const guncelleme = db.cagrilar.find((c) => c.sql.includes('UPDATE musteriler'));
    assert.ok(guncelleme, 'boş adres için UPDATE beklenir');
    assert.match(guncelleme.sql, /adres = \$1/);
    assert.doesNotMatch(guncelleme.sql, /ad_soyad =/, 'dolu ad ezilmemeli');
    assert.deepEqual(guncelleme.params, ['Yeni Adres', 7]);
  });

  it('telefon VAR ama eşleşmedi: ada BAKILMAZ, yeni müşteri açılır (aynı adlı başka kişi olabilir)', async () => {
    const db = sahteDb([['INSERT INTO musteriler', [{ id: 99 }]]]);
    assert.equal(await servis.upsertMusteri('Ahmet Yılmaz', '05551112233', null, db), 99);
    assert.equal(VAR_MI(db, 'LOWER(ad_soyad) = LOWER'), false, 'ada göre arama yapılmamalı');
    const ekleme = db.cagrilar.find((c) => c.sql.includes('INSERT INTO musteriler'));
    assert.deepEqual(ekleme.params, ['Ahmet Yılmaz', '05551112233', null]);
  });

  it('telefon yoksa ada göre bulunur', async () => {
    const db = sahteDb([['LOWER(ad_soyad) = LOWER', [{ id: 5, ad_soyad: 'Ahmet Yılmaz', telefon: null, adres: null }]]]);
    assert.equal(await servis.upsertMusteri('ahmet yılmaz', '', null, db), 5);
    assert.equal(VAR_MI(db, 'INSERT'), false);
  });

  it('veritabanı hatası yutulur: null döner, ana işlemi (satış/servis) bozmaz', async () => {
    const db = sahteDb([['SELECT', new Error('bağlantı koptu')]]);
    const asilKonsol = console.error;
    console.error = () => {}; // beklenen hata günlüğü test çıktısını kirletmesin
    try {
      assert.equal(await servis.upsertMusteri('Ali', null, null, db), null);
    } finally {
      console.error = asilKonsol;
    }
  });
});

describe('telefonaGoreBul', () => {
  it('çok kısa ya da boş numara: sorgu yapılmadan null', async () => {
    const db = sahteDb();
    assert.equal(await servis.telefonaGoreBul(db, ''), null);
    assert.equal(await servis.telefonaGoreBul(db, '12345'), null);
    assert.equal(db.cagrilar.length, 0);
  });

  it('numaranın SON 10 hanesiyle aranır (başındaki 0 / +90 fark etmez)', async () => {
    const db = sahteDb([['REGEXP_REPLACE', [{ id: 3, ad_soyad: 'X' }]]]);
    const sonuc = await servis.telefonaGoreBul(db, '+90 (555) 111 22 33');
    assert.equal(sonuc.id, 3);
    assert.deepEqual(db.cagrilar[0].params, ['5551112233']);
  });
});

describe('detay ve sil', () => {
  it('olmayan müşteri: 404 BulunamadiHatasi (HTTP bilmeden)', async () => {
    const db = sahteDb();
    await assert.rejects(servis.detay(db, 123), (h) => h.status === 404 && h.message === 'Müşteri bulunamadı');
  });

  it('sil: iş emri bağlantısı boşaltılır SONRA müşteri silinir, tek transaction (COMMIT)', async () => {
    const db = sahteDb();
    await servis.sil(db, 42);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
    assert.match(db.cagrilar[0].sql, /UPDATE is_emirleri SET musteri_id = NULL/);
    assert.match(db.cagrilar[1].sql, /DELETE FROM musteriler/);
    assert.deepEqual(
      db.cagrilar.map((c) => c.params),
      [[42], [42]],
    );
  });

  it('sil: ikinci adım patlarsa ROLLBACK ve hata yukarı iletilir', async () => {
    const db = sahteDb([['DELETE FROM musteriler', new Error('FK ihlali')]]);
    await assert.rejects(servis.sil(db, 42), /FK ihlali/);
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });
});
