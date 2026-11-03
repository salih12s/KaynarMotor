/*
 * denetim-kullanici: regression testleri (gerçek sunucu + gerçek MariaDB): kullanıcı yönetimi günlüğü.
 *   - Yetki değişimi YETKI_DEGISTIR türüyle ve ESKİ → YENİ değerle yazılır (eskiden APPROVE etiketiyle, "yetkileri güncellendi" diye, değersiz).
 *   - Kullanıcı silme KULLANICI_SIL olarak günlüğe yazılır (eskiden hiç yazılmıyordu: kimin silindiği iz bırakmıyordu).
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat } = require('./yardimci');

const SON = Date.now().toString(36);
let s, api, admin, pool, kullaniciId, kullaniciAdi;

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
  pool = require('../../platform/database/db').pool;
  kullaniciAdi = `denetim_k_${SON}`;
  const k = await api('POST', '/api/auth/users', { kullanici_adi: kullaniciAdi, sifre: 'Gucluuu-sifre1', ad_soyad: 'Denetim Deneme', rol: 'personel' }, admin);
  assert.equal(k.durum, 201);
  kullaniciId = k.govde.id;
});
after(async () => {
  if (pool) await pool.end(); // açık kalırsa test süreci çıkmaz
  if (s) await s.durdur();
});

const loglar = async (tip, id) =>
  (
    await pool.query('SELECT islem_detay FROM aktivite_log WHERE hedef_tablo = $1 AND hedef_id = $2 AND islem_tipi = $3 ORDER BY id', ['kullanicilar', id, tip])
  ).rows.map((r) => r.islem_detay);

describe('yetki değişikliği günlüğü', () => {
  it('YETKI_DEGISTIR türüyle ve eski → yeni değerle yazılır; APPROVE etiketi kullanılmaz', async () => {
    const r = await api('PATCH', `/api/auth/users/${kullaniciId}/yetkiler`, { kar_gor: true, servis_yetkisi: true }, admin);
    assert.equal(r.durum, 200);
    const kayitlar = await loglar('YETKI_DEGISTIR', kullaniciId);
    assert.equal(kayitlar.length, 1, 'yetki değişimi tek kayıt olarak YETKI_DEGISTIR türünde yazılmalı');
    assert.match(kayitlar[0], /kar_gor: false → true/);
    assert.match(kayitlar[0], /servis_yetkisi: false → true/);
    assert.match(kayitlar[0], new RegExp(kullaniciAdi), 'hedef kullanıcı adı görünmeli');
    assert.deepEqual(await loglar('APPROVE', kullaniciId), [], 'yetki değişimi onay (APPROVE) olarak etiketlenmemeli');
  });

  it('aynı değerler yeniden yazılırsa "değişiklik yok" denir', async () => {
    const r = await api('PATCH', `/api/auth/users/${kullaniciId}/yetkiler`, { kar_gor: true }, admin);
    assert.equal(r.durum, 200);
    const kayitlar = await loglar('YETKI_DEGISTIR', kullaniciId);
    assert.match(kayitlar[kayitlar.length - 1], /değişiklik yok/);
  });
});

describe('kullanıcı silme günlüğü', () => {
  it('silme KULLANICI_SIL olarak kullanıcı adıyla yazılır', async () => {
    const r = await api('DELETE', `/api/auth/users/${kullaniciId}`, undefined, admin);
    assert.equal(r.durum, 200);
    const kayitlar = await loglar('KULLANICI_SIL', kullaniciId);
    assert.equal(kayitlar.length, 1, 'silme günlüğe yazılmalı');
    assert.match(kayitlar[0], new RegExp(`#${kullaniciId} \\(${kullaniciAdi}\\) silindi`));
  });
});
