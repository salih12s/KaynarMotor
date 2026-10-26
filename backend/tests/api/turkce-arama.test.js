/*
 * Gerçek sunucu + gerçek MariaDB: sunucu tarafı aramalar Türkçe harfe duyarlıdır.
 * Regression: `LOWER(kolon) LIKE LOWER(?)` büyük "I" harfini noktalı "i"ye çevirir ("YILMAZ" -> "yilmaz"), oysa kayıtlı ad "Yılmaz"
 * (noktasız ı) olabilir; eskiden "Ayşe Yılmaz" kaydı "YILMAZ" aramasında bulunmuyordu. Aranan ve kolon tarafı ı/I/İ/i farkını yok sayar.
 *
 *   müşteri araması, aksesuar stok araması, yedek parça stok araması, vitrin ilan araması
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

describe('müşteri araması: Türkçe I/ı', () => {
  let ad;
  before(async () => {
    // benzersiz önek aramayı bu teste özgü yapar; "Yılmaz" noktasız ı ile kayıtlı
    ad = benzersiz('Tarçın ');
    const r = await api('POST', '/api/musteriler', { ad_soyad: `${ad} Yılmaz`, telefon: '05550000001' }, admin);
    assert.equal(r.durum, 201);
  });

  for (const sorgu of ['YILMAZ', 'yılmaz', 'yilmaz', 'Yılmaz']) {
    it(`"${sorgu}" araması kaydı bulur`, async () => {
      const r = await ara('/api/musteriler/ara/', `${sorgu}`);
      assert.equal(r.durum, 200);
      assert.ok(
        r.govde.some((m) => m.ad_soyad === `${ad} Yılmaz`),
        `"${sorgu}" ile ${ad} bulunmadı`,
      );
    });
  }

  it('büyük harfle kayıtlı ad küçük harfle aranınca bulunur', async () => {
    const buyuk = benzersiz('ISPARTA ');
    const e = await api('POST', '/api/musteriler', { ad_soyad: `${buyuk} IŞIK`, telefon: '05550000002' }, admin);
    assert.equal(e.durum, 201);
    const r = await ara('/api/musteriler/ara/', 'ışık');
    assert.ok(r.govde.some((m) => m.ad_soyad === `${buyuk} IŞIK`));
  });

  it('alakasız metin bulunmaz', async () => {
    const r = await ara('/api/musteriler/ara/', `${ad} Demir`);
    assert.equal(r.govde.length, 0);
  });
});

describe('stok aramaları: Türkçe I/ı', () => {
  it('aksesuar stoğu: "Işık Kask" kaydı küçük ve büyük harfli aramada bulunur', async () => {
    const kod = benzersiz('TA').slice(0, 19);
    const ad = benzersiz('Işık Kask ');
    const e = await api('POST', '/api/aksesuar-stok', { stok_kodu: kod, stok_adi: ad, giren_miktar: 1, satis_fiyati: 100 }, admin);
    assert.equal(e.durum, 201);
    for (const q of ['ışık kask', 'IŞIK KASK']) {
      const r = await api('GET', `/api/aksesuar-stok/ara?q=${encodeURIComponent(q)}`, undefined, admin);
      assert.ok(
        r.govde.some((x) => x.stok_adi === ad),
        `"${q}" ile ${ad} bulunmadı`,
      );
    }
  });

  it('yedek parça stoğu: "Sıkıştırma Segmanı" kaydı büyük, küçük ve noktalı yazımla bulunur', async () => {
    const kod = benzersiz('TY').slice(0, 19);
    const ad = benzersiz('Sıkıştırma Segmanı ');
    const e = await api('POST', '/api/yedek-parca-stok', { stok_kodu: kod, stok_adi: ad, giren_miktar: 1, satis_fiyati: 100 }, admin);
    assert.equal(e.durum, 201);
    for (const q of ['SIKIŞTIRMA SEGMANI', 'sıkıştırma segmanı', 'sikiştirma segmani']) {
      const r = await api('GET', `/api/yedek-parca-stok/ara?q=${encodeURIComponent(q)}`, undefined, admin);
      assert.ok(
        r.govde.some((x) => x.stok_adi === ad),
        `"${q}" ile ${ad} bulunmadı`,
      );
    }
  });
});

describe('vitrin ilan araması: Türkçe I/ı', () => {
  it('"Işıklı Chopper" ilanı küçük ve büyük harfli aramada bulunur', async () => {
    const baslik = benzersiz('Işıklı Chopper ');
    const e = await api('POST', '/api/vitrin', { kategori: 'motor', baslik, segment: 'Chopper', marka: 'Test' }, admin);
    assert.equal(e.durum, 201, JSON.stringify(e.govde));
    for (const q of ['ışıklı chopper', 'IŞIKLI CHOPPER']) {
      const r = await api('GET', `/api/vitrin?kategori=motor&q=${encodeURIComponent(q)}`);
      assert.equal(r.durum, 200);
      assert.ok(
        r.govde.some((x) => x.baslik === baslik),
        `"${q}" ile ${baslik} bulunmadı`,
      );
    }
  });
});
