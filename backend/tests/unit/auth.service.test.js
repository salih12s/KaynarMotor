/*
 * Kimlik doğrulama servisinin iş kuralları (sahte veritabanıyla, sunucu/MariaDB yok). Güvenlik açısından kritik:
 *   - Giriş yanıtı ve süresi kullanıcı adının var olup olmadığını sızdırmaz (kullanıcı yokken de bcrypt çalışır).
 *   - "Hesabınız henüz onaylanmadı" yalnızca DOĞRU şifre için gösterilir.
 *   - Nesne/dizi gönderen biri sorguya hiç girmez (401), 500 vermez.
 *   - Şifreler düz metin saklanmaz; token şifre parmak izini taşır.
 *   - Kullanıcı kendini silemez; yetki güncellemesi yalnızca bilinen alanları işler.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || 'birim-test-jwt-sirri';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sahteDb } = require('./sahteDb');
const servis = require('../../modules/auth/auth.service');
const { sifreParmagi } = require('../../core/middleware/auth');

const SIFRE = 'GucluSifre1';
const OZET = bcrypt.hashSync(SIFRE, 4); // düşük maliyet: yalnızca test hızı için
const kullaniciSatiri = (ek = {}) => ({
  id: 7, kullanici_adi: 'ali', sifre: OZET, ad_soyad: 'Ali Usta', rol: 'personel', onay_durumu: 'onaylandi',
  servis_yetkisi: true, motor_satis_gor: false, ...ek,
});
const girisDb = (satir) => sahteDb([['SELECT * FROM kullanicilar WHERE kullanici_adi', satir ? [satir] : []]]);
const sorgular = (db, parca) => db.cagrilar.filter((c) => c.sql.includes(parca));

describe('giriş', () => {
  it('kullanıcı adı/şifre metin değilse (nesne, dizi, sayı) veritabanına GİRMEDEN 401', async () => {
    for (const govde of [{ kullanici_adi: { $ne: 1 }, sifre: SIFRE }, { kullanici_adi: 'ali', sifre: ['x'] }, { kullanici_adi: 5, sifre: SIFRE }, {}]) {
      const db = girisDb(kullaniciSatiri());
      await assert.rejects(servis.giris(db, govde), (h) => h.status === 401 && h.message === 'Geçersiz kullanıcı adı veya şifre');
      assert.equal(db.cagrilar.length, 0);
    }
  });

  it('olmayan kullanıcı ve yanlış şifre AYNI yanıtı verir (401, aynı mesaj); nedeni yalnızca günlük için taşınır', async () => {
    const yok = await servis.giris(girisDb(null), { kullanici_adi: 'yok', sifre: SIFRE }).catch((h) => h);
    const yanlis = await servis.giris(girisDb(kullaniciSatiri()), { kullanici_adi: 'ali', sifre: 'YanlisSifre1' }).catch((h) => h);
    assert.equal(yok.status, 401);
    assert.equal(yanlis.status, 401);
    assert.equal(yok.message, yanlis.message);
    assert.equal(yok.name, 'GirisHatasi');
    assert.deepEqual([yok.kullaniciId, yok.detay], [undefined, 'Kullanıcı bulunamadı']);
    assert.deepEqual([yanlis.kullaniciId, yanlis.detay], [7, 'Yanlış şifre']);
  });

  it('kullanıcı YOKKEN de bcrypt doğrulaması çalışır (süre farkından kullanıcı adı sızmasın)', async () => {
    const asil = bcrypt.compare;
    let cagri = 0;
    bcrypt.compare = (...a) => { cagri++; return asil(...a); };
    try {
      await servis.giris(girisDb(null), { kullanici_adi: 'yok', sifre: SIFRE }).catch(() => {});
      assert.equal(cagri, 1);
    } finally {
      bcrypt.compare = asil;
    }
  });

  it('onaylanmamış hesap: DOĞRU şifreyle 403 "henüz onaylanmadı"; YANLIŞ şifreyle 401 (durum sızmaz)', async () => {
    const onaysiz = kullaniciSatiri({ onay_durumu: 'beklemede' });
    await assert.rejects(servis.giris(girisDb(onaysiz), { kullanici_adi: 'ali', sifre: SIFRE }), (h) => h.status === 403 && h.message === 'Hesabınız henüz onaylanmadı');
    await assert.rejects(servis.giris(girisDb(onaysiz), { kullanici_adi: 'ali', sifre: 'Yanlis123' }), (h) => h.status === 401 && h.message === 'Geçersiz kullanıcı adı veya şifre');
  });

  it('başarılı giriş: token yalnızca kimlik + şifre parmak izi taşır; yanıtta şifre özeti ve onay durumu YOK', async () => {
    const sonuc = await servis.giris(girisDb(kullaniciSatiri()), { kullanici_adi: 'ali', sifre: SIFRE });
    const yuk = jwt.verify(sonuc.token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    assert.deepEqual([yuk.id, yuk.kullanici_adi, yuk.sv], [7, 'ali', sifreParmagi(OZET)]);
    assert.ok(!('rol' in yuk) && !('servis_yetkisi' in yuk), 'rol/yetki token içinde taşınmaz (her istekte DB\'den okunur)');
    assert.equal(sonuc.user.id, 7);
    assert.equal(sonuc.user.servis_yetkisi, true);
    const metin = JSON.stringify(sonuc);
    assert.ok(!metin.includes(OZET) && !('sifre' in sonuc.user) && !('onay_durumu' in sonuc.user));
  });

  it('şifre değişince eski token parmak izi uyuşmaz (token geçersiz olur)', () => {
    assert.notEqual(sifreParmagi(OZET), sifreParmagi(bcrypt.hashSync('YeniSifre123', 4)));
    assert.equal(sifreParmagi(OZET), sifreParmagi(OZET), 'aynı özet aynı parmak izi');
    assert.equal(sifreParmagi(OZET).length, 16, 'özetin kendisi değil kısa bir türevi');
  });
});

describe('kayıt (herkese açık)', () => {
  const gecerli = { kullanici_adi: 'yeni', sifre: SIFRE, ad_soyad: 'Yeni Kişi' };

  it('eksik/boş/metin olmayan alanlar 400 "Tüm alanlar zorunludur"', async () => {
    for (const ek of [{ kullanici_adi: '  ' }, { ad_soyad: '' }, { sifre: '' }, { kullanici_adi: { x: 1 } }, { ad_soyad: 5 }]) {
      await assert.rejects(servis.kayitOl(sahteDb(), { ...gecerli, ...ek }), (h) => h.status === 400 && h.message === 'Tüm alanlar zorunludur');
    }
  });

  it('şifre kuralı: 8 karakterden kısa ya da 128\'den uzun reddedilir; metin olmayan şifre de', async () => {
    await assert.rejects(servis.kayitOl(sahteDb(), { ...gecerli, sifre: 'kisa' }), (h) => h.message === 'Şifre en az 8 karakter olmalıdır');
    await assert.rejects(servis.kayitOl(sahteDb(), { ...gecerli, sifre: 'x'.repeat(129) }), (h) => h.message === 'Şifre en fazla 128 karakter olabilir');
    await assert.rejects(servis.kayitOl(sahteDb(), { ...gecerli, sifre: 12345678 }), (h) => h.message === 'Şifre en az 8 karakter olmalıdır');
  });

  it('kullanıcı adı alınmışsa 400; başarıda şifre HASH olarak yazılır (düz metin değil), hesap onaysız başlar', async () => {
    await assert.rejects(servis.kayitOl(sahteDb([['SELECT id FROM kullanicilar', [{ id: 1 }]]]), gecerli), (h) => h.status === 400 && h.message === 'Bu kullanıcı adı zaten kullanılıyor');
    const db = sahteDb([['INSERT INTO kullanicilar', [{ id: 9, kullanici_adi: 'yeni' }]]]);
    await servis.kayitOl(db, gecerli);
    const ekleme = sorgular(db, 'INSERT INTO kullanicilar')[0];
    assert.notEqual(ekleme.params[1], SIFRE);
    assert.ok(await bcrypt.compare(SIFRE, ekleme.params[1]));
    assert.ok(!ekleme.sql.includes('onaylandi'), 'kayıt onay bekler (varsayılan)');
  });
});

describe('admin: kullanıcı oluşturma ve şifre sıfırlama', () => {
  const gecerli = { kullanici_adi: 'muh1', sifre: SIFRE, ad_soyad: 'Muhasebe Kişisi' };

  it('rol: personel/yatırımcı/muhasebeci geçerli; bilinmeyen rol (admin dahil!) "personel" olur; hesap hemen onaylı', async () => {
    for (const [istenen, beklenen] of [['muhasebeci', 'muhasebeci'], ['yatirimci', 'yatirimci'], ['admin', 'personel'], ['x', 'personel'], [undefined, 'personel']]) {
      const db = sahteDb([['INSERT INTO kullanicilar', [{ id: 9, rol: beklenen }]]]);
      await servis.kullaniciOlustur(db, { ...gecerli, rol: istenen });
      const ekleme = sorgular(db, 'INSERT INTO kullanicilar')[0];
      assert.equal(ekleme.params[3], beklenen, `${istenen} -> ${beklenen}`);
      assert.match(ekleme.sql, /'onaylandi'/);
    }
  });

  it('zorunlu alan mesajı farklıdır: "Kullanıcı adı, şifre ve ad soyad zorunludur"', async () => {
    await assert.rejects(servis.kullaniciOlustur(sahteDb(), { ...gecerli, ad_soyad: '' }), (h) => h.message === 'Kullanıcı adı, şifre ve ad soyad zorunludur');
  });

  it('şifre sıfırlama: kısa şifre 400; olmayan kullanıcı 404; başarıda HASH yazılır', async () => {
    await assert.rejects(servis.sifreSifirla(sahteDb(), 3, { sifre: 'kisa' }), (h) => h.status === 400);
    await assert.rejects(servis.sifreSifirla(sahteDb(), 3, { sifre: SIFRE }), (h) => h.status === 404 && h.message === 'Kullanıcı bulunamadı');
    const db = sahteDb([['UPDATE kullanicilar SET sifre', [{}]]]);
    await servis.sifreSifirla(db, 3, { sifre: SIFRE });
    assert.ok(await bcrypt.compare(SIFRE, db.cagrilar[0].params[0]));
    assert.equal(db.cagrilar[0].params[1], 3);
  });
});

describe('admin: silme, onay ve yetki', () => {
  it('kendini silemez (400); başkasını silerken iş emri bağlantısı ÖNCE boşaltılır, sonra kullanıcı silinir (tek transaction)', async () => {
    await assert.rejects(servis.kullaniciSil(sahteDb(), 5, { id: 5 }), (h) => h.status === 400 && h.message === 'Kendinizi silemezsiniz');
    const db = sahteDb();
    await servis.kullaniciSil(db, 9, { id: 5 });
    assert.match(db.cagrilar[0].sql, /UPDATE is_emirleri SET olusturan_kullanici_id = NULL/);
    assert.match(db.cagrilar[1].sql, /DELETE FROM kullanicilar/);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('onay ve red onay durumunu yazar', async () => {
    const onay = sahteDb();
    await servis.onayla(onay, 4);
    assert.deepEqual(onay.cagrilar[0].params, ['onaylandi', 4]);
    const red = sahteDb();
    await servis.reddet(red, 4);
    assert.deepEqual(red.cagrilar[0].params, ['reddedildi', 4]);
  });

  it('yetkiler: YALNIZCA bilinen alanlar işlenir, değerler boolean olur; bilinmeyen alan (rol dahil) yok sayılır', async () => {
    const db = sahteDb();
    await servis.yetkileriGuncelle(db, 4, { motor_satis_gor: 'true', servis_yetkisi: 0, rol: 'admin', sifre: 'x', kar_gor: 1 });
    const guncelleme = db.cagrilar[0];
    assert.ok(!/rol|sifre/.test(guncelleme.sql), 'rol/şifre kolonu asla yazılmaz');
    const eslesme = Object.fromEntries(guncelleme.sql.match(/(\w+) = \$(\d+)/g).map((p) => { const [k, i] = p.split(' = $'); return [k, guncelleme.params[Number(i) - 1]]; }));
    assert.equal(eslesme.motor_satis_gor, true);
    assert.equal(eslesme.servis_yetkisi, false);
    assert.equal(eslesme.kar_gor, true);
    assert.equal(guncelleme.params.at(-1), 4);
  });

  it('geçerli alan yoksa 400 "Güncellenecek geçerli alan yok"', async () => {
    const db = sahteDb();
    await assert.rejects(servis.yetkileriGuncelle(db, 4, { rol: 'admin', x: 1 }), (h) => h.status === 400 && h.message === 'Güncellenecek geçerli alan yok');
    assert.equal(db.cagrilar.length, 0);
  });

  it('oturum doğrulama: kullanıcı silinmişse 404', async () => {
    await assert.rejects(servis.oturumDogrula(sahteDb(), { id: 1 }), (h) => h.status === 404 && h.message === 'Kullanıcı bulunamadı');
  });
});
