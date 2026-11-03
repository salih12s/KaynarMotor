/*
 * arama-joker: regression testleri (gerçek sunucu + gerçek MariaDB): aramada yazılan `%` ve `_` joker değil düz karakterdir.
 * Eskiden `/musteriler/ara/%` bütün kayıtları (ilk 20) döndürüyordu; stok ve vitrin aramalarında da aynı.
 *
 * Değişmez: joker olmayan bir metinle arayınca dönen HER satırda o metin harfi harfine geçer.
 * (Test veritabanı koşulardan koşuya birikir; bu yüzden "şu kayıt dönmesin" değil bu değişmez sınanır.)
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat } = require('./yardimci');

const SON = Date.now().toString(36);
let s,
  api,
  admin,
  sayac = 0;
const benzersiz = (onek) => `${onek}${SON}${++sayac}`;

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
});
after(() => s && s.durdur());

const ara = (yol, q) => api('GET', `${yol}${encodeURIComponent(q)}`, undefined, admin);
const icerir = (satir, alanlar, metin) =>
  alanlar.some((a) =>
    String(satir[a] ?? '')
      .toLowerCase()
      .includes(metin.toLowerCase()),
  );

describe('müşteri araması: % ve _ düz karakter', () => {
  const ALANLAR = ['ad_soyad', 'telefon'];
  let on;
  before(async () => {
    on = benzersiz('Joker ');
    for (const ad of [`${on} yüzde%pamuk`, `${on}aX1`, `${on}bX1`]) {
      const r = await api('POST', '/api/musteriler', { ad_soyad: ad, telefon: '05550000003' }, admin);
      assert.equal(r.durum, 201);
    }
  });

  for (const metin of ['%', '_', '%%', 'a%']) {
    it(`"${metin}" araması yalnız bu karakteri içeren kayıtları döndürür`, async () => {
      const r = await ara('/api/musteriler/ara/', metin);
      assert.equal(r.durum, 200);
      for (const m of r.govde) assert.ok(icerir(m, ALANLAR, metin), `"${metin}" ile ilgisiz kayıt döndü: ${m.ad_soyad}`);
    });
  }

  it('gerçek % içeren ad, % yazılarak bulunur', async () => {
    const r = await ara('/api/musteriler/ara/', `${on} yüzde%`);
    assert.ok(r.govde.some((m) => m.ad_soyad === `${on} yüzde%pamuk`));
  });

  it('_ tek karakter jokeri değildir: "aX1" ile "bX1" arasındaki harf yerine _ yazılınca ikisi de bulunmaz', async () => {
    const r = await ara('/api/musteriler/ara/', `${on}_X1`);
    assert.equal(r.govde.length, 0);
  });
});

describe('stok aramaları: % ve _ düz karakter', () => {
  for (const [ad, yol] of [
    ['aksesuar stoğu', '/api/aksesuar-stok/ara?q='],
    ['yedek parça stoğu', '/api/yedek-parca-stok/ara?q='],
  ]) {
    it(`${ad}: "%%" ve "__" aramaları ilgisiz kayıt döndürmez`, async () => {
      for (const metin of ['%%', '__']) {
        const r = await ara(yol, metin);
        assert.equal(r.durum, 200);
        for (const x of r.govde) assert.ok(icerir(x, ['stok_kodu', 'stok_adi', 'marka'], metin), `"${metin}" ile ilgisiz kayıt döndü: ${x.stok_adi}`);
      }
    });
  }
});

describe('vitrin ilan araması: % ve _ düz karakter', () => {
  it('"%%" ve "__" aramaları ilgisiz ilan döndürmez', async () => {
    for (const metin of ['%%', '__']) {
      const r = await api('GET', `/api/vitrin?kategori=motor&q=${encodeURIComponent(metin)}`);
      assert.equal(r.durum, 200);
      for (const x of r.govde) assert.ok(icerir(x, ['baslik', 'aciklama', 'marka', 'model'], metin), `"${metin}" ile ilgisiz ilan döndü: ${x.baslik}`);
    }
  });
});
