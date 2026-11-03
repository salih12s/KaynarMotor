/*
 * admin-korumasi: regression testleri (gerçek sunucu + gerçek MariaDB). Arayüz admin satırında "Sil" düğmesini gizler ve "Reddet"i
 * yalnız bekleyen hesapta gösterir; kural yalnız arayüzdeydi, API ile admin hesabı silinebilir ya da reddedilip girişi kapatılabilirdi.
 * Güvenlik sunucudadır: aynı kural sunucuda da uygulanır. Test, kendi ikinci admin satırını veritabanına doğrudan ekler (API ikinci admin
 * oluşturamaz) ve sonunda siler.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat } = require('./yardimci');

const SON = Date.now().toString(36);
let s,
  api,
  admin,
  pool,
  ikinciAdminId;

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
  pool = require('../../core/veritabani/db').pool;
  const r = await pool.query(
    `INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad, rol, onay_durumu) VALUES ($1, 'x', 'Koruma Admin', 'admin', 'onaylandi') RETURNING id`,
    [`admin_koruma_${SON}`],
  );
  ikinciAdminId = r.rows[0].id;
});
after(async () => {
  if (pool && ikinciAdminId) await pool.query('DELETE FROM kullanicilar WHERE id = $1', [ikinciAdminId]);
  if (s) await s.durdur();
  if (pool) await pool.end(); // açık kalırsa test süreci çıkmaz
});

const satir = async (id) => (await pool.query('SELECT id, rol, onay_durumu FROM kullanicilar WHERE id = $1', [id])).rows[0];

describe('admin hesabı korunur', () => {
  it('başka bir admin DELETE ile silinemez: 400 ve kayıt durur', async () => {
    const r = await api('DELETE', `/api/auth/users/${ikinciAdminId}`, undefined, admin);
    assert.equal(r.durum, 400);
    assert.equal(r.govde.message, 'Admin hesabı silinemez');
    assert.ok(await satir(ikinciAdminId), 'admin kaydı silinmemeli');
  });

  it('başka bir admin reddedilemez: 400 ve onay durumu değişmez', async () => {
    const r = await api('PATCH', `/api/auth/users/${ikinciAdminId}/reject`, undefined, admin);
    assert.equal(r.durum, 400);
    assert.equal(r.govde.message, 'Admin hesabı reddedilemez');
    assert.equal((await satir(ikinciAdminId)).onay_durumu, 'onaylandi');
  });

  it('admin olmayan hesap hâlâ silinebilir (koruma yalnız admin için)', async () => {
    const ad = `koruma_personel_${SON}`;
    const k = await api('POST', '/api/auth/users', { kullanici_adi: ad, sifre: 'Gucluuu-sifre1', ad_soyad: 'Silinecek', rol: 'personel' }, admin);
    assert.equal(k.durum, 201);
    const r = await api('DELETE', `/api/auth/users/${k.govde.id}`, undefined, admin);
    assert.equal(r.durum, 200);
    assert.equal(await satir(k.govde.id), undefined);
  });
});
