/*
 * Faz 11 testleri (gerçek sunucu + gerçek MariaDB): katmanlı yapıya taşınan kimlik doğrulama ve vitrin modüllerinin HTTP
 * SÖZLEŞMESİ. Taşıma davranışı değiştirmemeli: durum kodları, mesajlar ve yanıt biçimi sabit kalır.
 *
 *   #53 kimlik doğrulama: kayıt-onay-giriş akışı, sızıntısız hata mesajları, yönetim uçları
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat } = require('./yardimci');

const SON = Date.now().toString(36);
let s, api, admin, sayac = 0;
const benzersiz = (onek) => `${onek}${SON}${++sayac}`;

before(async () => {
  s = await sunucuBaslat(); api = s.api; admin = s.admin;
});
after(() => s && s.durdur());

describe('#53 kimlik doğrulama: HTTP sözleşmesi', () => {
  const SIFRE = 'GucluSifre1';
  let ad, hesapId;

  it('kayıt 201 onay bekler; onaylanana kadar DOĞRU şifreyle 403, yanlış şifreyle 401', async () => {
    ad = benzersiz('f11_kayit_');
    const kayit = await api('POST', '/api/auth/register', { kullanici_adi: ad, sifre: SIFRE, ad_soyad: 'Kayıtlı Kişi' });
    assert.equal(kayit.durum, 201);
    assert.equal(kayit.govde.message, 'Kayıt başarılı. Admin onayı bekleniyor.');
    assert.equal(kayit.govde.user.onay_durumu, 'beklemede');
    assert.ok(!('sifre' in kayit.govde.user));
    hesapId = kayit.govde.user.id;
    const dogru = await api('POST', '/api/auth/login', { kullanici_adi: ad, sifre: SIFRE });
    assert.equal(dogru.durum, 403);
    assert.equal(dogru.govde.message, 'Hesabınız henüz onaylanmadı');
    const yanlis = await api('POST', '/api/auth/login', { kullanici_adi: ad, sifre: 'YanlisSifre1' });
    assert.equal(yanlis.durum, 401);
    assert.equal(yanlis.govde.message, 'Geçersiz kullanıcı adı veya şifre');
  });

  it('kayıt doğrulaması: eksik alan, kısa şifre, alınmış ad; gövde dizi/boşsa 400', async () => {
    assert.equal((await api('POST', '/api/auth/register', { kullanici_adi: 'x' })).govde.message, 'Tüm alanlar zorunludur');
    assert.equal((await api('POST', '/api/auth/register', { kullanici_adi: benzersiz('k'), sifre: 'kisa', ad_soyad: 'A' })).govde.message, 'Şifre en az 8 karakter olmalıdır');
    const cift = await api('POST', '/api/auth/register', { kullanici_adi: ad, sifre: SIFRE, ad_soyad: 'Başka' });
    assert.equal(cift.durum, 400);
    assert.equal(cift.govde.message, 'Bu kullanıcı adı zaten kullanılıyor');
    const dizi = await api('POST', '/api/auth/register', [1, 2]);
    assert.equal(dizi.durum, 400);
    assert.equal(dizi.govde.message, 'Tüm alanlar zorunludur');
  });

  it('giriş: olmayan kullanıcı, yanlış şifre ve nesne/dizi gövde AYNI 401 yanıtını verir (sızıntı yok)', async () => {
    const hepsi = [
      { kullanici_adi: 'olmayan_' + SON, sifre: SIFRE },
      { kullanici_adi: ad, sifre: 'YanlisSifre1' },
      { kullanici_adi: { $ne: 1 }, sifre: SIFRE },
      { kullanici_adi: ad, sifre: ['x'] },
    ];
    for (const g of hepsi) {
      const r = await api('POST', '/api/auth/login', g);
      assert.equal(r.durum, 401, JSON.stringify(g));
      assert.equal(r.govde.message, 'Geçersiz kullanıcı adı veya şifre');
    }
    assert.equal((await api('POST', '/api/auth/login', [])).durum, 401);
  });

  it('admin onaylayınca giriş çalışır; token ile verify güncel yetkileri döner; şifre özeti hiçbir yanıtta yok', async () => {
    assert.equal((await api('PATCH', `/api/auth/users/${hesapId}/approve`, undefined, admin)).govde.message, 'Kullanıcı onaylandı');
    const giris = await api('POST', '/api/auth/login', { kullanici_adi: ad, sifre: SIFRE });
    assert.equal(giris.durum, 200);
    assert.ok(giris.govde.token);
    assert.equal(giris.govde.user.rol, 'personel');
    assert.equal(giris.govde.user.motor_satis_gor, false);
    assert.ok(!('sifre' in giris.govde.user) && !('onay_durumu' in giris.govde.user));
    const verify = await api('GET', '/api/auth/verify', undefined, giris.govde.token);
    assert.equal(verify.durum, 200);
    assert.equal(verify.govde.user.id, hesapId);
    assert.ok(!JSON.stringify((await api('GET', '/api/auth/users', undefined, admin)).govde).includes('$2'), 'kullanıcı listesi şifre özeti taşımaz');
  });

  it('yönetim uçları yalnız admin: personel 403 "Bu işlem için admin yetkisi gerekli"; tokensız 401', async () => {
    const t = (await api('POST', '/api/auth/login', { kullanici_adi: ad, sifre: SIFRE })).govde.token;
    for (const [m, y] of [['GET', '/api/auth/users'], ['POST', '/api/auth/users'], ['GET', '/api/auth/yatirimcilar'], ['GET', '/api/auth/activity-logs'], ['PATCH', `/api/auth/users/${hesapId}/yetkiler`]]) {
      const r = await api(m, y, m === 'GET' ? undefined : {}, t);
      assert.equal(r.durum, 403, `${m} ${y}`);
      assert.equal(r.govde.message, 'Bu işlem için admin yetkisi gerekli');
    }
    assert.equal((await api('GET', '/api/auth/users')).durum, 401);
    assert.equal((await api('GET', '/api/auth/personel-listesi', undefined, t)).durum, 200, 'personel listesi herkese açık');
  });

  it('yetkiler: bilinmeyen alanlar yok sayılır, geçerli alan yoksa 400; olmayan kullanıcı şifre sıfırlama 404', async () => {
    const yok = await api('PATCH', `/api/auth/users/${hesapId}/yetkiler`, { rol: 'admin', bilinmeyen: true }, admin);
    assert.equal(yok.durum, 400);
    assert.equal(yok.govde.message, 'Güncellenecek geçerli alan yok');
    const ok = await api('PATCH', `/api/auth/users/${hesapId}/yetkiler`, { motor_satis_gor: true, rol: 'admin' }, admin);
    assert.equal(ok.durum, 200);
    const liste = (await api('GET', '/api/auth/users', undefined, admin)).govde.find((u) => u.id === hesapId);
    assert.equal(liste.motor_satis_gor, true);
    assert.equal(liste.rol, 'personel', 'rol bu uçtan DEĞİŞTİRİLEMEZ');
    const sifre = await api('PATCH', '/api/auth/users/2147483000/sifre', { sifre: SIFRE }, admin);
    assert.equal(sifre.durum, 404);
    assert.equal(sifre.govde.message, 'Kullanıcı bulunamadı');
  });

  it('admin kendini silemez (400); kullanıcıyı siler (200); silinen kullanıcı giriş yapamaz', async () => {
    const adminId = (await api('GET', '/api/auth/verify', undefined, admin)).govde.user.id;
    const kendi = await api('DELETE', `/api/auth/users/${adminId}`, undefined, admin);
    assert.equal(kendi.durum, 400);
    assert.equal(kendi.govde.message, 'Kendinizi silemezsiniz');
    const sil = await api('DELETE', `/api/auth/users/${hesapId}`, undefined, admin);
    assert.equal(sil.durum, 200);
    assert.equal(sil.govde.message, 'Kullanıcı silindi');
    assert.equal((await api('POST', '/api/auth/login', { kullanici_adi: ad, sifre: SIFRE })).durum, 401);
  });

  it('etkinlik günlüğü: giriş denemeleri iz bırakır; çıkış 200', async () => {
    const loglar = (await api('GET', '/api/auth/activity-logs', undefined, admin)).govde;
    assert.ok(Array.isArray(loglar));
    assert.ok(loglar.some((l) => l.islem_tipi === 'LOGIN_FAILED' && l.kullanici_adi === ad), 'başarısız deneme günlükte');
    assert.ok(loglar.some((l) => l.islem_tipi === 'REGISTER' && l.kullanici_adi === ad), 'kayıt günlükte');
    assert.equal((await api('POST', '/api/auth/logout', undefined, admin)).govde.message, 'Çıkış başarılı');
  });

  it('giriş sınırı hesap başınadır: bir çalışanın yanlış denemeleri 429 alır, AYNI IP\'deki başka hesap etkilenmez', async () => {
    const calisan = benzersiz('f11_lim_');
    for (let i = 0; i < 10; i++) {
      assert.equal((await api('POST', '/api/auth/login', { kullanici_adi: calisan, sifre: 'yanlis' })).durum, 401, `deneme ${i + 1}`);
    }
    const bloke = await api('POST', '/api/auth/login', { kullanici_adi: calisan, sifre: 'yanlis' });
    assert.equal(bloke.durum, 429);
    assert.match(bloke.govde.message, /Çok fazla başarısız giriş denemesi/);
    // büyük/küçük harf farkıyla sayaç atlatılamaz
    assert.equal((await api('POST', '/api/auth/login', { kullanici_adi: calisan.toUpperCase(), sifre: 'yanlis' })).durum, 429);
    // aynı IP'den başka hesap (patron) hâlâ girebilir ya da en azından 429 almaz
    const patron = await api('POST', '/api/auth/login', { kullanici_adi: benzersiz('f11_patron_'), sifre: 'yanlis' });
    assert.equal(patron.durum, 401);
  });
});
