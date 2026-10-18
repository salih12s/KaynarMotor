/*
 * Faz 4 regression testleri (gerçek sunucu + gerçek MariaDB). Bkz. YAPILACAKLAR-INCELEME.md
 *   #24  müşteri / stok / vitrin yazmaları aktivite günlüğüne düşer (kim, neyi); başarısız istek ve gövde yazılmaz
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat } = require('./yardimci');

const SON = Date.now().toString(36);
let s, api, admin, pool, sayac = 0;
const benzersiz = (onek) => `${onek}${SON}${++sayac}`;
const sql = async (q, p) => (await pool.query(q, p)).rows;
const bekle = (ms) => new Promise((c) => setTimeout(c, ms));

// Günlük yanıt bittikten SONRA yazılır: kayıt görünene kadar kısa süre bekle
const logBul = async (tablo, hedefId, tip) => {
  for (let i = 0; i < 20; i++) {
    const r = await sql('SELECT * FROM aktivite_log WHERE hedef_tablo = $1 AND hedef_id = $2 AND islem_tipi = $3', [tablo, hedefId, tip]);
    if (r.length) return r;
    await bekle(100);
  }
  return [];
};

before(async () => {
  s = await sunucuBaslat(); api = s.api; admin = s.admin;
  pool = require('../../core/veritabani/db').pool;
});
after(async () => { if (s) s.durdur(); if (pool) await pool.end(); });

describe('#24 denetim kaydı', () => {
  it('müşteri oluşturma, güncelleme ve silme kullanıcı + hedef kayıtla günlüğe yazılır', async () => {
    const telefon = '05' + String(Date.now()).slice(-9);
    const c = await api('POST', '/api/musteriler', { ad_soyad: benzersiz('F4 Musteri '), adres: 'x', telefon }, admin);
    assert.equal(c.durum, 201);
    const id = c.govde.id;

    const olustur = await logBul('musteriler', id, 'CREATE');
    assert.equal(olustur.length, 1);
    assert.equal(olustur[0].kullanici_adi, 'admin');
    assert.match(olustur[0].islem_detay, /^POST \/api\/musteriler/);
    // Gövde (telefon gibi kişisel veri) günlüğe KONMAZ
    assert.ok(!String(olustur[0].islem_detay).includes(telefon));

    assert.equal((await api('PUT', `/api/musteriler/${id}`, { ad_soyad: 'Guncel', adres: 'y', telefon }, admin)).durum, 200);
    assert.equal((await logBul('musteriler', id, 'UPDATE')).length, 1);

    assert.equal((await api('DELETE', `/api/musteriler/${id}`, undefined, admin)).durum, 200);
    assert.equal((await logBul('musteriler', id, 'DELETE')).length, 1);
  });

  it('başarısız istek (404) günlüğe yazılmaz', async () => {
    const onceki = (await sql("SELECT COUNT(*) AS n FROM aktivite_log WHERE hedef_tablo = 'musteriler' AND hedef_id = 987654"))[0].n;
    const r = await api('PUT', '/api/musteriler/987654', { ad_soyad: 'yok', adres: '', telefon: '' }, admin);
    assert.equal(r.durum, 404);
    await bekle(400);
    const sonraki = (await sql("SELECT COUNT(*) AS n FROM aktivite_log WHERE hedef_tablo = 'musteriler' AND hedef_id = 987654"))[0].n;
    assert.equal(Number(sonraki), Number(onceki));
  });

  it('aksesuar stok oluşturma günlüğe yazılır; geçersiz istek (400) yazılmaz', async () => {
    const kod = benzersiz('F4K');
    const c = await api('POST', '/api/aksesuar-stok', { stok_kodu: kod, stok_adi: 'F4 Urun', giren_miktar: 3, satis_fiyati: 10 }, admin);
    assert.equal(c.durum, 201);
    assert.equal((await logBul('aksesuar_stok', c.govde.id, 'CREATE')).length, 1);

    const once = (await sql("SELECT COUNT(*) AS n FROM aktivite_log WHERE hedef_tablo = 'aksesuar_stok' AND islem_tipi = 'CREATE'"))[0].n;
    assert.equal((await api('POST', '/api/aksesuar-stok', { stok_kodu: '', stok_adi: '' }, admin)).durum, 400);
    await bekle(400);
    const sonra = (await sql("SELECT COUNT(*) AS n FROM aktivite_log WHERE hedef_tablo = 'aksesuar_stok' AND islem_tipi = 'CREATE'"))[0].n;
    assert.equal(Number(sonra), Number(once));
  });

  it('yedek parça stok silme günlüğe yazılır', async () => {
    const c = await api('POST', '/api/yedek-parca-stok', { stok_kodu: benzersiz('F4Y'), stok_adi: 'F4 Parca', giren_miktar: 1, satis_fiyati: 5 }, admin);
    assert.equal(c.durum, 201);
    const id = c.govde.id;
    assert.equal((await api('DELETE', `/api/yedek-parca-stok/${id}`, undefined, admin)).durum, 200);
    assert.equal((await logBul('yedek_parca_stok', id, 'DELETE')).length, 1);
  });
});
