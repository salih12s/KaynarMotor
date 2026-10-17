/*
 * Faz 7 regression testleri (gerçek sunucu + gerçek MariaDB): denetim izi ve rapor tutarlılığı.
 *
 *   #41 aksesuar satışı düzenleme/silme aktivite günlüğüne düşer
 *   #42 e-ticaret satışı ve platform değişiklikleri aktivite günlüğüne düşer
 *   #43 doğrudan "tamamlandı" kaydedilen iş emri tamamlama tarihi alır ve günlük raporda görünür
 *   #44 aralık raporu bekleyen (tamamlanmamış) aksesuar satışını gelire katmaz
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat } = require('./yardimci');

const SON = Date.now().toString(36);
let s, api, admin, pool, sayac = 0;
const benzersiz = (onek) => `${onek}${SON}${++sayac}`;
const sql = async (q, p) => (await pool.query(q, p)).rows;
const bekle = (ms) => new Promise((c) => setTimeout(c, ms));
const bugunUtc = () => new Date().toISOString().slice(0, 10);

// Günlük işlemden sonra yazılabilir: kayıt görünene kadar kısa süre bekle
const logBul = async (tablo, hedefId, tip) => {
  for (let i = 0; i < 20; i++) {
    const r = await sql('SELECT * FROM aktivite_log WHERE hedef_tablo = $1 AND hedef_id = $2 AND islem_tipi = $3', [tablo, hedefId, tip]);
    if (r.length) return r;
    await bekle(100);
  }
  return [];
};
const logSay = async (tablo, hedefId) => Number((await sql('SELECT COUNT(*) AS n FROM aktivite_log WHERE hedef_tablo = $1 AND hedef_id = $2', [tablo, hedefId]))[0].n);

before(async () => { s = await sunucuBaslat(); api = s.api; admin = s.admin; pool = require('../../core/db').pool; });
after(async () => { if (s) s.durdur(); if (pool) await pool.end(); });

describe('#41 aksesuar satışı düzenleme ve silme günlüğe düşer', () => {
  it('PUT → AKSESUAR_GUNCELLE, DELETE → AKSESUAR_SIL (kim + hangi kayıt); olmayan kayıt günlüğe yazılmaz', async () => {
    const c = await api('POST', '/api/aksesuarlar', { ad_soyad: benzersiz('F7 '), durum: 'beklemede', parcalar: [] }, admin);
    assert.equal(c.durum, 201);
    const id = c.govde.id;
    assert.equal((await api('PUT', `/api/aksesuarlar/${id}`, { ad_soyad: 'Guncel', durum: 'beklemede', parcalar: [] }, admin)).durum, 200);
    const g = await logBul('aksesuarlar', id, 'AKSESUAR_GUNCELLE');
    assert.equal(g.length, 1);
    assert.equal(g[0].kullanici_adi, 'admin');
    assert.equal((await api('DELETE', `/api/aksesuarlar/${id}`, undefined, admin)).durum, 200);
    assert.equal((await logBul('aksesuarlar', id, 'AKSESUAR_SIL')).length, 1);

    assert.equal((await api('DELETE', '/api/aksesuarlar/987655', undefined, admin)).durum, 200);
    await bekle(300);
    assert.equal(await logSay('aksesuarlar', 987655), 0, 'olmayan kayıt için günlük yazılmamalı');
  });
});

describe('#42 e-ticaret satışı ve platform değişiklikleri günlüğe düşer', () => {
  it('satış PUT/DELETE ve platform POST/PUT/DELETE iz bırakır', async () => {
    const c = await api('POST', '/api/eticaret', { urun_adi: benzersiz('F7 urun '), alis_fiyati: 100, satis_fiyati: 200, komisyon_orani: 10, adet: 1, tarih: '2026-10-01' }, admin);
    assert.equal(c.durum, 201);
    const id = c.govde.id;
    assert.equal((await api('PUT', `/api/eticaret/${id}`, { urun_adi: 'Guncel', alis_fiyati: 100, satis_fiyati: 250, komisyon_orani: 10, adet: 1, tarih: '2026-10-01' }, admin)).durum, 200);
    assert.equal((await logBul('eticaret_satislar', id, 'ETICARET_SATIS_GUNCELLE')).length, 1);
    assert.equal((await api('DELETE', `/api/eticaret/${id}`, undefined, admin)).durum, 200);
    assert.equal((await logBul('eticaret_satislar', id, 'ETICARET_SATIS_SIL')).length, 1);

    const p = await api('POST', '/api/eticaret/platformlar', { platform_adi: benzersiz('F7 Platform '), komisyon_orani: 12 }, admin);
    assert.equal(p.durum, 201);
    const pid = p.govde.id;
    assert.equal((await logBul('eticaret_platformlar', pid, 'CREATE')).length, 1);
    assert.equal((await api('PUT', `/api/eticaret/platformlar/${pid}`, { platform_adi: benzersiz('F7 Platform '), komisyon_orani: 15 }, admin)).durum, 200);
    assert.equal((await logBul('eticaret_platformlar', pid, 'UPDATE')).length, 1);
    assert.equal((await api('DELETE', `/api/eticaret/platformlar/${pid}`, undefined, admin)).durum, 200);
    assert.equal((await logBul('eticaret_platformlar', pid, 'DELETE')).length, 1);
  });
});

describe('#43 doğrudan "tamamlandı" iş emri tamamlama tarihi alır', () => {
  it('tamamlama_tarihi dolu gelir ve günlük raporda görünür; beklemedeki iş emri tarih almaz', async () => {
    const tamam = await api('POST', '/api/is-emirleri', { musteri_ad_soyad: benzersiz('F7 '), durum: 'tamamlandi', parcalar: [] }, admin);
    const bekleyen = await api('POST', '/api/is-emirleri', { musteri_ad_soyad: benzersiz('F7 '), durum: 'beklemede', parcalar: [] }, admin);
    assert.equal(tamam.durum, 201); assert.equal(bekleyen.durum, 201);
    assert.ok(tamam.govde.tamamlama_tarihi, 'tamamlandı olarak açılan iş emrinde tamamlama_tarihi boş kalmamalı');
    assert.equal(bekleyen.govde.tamamlama_tarihi, null);

    const rapor = await api('GET', `/api/raporlar/gunluk?tarih=${bugunUtc()}`, undefined, admin);
    assert.equal(rapor.durum, 200);
    const idler = rapor.govde.is_emirleri.kayitlar.map((r) => r.id);
    assert.ok(idler.includes(tamam.govde.id), 'günlük rapor tamamlanan iş emrini göstermeli');
    assert.ok(!idler.includes(bekleyen.govde.id));
  });
});

describe('#44 aralık raporu bekleyen aksesuar satışını gelire katmaz', () => {
  it('yalnız durumu "tamamlandı" olan aksesuar satışı rapora girer', async () => {
    const parca = [{ urun_adi: 'Rapor kalemi', adet: 1, maliyet: 100, satis_fiyati: 300 }];
    const bek = await api('POST', '/api/aksesuarlar', { ad_soyad: benzersiz('F7 bek '), durum: 'beklemede', parcalar: parca }, admin);
    const tam = await api('POST', '/api/aksesuarlar', { ad_soyad: benzersiz('F7 tam '), durum: 'tamamlandi', parcalar: parca }, admin);
    assert.equal(bek.durum, 201); assert.equal(tam.durum, 201);
    const gun = bugunUtc();
    const r = await api('GET', `/api/raporlar/aralik?baslangic=${gun}&bitis=${gun}`, undefined, admin);
    assert.equal(r.durum, 200);
    const idler = r.govde.aksesuarlar.map((a) => a.id);
    assert.ok(idler.includes(tam.govde.id), 'tamamlanan satış raporda olmalı');
    assert.ok(!idler.includes(bek.govde.id), 'bekleyen satış raporda olmamalı');
  });
});
