/*
 * denetim-degisiklik: regression testleri (gerçek sunucu + gerçek MariaDB): fiyat/yatırımcı değişikliği günlüğe ESKİ → YENİ değerle yazılır.
 * Eskiden günlük yalnız "2. El Motor #N güncellendi" yazıyordu; alış fiyatı 500.000 → 1 yapılınca kâr bozuluyor ama kimin neyi değiştirdiği
 * sonradan anlaşılamıyordu (E06/E10). Kişisel veri (alıcı adı, TC) günlüğe YAZILMAZ.
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
const benzersiz = (onek) => `${onek}${SON}${++sayac}`;

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
  pool = require('../../platform/database/db').pool;
});
after(async () => {
  if (pool) await pool.end(); // açık kalırsa test süreci çıkmaz
  if (s) await s.durdur();
});

const sonLog = async (tablo, id, tip) =>
  (
    await pool.query('SELECT islem_detay FROM aktivite_log WHERE hedef_tablo = $1 AND hedef_id = $2 AND islem_tipi = $3 ORDER BY id DESC LIMIT 1', [
      tablo,
      id,
      tip,
    ])
  ).rows[0]?.islem_detay;

describe('motor güncelleme günlüğü: eski → yeni', () => {
  it('alış ve satış fiyatı değişince günlükte alan, eski ve yeni değer yazar; kişisel veri yazmaz', async () => {
    const plaka = benzersiz('34DG').slice(0, 15).toUpperCase();
    const c = await api(
      'POST',
      '/api/ikinci-el-motor',
      { plaka, marka: 'Test', model: 'Iz', durum: 'stokta', alis_fiyati: 500000, satis_fiyati: 650000, alici_adi: 'Gizli Alıcı', alici_tc: '11122233344' },
      admin,
    );
    assert.equal(c.durum, 201, JSON.stringify(c.govde));
    const id = c.govde.id;

    const put = await api('PUT', `/api/ikinci-el-motor/${id}`, { alis_fiyati: 1, satis_fiyati: 650000 }, admin);
    assert.equal(put.durum, 200, JSON.stringify(put.govde));

    const detay = await sonLog('ikinci_el_motorlar', id, 'MOTOR_SATIS_GUNCELLE');
    assert.ok(detay, 'güncelleme günlüğe yazılmalı');
    assert.match(detay, /alis_fiyati: 500000(\.00)? → 1(\.00)?/, `alış fiyatı değişimi görünmeli: ${detay}`);
    assert.ok(!/satis_fiyati/.test(detay), `değişmeyen alan yazılmamalı: ${detay}`);
    assert.ok(!/Gizli|11122233344/.test(detay), `kişisel veri günlüğe sızmamalı: ${detay}`);
  });

  it('hiçbir izlenen alan değişmediyse ek metin yok (eski biçim korunur)', async () => {
    const plaka = benzersiz('34DH').slice(0, 15).toUpperCase();
    const c = await api('POST', '/api/ikinci-el-motor', { plaka, marka: 'Test', model: 'Iz2', durum: 'stokta', alis_fiyati: 1000 }, admin);
    assert.equal(c.durum, 201);
    const id = c.govde.id;
    assert.equal((await api('PUT', `/api/ikinci-el-motor/${id}`, { marka: 'Test2' }, admin)).durum, 200);
    assert.equal(await sonLog('ikinci_el_motorlar', id, 'MOTOR_SATIS_GUNCELLE'), `2. El Motor #${id} güncellendi`);
  });
});
