/*
 * rapor-gunu-turkiye: regression testleri (gerçek sunucu + gerçek MariaDB): rapor günü TÜRKİYE takvim günüdür.
 * Veritabanı DATETIME kolonlarını UTC saklar (oturum +00:00); rapor filtresi `DATE(tamamlama_tarihi)` ile UTC gününe bakıyordu: Türkiye saatiyle
 * 00:00-03:00 arası tamamlanan iş bir önceki günün raporuna düşüyordu, oysa arayüz tarihi Türkiye gününe göre gönderir.
 * Türkiye 2016'dan beri sabit UTC+3'tür (yaz saati yok).
 *
 *   UTC 2031-03-14 22:30:00 = TR 2031-03-15 01:30   → 15 Mart raporunda
 *   UTC 2031-03-15 20:59:59 = TR 2031-03-15 23:59:59 → 15 Mart raporunda (günün son saniyesi)
 *   UTC 2031-03-15 21:00:00 = TR 2031-03-16 00:00:00 → 16 Mart raporunda (gece yarısı)
 * Tarihler 2031: test veritabanı koşulardan koşuya birikir, başka kayıtlarla karışmasın.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat } = require('./yardimci');

const SON = Date.now().toString(36);
let s,
  api,
  admin,
  pool,
  sayac = 0;
const ids = {};

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
  pool = require('../../platform/database/db').pool;
  const kur = async (ad, utc) => {
    const r = await api('POST', '/api/is-emirleri', { musteri_ad_soyad: `Rapor ${ad} ${SON}${++sayac}`, durum: 'tamamlandi', parcalar: [] }, admin);
    assert.equal(r.durum, 201, JSON.stringify(r.govde));
    await pool.query('UPDATE is_emirleri SET tamamlama_tarihi = $1 WHERE id = $2', [utc, r.govde.id]);
    return r.govde.id;
  };
  ids.gece = await kur('gece', '2031-03-14 22:30:00'); // TR 15 Mart 01:30
  ids.sonSaniye = await kur('son saniye', '2031-03-15 20:59:59'); // TR 15 Mart 23:59:59
  ids.geceYarisi = await kur('gece yarisi', '2031-03-15 21:00:00'); // TR 16 Mart 00:00:00
});
after(async () => {
  if (pool) {
    await pool.query('DELETE FROM is_emirleri WHERE id IN ($1, $2, $3)', [ids.gece, ids.sonSaniye, ids.geceYarisi]);
    await pool.end(); // açık kalırsa test süreci çıkmaz
  }
  if (s) await s.durdur();
});

const gunluk = async (tarih) => (await api('GET', `/api/raporlar/gunluk?tarih=${tarih}`, undefined, admin)).govde.is_emirleri.kayitlar.map((k) => k.id);
const aralik = async (b, e) => (await api('GET', `/api/raporlar/aralik?baslangic=${b}&bitis=${e}`, undefined, admin)).govde.isEmirleri.map((k) => k.id);

describe('günlük rapor: Türkiye günü', () => {
  it('TR 01:30 (UTC önceki gün) o günün raporunda; UTC günündeki rapora DÜŞMEZ', async () => {
    assert.ok((await gunluk('2031-03-15')).includes(ids.gece), '15 Mart raporunda olmalı');
    assert.ok(!(await gunluk('2031-03-14')).includes(ids.gece), '14 Mart raporunda olmamalı (eskiden UTC günü olduğu için orada çıkıyordu)');
  });

  it('günün son saniyesi (TR 23:59:59) o günde, ertesi güne taşmaz', async () => {
    assert.ok((await gunluk('2031-03-15')).includes(ids.sonSaniye));
    assert.ok(!(await gunluk('2031-03-16')).includes(ids.sonSaniye));
  });

  it('TR gece yarısı (00:00:00) yeni günün ilk kaydıdır', async () => {
    assert.ok((await gunluk('2031-03-16')).includes(ids.geceYarisi));
    assert.ok(!(await gunluk('2031-03-15')).includes(ids.geceYarisi));
  });
});

describe('aralık rapor: Türkiye günü (günlükle aynı sınırlar)', () => {
  it('tek günlük aralık günlük raporla aynı kayıtları verir', async () => {
    const a15 = await aralik('2031-03-15', '2031-03-15');
    assert.ok(a15.includes(ids.gece) && a15.includes(ids.sonSaniye) && !a15.includes(ids.geceYarisi));
    const a16 = await aralik('2031-03-16', '2031-03-16');
    assert.ok(a16.includes(ids.geceYarisi) && !a16.includes(ids.gece) && !a16.includes(ids.sonSaniye));
  });

  it('iki günü kapsayan aralık üçünü de içerir', async () => {
    const a = await aralik('2031-03-15', '2031-03-16');
    for (const id of [ids.gece, ids.sonSaniye, ids.geceYarisi]) assert.ok(a.includes(id), `#${id} aralıkta olmalı`);
  });
});
