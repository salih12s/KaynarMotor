/*
 * eszamanlilik: regression testleri (gerçek sunucu + gerçek MariaDB): eşzamanlı istekler stoğu bozmamalı.
 *
 * Kök neden: PUT/DELETE önceki durumu KİLİTSİZ okuyor (REPEATABLE READ anlık görüntüsü). İki istek aynı anda
 * gelirse ikincisi, birincinin commit'inden ÖNCEKİ satırları görür ve aynı iadeyi ikinci kez yapar.
 *
 * Her test bir DEĞİŞMEZ (invariant) doğrular: stok.mevcut = stok.giren − (kayıtlarda kalan toplam adet).
 * Yarış pencere dar olduğu için her senaryo birkaç kez tekrarlanır.
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat } = require('./yardimci');

const SON = Date.now().toString(36);
const num = (v) => Number(v);
let s,
  api,
  admin,
  sayac = 0;
const benzersiz = (onek) => `${onek}${SON}${++sayac}`;
const TEKRAR = 8;

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
});
after(() => s && s.durdur());

const yedekStok = async (giren) => {
  const kod = benzersiz('F5Y').slice(0, 19);
  const r = await api(
    'POST',
    '/api/yedek-parca-stok',
    { stok_kodu: kod, stok_adi: `Balata ${kod}`, giren_miktar: giren, alis_fiyati: 100, satis_fiyati: 250 },
    admin,
  );
  assert.equal(r.durum, 201);
  return { id: r.govde.id, kod, ad: `Balata ${kod}` };
};
const aksStok = async (giren) => {
  const kod = benzersiz('F5A').slice(0, 19);
  const r = await api(
    'POST',
    '/api/aksesuar-stok',
    { stok_kodu: kod, stok_adi: `Kask ${kod}`, giren_miktar: giren, alis_fiyati: 300, satis_fiyati: 700 },
    admin,
  );
  assert.equal(r.durum, 201);
  return { id: r.govde.id, kod, ad: `Kask ${kod}` };
};
const mevcutOku = async (yol, kod) => num((await api('GET', `${yol}/barkod/${kod}`, undefined, admin)).govde.mevcut);

describe('#34 iş emri PUT: eşzamanlı iki düzenleme stoğu kaydırmaz', () => {
  it(`stok = giren − kayıtlı parça adedi (${TEKRAR} tekrar)`, async () => {
    for (let i = 0; i < TEKRAR; i++) {
      const st = await yedekStok(20);
      const govde = (adet) => ({
        musteri_ad_soyad: benzersiz('Yarış '),
        durum: 'beklemede',
        parcalar: [{ parca_kodu: st.kod, takilan_parca: st.ad, adet, birim_fiyat: 250, maliyet: 100 }],
      });
      const olustur = await api('POST', '/api/is-emirleri', govde(2), admin);
      assert.equal(olustur.durum, 201);
      const id = olustur.govde.id;
      assert.equal(await mevcutOku('/api/yedek-parca-stok', st.kod), 18);

      // Aynı anda iki düzenleme: biri 3, diğeri 5 adet yazar.
      const [a, b] = await Promise.all([api('PUT', `/api/is-emirleri/${id}`, govde(3), admin), api('PUT', `/api/is-emirleri/${id}`, govde(5), admin)]);
      assert.equal(a.durum, 200);
      assert.equal(b.durum, 200);

      const son = (await api('GET', `/api/is-emirleri/${id}`, undefined, admin)).govde;
      const kayitliAdet = son.parcalar.reduce((t, p) => t + num(p.adet), 0);
      assert.equal(await mevcutOku('/api/yedek-parca-stok', st.kod), 20 - kayitliAdet, `tekrar ${i + 1}: kayıtlı adet ${kayitliAdet} iken stok tutmuyor`);
    }
  });
});

describe('#35 yedek parça satışı DELETE: eşzamanlı iki silme iadeyi iki kez yapmaz', () => {
  it(`stok başlangıç değerine döner, fazlasına çıkmaz (${TEKRAR} tekrar)`, async () => {
    for (let i = 0; i < TEKRAR; i++) {
      const st = await yedekStok(10);
      const sat = await api('POST', '/api/yedek-parcalar', { urun_adi: st.ad, alis_fiyati: 100, satis_fiyati: 500, stok_id: st.id, adet: 2 }, admin);
      assert.equal(sat.durum, 201);
      assert.equal(await mevcutOku('/api/yedek-parca-stok', st.kod), 8);

      const yanitlar = await Promise.all([1, 2, 3, 4].map(() => api('DELETE', `/api/yedek-parcalar/${sat.govde.id}`, undefined, admin)));
      assert.deepEqual(
        yanitlar.map((y) => y.durum).filter((d) => d >= 500),
        [],
        `tekrar ${i + 1}: sunucu hatası (500) döndü`,
      );
      assert.equal(await mevcutOku('/api/yedek-parca-stok', st.kod), 10, `tekrar ${i + 1}: iade iki kez yapılmış olabilir`);
    }
  });
});

describe('#36 aksesuar satışı PUT: eşzamanlı iki düzenleme stoğu kaydırmaz', () => {
  it(`stok = giren − kayıtlı adet (${TEKRAR} tekrar)`, async () => {
    for (let i = 0; i < TEKRAR; i++) {
      const st = await aksStok(20);
      const govde = (adet) => ({
        ad_soyad: benzersiz('Yarış '),
        durum: 'tamamlandi',
        parcalar: [{ stok_id: st.id, urun_adi: st.ad, adet, maliyet: 300, satis_fiyati: 700 }],
      });
      const sat = await api('POST', '/api/aksesuarlar', govde(2), admin);
      assert.equal(sat.durum, 201);
      const id = sat.govde.id;

      const [a, b] = await Promise.all([api('PUT', `/api/aksesuarlar/${id}`, govde(3), admin), api('PUT', `/api/aksesuarlar/${id}`, govde(5), admin)]);
      assert.equal(a.durum, 200);
      assert.equal(b.durum, 200);

      const son = (await api('GET', `/api/aksesuarlar/${id}`, undefined, admin)).govde;
      const kayitliAdet = son.parcalar.reduce((t, p) => t + num(p.adet), 0);
      assert.equal(await mevcutOku('/api/aksesuar-stok', st.kod), 20 - kayitliAdet, `tekrar ${i + 1}: kayıtlı adet ${kayitliAdet} iken stok tutmuyor`);
    }
  });
});
