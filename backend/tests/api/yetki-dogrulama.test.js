/*
 * yetki-dogrulama: regression testleri (gerçek sunucu + gerçek MariaDB): rol ve yetki bayrağı girdileri açıkça doğrulanır.
 *   - Bilinmeyen rol (admin dahil) sessizce "personel" olmaz: 400.
 *   - Yetki bayrağı "false" metni yetki VERMEZ (eskiden `!!"false"` doğruydu); anlaşılmayan değer 400.
 *   - Olmayan kullanıcıya yetki yazımı 404; aynı değeri yeniden yazmak 404 DEĞİL (UPDATE eşleşen satırı sayar).
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat } = require('./yardimci');

const SON = Date.now().toString(36);
let s,
  api,
  admin,
  kullaniciId;

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
  const k = await api('POST', '/api/auth/users', { kullanici_adi: `yetki_dogrula_${SON}`, sifre: 'Gucluuu-sifre1', ad_soyad: 'Yetki Deneme', rol: 'personel' }, admin);
  assert.equal(k.durum, 201);
  kullaniciId = k.govde.id;
});
after(async () => {
  if (kullaniciId) await api('DELETE', `/api/auth/users/${kullaniciId}`, undefined, admin);
  if (s) await s.durdur();
});

const yetki = async (alan) => (await api('GET', '/api/auth/users', undefined, admin)).govde.find((k) => k.id === kullaniciId)[alan];
const yaz = (govde, id = kullaniciId) => api('PATCH', `/api/auth/users/${id}/yetkiler`, govde, admin);

describe('rol doğrulama', () => {
  for (const rol of ['admin', 'x']) {
    it(`"${rol}" rolüyle kullanıcı oluşturulamaz: 400 "Geçersiz rol"`, async () => {
      const r = await api('POST', '/api/auth/users', { kullanici_adi: `rol_${rol}_${SON}`, sifre: 'Gucluuu-sifre1', ad_soyad: 'X', rol }, admin);
      assert.equal(r.durum, 400);
      assert.equal(r.govde.message, 'Geçersiz rol');
    });
  }
});

describe('yetki bayrağı doğrulama', () => {
  it('"false" metni yetki vermez; "true" metni verir', async () => {
    assert.equal((await yaz({ motor_satis_gor: 'true' })).durum, 200);
    assert.equal(await yetki('motor_satis_gor'), true);
    assert.equal((await yaz({ motor_satis_gor: 'false' })).durum, 200);
    assert.equal(await yetki('motor_satis_gor'), false, '"false" metni yetkiyi kapatmalı, açık bırakmamalı');
  });

  it('anlaşılmayan değer 400 ve mevcut yetki değişmez', async () => {
    await yaz({ servis_yetkisi: true });
    const r = await yaz({ servis_yetkisi: 'evet' });
    assert.equal(r.durum, 400);
    assert.equal(await yetki('servis_yetkisi'), true);
  });

  it('aynı değeri iki kez yazmak 200 (değişmeyen satır "bulunamadı" sayılmaz)', async () => {
    assert.equal((await yaz({ kar_gor: true })).durum, 200);
    assert.equal((await yaz({ kar_gor: true })).durum, 200);
  });

  it('olmayan kullanıcıya yetki yazımı 404', async () => {
    const r = await yaz({ kar_gor: true }, 99999999);
    assert.equal(r.durum, 404);
    assert.equal(r.govde.message, 'Kullanıcı bulunamadı');
  });
});
