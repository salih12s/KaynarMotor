/*
 * olmayan-kayit: regression testleri (gerçek sunucu + gerçek MariaDB): olmayan kayıt üzerinde silme/onay/ret 200 değil 404 döner.
 * Eskiden `DELETE FROM ... WHERE id = ?` etkilenen satır sayısına bakılmadan "silindi" deniyordu (GET/PUT aynı kayıt için 404 veriyordu);
 * üstelik denetim günlüğüne hiç olmayan bir silme yazılıyordu (E03'te ölçüldü).
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat } = require('./yardimci');

const YOK = 99999999;
let s, api, admin;

before(async () => {
  s = await sunucuBaslat();
  api = s.api;
  admin = s.admin;
});
after(() => s && s.durdur());

const UCLAR = [
  ['DELETE', `/api/musteriler/${YOK}`, 'müşteri silme'],
  ['DELETE', `/api/is-emirleri/${YOK}`, 'iş emri silme'],
  ['DELETE', `/api/aksesuarlar/${YOK}`, 'aksesuar satışı silme'],
  ['DELETE', `/api/aksesuar-stok/${YOK}`, 'aksesuar stoğu silme'],
  ['DELETE', `/api/yedek-parcalar/${YOK}`, 'yedek parça satışı silme'],
  ['DELETE', `/api/yedek-parca-stok/${YOK}`, 'yedek parça stoğu silme'],
  ['DELETE', `/api/eticaret/${YOK}`, 'e-ticaret satışı silme'],
  ['DELETE', `/api/eticaret/platformlar/${YOK}`, 'e-ticaret platformu silme'],
  ['DELETE', `/api/ikinci-el-motor/${YOK}`, 'ikinci el motor silme'],
  ['DELETE', `/api/sifir-motor/${YOK}`, 'sıfır motor silme'],
  ['DELETE', `/api/vitrin/${YOK}`, 'vitrin ilanı silme'],
  ['DELETE', `/api/satis-belgeleri/${YOK}`, 'satış belgesi silme'],
  ['DELETE', `/api/auth/users/${YOK}`, 'kullanıcı silme'],
  ['PATCH', `/api/auth/users/${YOK}/approve`, 'kullanıcı onaylama'],
  ['PATCH', `/api/auth/users/${YOK}/reject`, 'kullanıcı reddetme'],
];

describe('olmayan kayıt: 200 değil 404', () => {
  for (const [yontem, yol, ad] of UCLAR) {
    it(`${ad}: ${yontem} ${yol.replace(String(YOK), ':id')}`, async () => {
      const r = await api(yontem, yol, undefined, admin);
      assert.equal(r.durum, 404, `${yontem} ${yol} -> ${r.durum} ${JSON.stringify(r.govde)}`);
    });
  }
});

describe('olmayan kayıt silinirse denetim günlüğüne silme yazılmaz', () => {
  it('müşteri: 404 sonrası günlükte bu id için DELETE kaydı yok', async () => {
    // Test veritabanı koşulardan koşuya birikir: sabit bir id kullanılsa önceki koşudan kalan günlük kaydı yanlış alarm verirdi.
    const yok = 80000000 + (Date.now() % 9000000);
    await api('DELETE', `/api/musteriler/${yok}`, undefined, admin);
    const gunluk = (await api('GET', '/api/auth/activity-logs', undefined, admin)).govde;
    const sahte = (Array.isArray(gunluk) ? gunluk : []).filter((k) => String(k.hedef_id) === String(yok) && /DELETE/i.test(String(k.islem_tipi)));
    assert.equal(sahte.length, 0, `olmayan kayıt için günlüğe silme yazıldı: ${JSON.stringify(sahte)}`);
  });
});
