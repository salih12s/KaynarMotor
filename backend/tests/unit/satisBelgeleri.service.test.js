/*
 * Satış belgesi kuralları (sahte veritabanıyla, sunucu/MariaDB yok): dosya adı temizliği, tür/içerik doğrulaması,
 * arşiv gruplama. Boyut sınırı veritabanı paketine (max_allowed_packet) bağlı olduğu için API testindedir.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sahteDb } = require('./sahteDb');
const servis = require('../../modules/motor/satisBelgeleri.service');

const KUL = { id: 3, kullanici_adi: 'ali' };
const PDF = Buffer.from('%PDF-1.4 test');
const PNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0, 0]);

describe('temizAd ve pozitifId (saf)', () => {
  it('yol ayracı ve özel karakterler atılır; boşsa "belge"; 200 karaktere kırpılır', () => {
    assert.equal(servis.temizAd('../../etc/passwd.pdf'), '.._.._etc_passwd.pdf', 'her / bir _ olur: dizin atlama kalmaz');
    assert.ok(!servis.temizAd('a\\b/c:d*e?f.pdf').match(/[\\/:*?]/));
    assert.equal(servis.temizAd(''), 'belge');
    assert.equal(servis.temizAd(undefined), 'belge');
    assert.equal(servis.temizAd('x'.repeat(500)).length, 200);
  });

  it('pozitifId yalnızca pozitif tam sayı', () => {
    assert.equal(servis.pozitifId('5'), 5);
    for (const kotu of ['0', '-1', '5abc', '1.5', '', null, undefined, 'abc']) assert.equal(servis.pozitifId(kotu), null, String(kotu));
  });
});

describe('yükleme doğrulaması (veritabanına gitmeden reddedilenler)', () => {
  const yukle = (ek) => servis.yukle(sahteDb(), { motorIdHam: '5', dosyaAdiHam: 'sozlesme.pdf', icerik: PDF, kullanici: KUL, ...ek });

  it('geçersiz motor numarası 400 "Geçersiz satış"', async () => {
    await assert.rejects(yukle({ motorIdHam: 'abc' }), (h) => h.status === 400 && h.message === 'Geçersiz satış');
  });

  it('boş ya da Buffer olmayan gövde 400 "Dosya boş veya okunamadı"', async () => {
    await assert.rejects(yukle({ icerik: Buffer.alloc(0) }), (h) => h.status === 400 && h.message === 'Dosya boş veya okunamadı');
    await assert.rejects(yukle({ icerik: '{}' }), (h) => h.message === 'Dosya boş veya okunamadı');
  });

  it('desteklenmeyen uzantı (exe, uzantısız) 400', async () => {
    await assert.rejects(yukle({ dosyaAdiHam: 'virus.exe' }), (h) => h.status === 400 && /Desteklenmeyen dosya türü/.test(h.message));
    await assert.rejects(yukle({ dosyaAdiHam: undefined }), (h) => /Desteklenmeyen dosya türü/.test(h.message));
  });

  it('içerik uzantıyla uyuşmuyorsa 400 (adı değiştirilmiş dosya: PNG adlı PDF, PDF adlı PNG)', async () => {
    await assert.rejects(yukle({ dosyaAdiHam: 'foto.png', icerik: PDF }), (h) => h.status === 400 && h.message === 'Dosya içeriği uzantısıyla uyuşmuyor');
    await assert.rejects(yukle({ dosyaAdiHam: 'sozlesme.pdf', icerik: PNG }), (h) => h.message === 'Dosya içeriği uzantısıyla uyuşmuyor');
    await assert.rejects(yukle({ dosyaAdiHam: 'tablo.xlsx', icerik: PDF }), (h) => h.message === 'Dosya içeriği uzantısıyla uyuşmuyor');
  });
});

describe('indir ve sil', () => {
  it('geçersiz belge numarası 400; olmayan belge 404', async () => {
    await assert.rejects(servis.indir(sahteDb(), 'x'), (h) => h.status === 400 && h.message === 'Geçersiz belge');
    await assert.rejects(servis.indir(sahteDb(), '9'), (h) => h.status === 404 && h.message === 'Belge bulunamadı');
    await assert.rejects(servis.sil(sahteDb(), '9'), (h) => h.status === 404 && h.message === 'Belge bulunamadı');
  });

  it('sil: silinen kaydın (motor_id, dosya_adi) bilgisi günlük için döner', async () => {
    const db = sahteDb([['DELETE FROM satis_belgeleri', [{ motor_id: 5, dosya_adi: 'a.pdf' }]]]);
    assert.deepEqual(await servis.sil(db, '3'), { motor_id: 5, dosya_adi: 'a.pdf' });
  });
});

describe('arsivGrupla (saf)', () => {
  const s = (motor_id, id, ek = {}) => ({ motor_id, plaka: `P${motor_id}`, marka: 'M', model: 'X', durum: 'tamamlandi', alis_tarihi: '2026-08-01', satis_tarihi: '2026-09-01', id, dosya_adi: `d${id}.pdf`, mime: 'application/pdf', boyut: 10, created_at: 'T', ...ek });

  it('belge başına satırlar motora göre gruplanır; motor sırası ve belge sırası korunur', () => {
    const gruplar = servis.arsivGrupla([s(2, 1), s(2, 2), s(7, 3), s(2, 4)]);
    assert.deepEqual(gruplar.map((g) => g.motor_id), [2, 7]);
    assert.deepEqual(gruplar[0].belgeler.map((b) => b.id), [1, 2, 4]);
  });

  it('grupta tarihler var; fiyat/alıcı/TC gibi alanlar YOK', () => {
    const [g] = servis.arsivGrupla([s(2, 1, { satis_fiyati: 5, alici_adi: 'Gizli', alici_tc: '1' })]);
    assert.equal(g.alis_tarihi, '2026-08-01');
    assert.equal(g.satis_tarihi, '2026-09-01');
    const metin = JSON.stringify(g);
    for (const sizinti of ['satis_fiyati', 'alici_adi', 'alici_tc', 'Gizli']) assert.ok(!metin.includes(sizinti), `${sizinti} sızıyor`);
  });

  it('boş girdi boş dizi', () => assert.deepEqual(servis.arsivGrupla([]), []));
});
