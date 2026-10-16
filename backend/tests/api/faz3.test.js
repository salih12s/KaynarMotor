/*
 * Faz 3 regression testleri (gerçek sunucu + gerçek MariaDB). Bkz. YAPILACAKLAR-INCELEME.md
 *   #5   yetki/hesap iptali token süresini beklemeden uygulanmalı
 *   #6   düz metin şifre saklanmamalı/gösterilmemeli; admin şifre sıfırlayabilmeli
 *   #21  şifre kuralı; giriş yanıtı kullanıcı adı/onay durumu sızdırmamalı
 *   #12  stok simetrik (fazla satış eksiye düşer, iade tam geri verir); aksesuar satırı stok_id ile bağlanır
 *   #13  yatırımcı atamasını yalnızca admin yapar
 *   #14  motor okuma: allowlist + satılmış motor görünürlüğü liste ile aynı kural
 *   #15  yatırımcı raporu müşteri kimliği taşımaz
 *   #33  vitrinde yayın durumu/sıra yalnız admin; bağlantılar doğrulanır
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sunucuBaslat, kullaniciOlustur } = require('./yardimci');

const SON = Date.now().toString(36);
const num = (v) => Number(v);
let s, api, admin, pool, sayac = 0;
const benzersiz = (onek) => `${onek}${SON}${++sayac}`;
const sql = async (q, p) => (await pool.query(q, p)).rows;

before(async () => {
  s = await sunucuBaslat(); api = s.api; admin = s.admin;
  pool = require('../../config/db').pool;
});
after(async () => { if (s) s.durdur(); if (pool) await pool.end(); });

// ---------------------------------------------------------------- #5
describe('#5 yetki ve hesap iptali hemen etkili olur', () => {
  it('yetki alınınca AYNI token ile bir sonraki istek 403 alır', async () => {
    const u = await kullaniciOlustur(api, admin, benzersiz('f3_yetki_'), 'personel', { servis_yetkisi: true });
    assert.equal((await api('GET', '/api/is-emirleri', undefined, u.token)).durum, 200);
    await api('PATCH', `/api/auth/users/${u.id}/yetkiler`, { servis_yetkisi: false }, admin);
    assert.equal((await api('GET', '/api/is-emirleri', undefined, u.token)).durum, 403);
  });

  it('yetki verilince AYNI token yeniden giriş gerekmeden çalışır', async () => {
    const u = await kullaniciOlustur(api, admin, benzersiz('f3_ver_'), 'personel');
    assert.equal((await api('GET', '/api/is-emirleri', undefined, u.token)).durum, 403);
    await api('PATCH', `/api/auth/users/${u.id}/yetkiler`, { servis_yetkisi: true }, admin);
    assert.equal((await api('GET', '/api/is-emirleri', undefined, u.token)).durum, 200);
  });

  it('kullanıcı silinince eski token 401 alır (oturum geçersiz)', async () => {
    const u = await kullaniciOlustur(api, admin, benzersiz('f3_sil_'), 'personel', { servis_yetkisi: true });
    assert.equal((await api('GET', '/api/is-emirleri', undefined, u.token)).durum, 200);
    assert.equal((await api('DELETE', `/api/auth/users/${u.id}`, undefined, admin)).durum, 200);
    const r = await api('GET', '/api/is-emirleri', undefined, u.token);
    assert.equal(r.durum, 401);
    assert.equal(r.govde.code, 'TOKEN_INVALID');
  });

  it('hesap reddedilince eski token 401 alır', async () => {
    const u = await kullaniciOlustur(api, admin, benzersiz('f3_red_'), 'personel', { servis_yetkisi: true });
    await api('PATCH', `/api/auth/users/${u.id}/reject`, undefined, admin);
    assert.equal((await api('GET', '/api/is-emirleri', undefined, u.token)).durum, 401);
  });

  it('admin kendi yetkileriyle çalışmaya devam eder; bozuk token 403, tokensız 401 (değişmedi)', async () => {
    assert.equal((await api('GET', '/api/is-emirleri', undefined, admin)).durum, 200);
    const bozuk = await api('GET', '/api/is-emirleri', undefined, 'bozuk.token.degeri');
    assert.equal(bozuk.durum, 403);
    assert.equal(bozuk.govde.code, 'TOKEN_INVALID');
    const yok = await api('GET', '/api/is-emirleri');
    assert.equal(yok.durum, 401);
    assert.equal(yok.govde.code, 'TOKEN_MISSING');
  });

  it('/auth/verify güncel yetkileri döndürür', async () => {
    const u = await kullaniciOlustur(api, admin, benzersiz('f3_ver2_'), 'personel', { aksesuar_yetkisi: true });
    const v = await api('GET', '/api/auth/verify', undefined, u.token);
    assert.equal(v.durum, 200);
    assert.equal(v.govde.user.aksesuar_yetkisi, true);
  });
});

// ---------------------------------------------------------------- #6
describe('#6 düz metin şifre yok; admin şifre sıfırlar', () => {
  it('kullanıcı listesi plain_sifre döndürmez', async () => {
    const r = await api('GET', '/api/auth/users', undefined, admin);
    assert.equal(r.durum, 200);
    assert.ok(r.govde.length > 0);
    assert.ok(r.govde.every((k) => !('plain_sifre' in k)));
  });

  it('admin kullanıcı oluşturma ve herkese açık kayıt şifreyi düz metin kaydetmez', async () => {
    const ad1 = benzersiz('f3_dz1_'), ad2 = benzersiz('f3_dz2_');
    await api('POST', '/api/auth/users', { kullanici_adi: ad1, sifre: 'gizli-sifre-1', ad_soyad: ad1, rol: 'personel' }, admin);
    await api('POST', '/api/auth/register', { kullanici_adi: ad2, sifre: 'gizli-sifre-2', ad_soyad: ad2 });
    const satirlar = await sql('SELECT kullanici_adi, plain_sifre, sifre FROM kullanicilar WHERE kullanici_adi IN ($1, $2)', [ad1, ad2]);
    assert.equal(satirlar.length, 2);
    for (const k of satirlar) {
      assert.equal(k.plain_sifre, null);
      assert.ok(k.sifre.startsWith('$2')); // bcrypt özeti
    }
  });

  it('sunucu açılışında önceden kalmış düz metin şifreler temizlenir', async () => {
    const ad = benzersiz('f3_eski_');
    const u = await kullaniciOlustur(api, admin, ad, 'personel');
    await pool.query('UPDATE kullanicilar SET plain_sifre = $1 WHERE id = $2', ['eski-acik-sifre', u.id]);
    const ikinci = await sunucuBaslat(); // açılışta migration çalışır
    try {
      // Sunucu dinlemeye şemadan önce başlar (DB init arka planda): temizlik bitene kadar en fazla 15 sn bekle
      let deger = 'eski-acik-sifre';
      for (let i = 0; i < 30 && deger !== null; i++) {
        deger = (await sql('SELECT plain_sifre FROM kullanicilar WHERE id = $1', [u.id]))[0].plain_sifre;
        if (deger !== null) await new Promise((c) => setTimeout(c, 500));
      }
      assert.equal(deger, null);
    } finally { ikinci.durdur(); }
  });

  it('admin şifre sıfırlar: yeni şifreyle giriş olur, eskisiyle olmaz', async () => {
    const ad = benzersiz('f3_sfr_');
    const u = await kullaniciOlustur(api, admin, ad, 'personel');
    const r = await api('PATCH', `/api/auth/users/${u.id}/sifre`, { sifre: 'yeni-sifre-9' }, admin);
    assert.equal(r.durum, 200);
    assert.equal((await api('POST', '/api/auth/login', { kullanici_adi: ad, sifre: 'yeni-sifre-9' })).durum, 200);
    assert.equal((await api('POST', '/api/auth/login', { kullanici_adi: ad, sifre: `${ad}-sifre1` })).durum, 401);
  });

  it('şifre sıfırlama: kısa şifre 400, olmayan kullanıcı 404, personel 403, tokensız 401', async () => {
    const u = await kullaniciOlustur(api, admin, benzersiz('f3_sfr2_'), 'personel');
    assert.equal((await api('PATCH', `/api/auth/users/${u.id}/sifre`, { sifre: '123' }, admin)).durum, 400);
    assert.equal((await api('PATCH', `/api/auth/users/${u.id}/sifre`, {}, admin)).durum, 400);
    assert.equal((await api('PATCH', '/api/auth/users/999999999/sifre', { sifre: 'yeterince-uzun' }, admin)).durum, 404);
    assert.equal((await api('PATCH', `/api/auth/users/${u.id}/sifre`, { sifre: 'yeterince-uzun' }, u.token)).durum, 403);
    assert.equal((await api('PATCH', `/api/auth/users/${u.id}/sifre`, { sifre: 'yeterince-uzun' })).durum, 401);
  });
});

// ---------------------------------------------------------------- #21
describe('#21 şifre kuralı ve giriş yanıtları', () => {
  it('kısa şifreyle kayıt ve kullanıcı oluşturma reddedilir (400)', async () => {
    assert.equal((await api('POST', '/api/auth/register', { kullanici_adi: benzersiz('f3_k_'), sifre: 'abc', ad_soyad: 'x' })).durum, 400);
    assert.equal((await api('POST', '/api/auth/users', { kullanici_adi: benzersiz('f3_k2_'), sifre: '12345', ad_soyad: 'x', rol: 'personel' }, admin)).durum, 400);
  });

  it('onaysız kullanıcı + YANLIŞ şifre, olmayan kullanıcıyla aynı yanıtı alır (401)', async () => {
    const ad = benzersiz('f3_bkl_');
    assert.equal((await api('POST', '/api/auth/register', { kullanici_adi: ad, sifre: 'dogru-sifre-1', ad_soyad: ad })).durum, 201);
    const yanlis = await api('POST', '/api/auth/login', { kullanici_adi: ad, sifre: 'yanlis' });
    const yok = await api('POST', '/api/auth/login', { kullanici_adi: benzersiz('f3_yok_'), sifre: 'yanlis' });
    assert.equal(yanlis.durum, 401);
    assert.equal(yok.durum, 401);
    assert.equal(yanlis.govde.message, yok.govde.message);
  });

  it('onaysız kullanıcı DOĞRU şifreyle 403 (henüz onaylanmadı) alır', async () => {
    const ad = benzersiz('f3_bkl2_');
    await api('POST', '/api/auth/register', { kullanici_adi: ad, sifre: 'dogru-sifre-1', ad_soyad: ad });
    const r = await api('POST', '/api/auth/login', { kullanici_adi: ad, sifre: 'dogru-sifre-1' });
    assert.equal(r.durum, 403);
  });

  it('eksik/yanlış tipte giriş gövdesi 500 değil 401 verir', async () => {
    assert.equal((await api('POST', '/api/auth/login', {})).durum, 401);
    assert.equal((await api('POST', '/api/auth/login', { kullanici_adi: 'admin' })).durum, 401);
    assert.equal((await api('POST', '/api/auth/login', { kullanici_adi: { $ne: 1 }, sifre: ['x'] })).durum, 401);
  });
});

// ---------------------------------------------------------------- #12
describe('#12 stok simetrisi: fazla satış eksiye düşer, iade tam geri verir', () => {
  const stokOku = async (yol, kod) => (await api('GET', `${yol}/barkod/${kod}`, undefined, admin)).govde;
  const aksStok = async (giren) => {
    const kod = benzersiz('F3A').slice(0, 19);
    const r = await api('POST', '/api/aksesuar-stok', { stok_kodu: kod, stok_adi: `Kask ${kod}`, giren_miktar: giren, alis_fiyati: 300, satis_fiyati: 700 }, admin);
    return { id: r.govde.id, kod, ad: `Kask ${kod}` };
  };

  it('aksesuar: stok 2, satış 5 adet → mevcut −3; satış silinince tam 2', async () => {
    const st = await aksStok(2);
    const sat = await api('POST', '/api/aksesuarlar', { ad_soyad: benzersiz('F3 '), durum: 'tamamlandi', parcalar: [{ urun_adi: st.ad, adet: 5, maliyet: 300, satis_fiyati: 700 }] }, admin);
    assert.equal(sat.durum, 201);
    let k = await stokOku('/api/aksesuar-stok', st.kod);
    assert.equal(num(k.mevcut), -3);
    assert.equal(num(k.cikan_miktar), 5);
    assert.ok(num(k.envanter_degeri) >= 0);
    await api('DELETE', `/api/aksesuarlar/${sat.govde.id}`, undefined, admin);
    k = await stokOku('/api/aksesuar-stok', st.kod);
    assert.equal(num(k.mevcut), 2);
    assert.equal(num(k.cikan_miktar), 0);
  });

  it('aksesuar: satır stok_id ile bağlanır; stok yeniden adlandırılsa da iade doğru stoğa gider', async () => {
    const st = await aksStok(10);
    const sat = await api('POST', '/api/aksesuarlar', { ad_soyad: benzersiz('F3 '), durum: 'tamamlandi', parcalar: [{ stok_id: st.id, urun_adi: 'Serbest yazılmış ad', adet: 2, maliyet: 300, satis_fiyati: 700 }] }, admin);
    assert.equal(sat.durum, 201);
    assert.equal(sat.govde.parcalar[0].stok_id, st.id);
    assert.equal(num((await stokOku('/api/aksesuar-stok', st.kod)).mevcut), 8);
    // stok adı değişir: ada göre eşleşme olsaydı iade kaybolurdu
    await api('PUT', `/api/aksesuar-stok/${st.id}`, { stok_kodu: st.kod, stok_adi: `Yeniden adlandı ${st.kod}`, giren_miktar: 10, alis_fiyati: 300, satis_fiyati: 700 }, admin);
    assert.equal(num((await stokOku('/api/aksesuar-stok', st.kod)).mevcut), 8);
    // düzenleme: 2 → 3 adet (geri ekle + yeniden düş)
    await api('PUT', `/api/aksesuarlar/${sat.govde.id}`, { ad_soyad: 'x', durum: 'tamamlandi', parcalar: [{ stok_id: st.id, urun_adi: 'Serbest yazılmış ad', adet: 3, maliyet: 300, satis_fiyati: 700 }] }, admin);
    assert.equal(num((await stokOku('/api/aksesuar-stok', st.kod)).mevcut), 7);
    await api('DELETE', `/api/aksesuarlar/${sat.govde.id}`, undefined, admin);
    assert.equal(num((await stokOku('/api/aksesuar-stok', st.kod)).mevcut), 10);
  });

  it('aksesuar: stok_id yoksa (eski kayıt/serbest metin) ada göre eşleşme sürer ve id kaydedilir', async () => {
    const st = await aksStok(10);
    const sat = await api('POST', '/api/aksesuarlar', { ad_soyad: benzersiz('F3 '), durum: 'tamamlandi', parcalar: [{ urun_adi: st.ad, adet: 1, maliyet: 1, satis_fiyati: 2 }] }, admin);
    assert.equal(num((await stokOku('/api/aksesuar-stok', st.kod)).mevcut), 9);
    assert.equal(sat.govde.parcalar[0].stok_id, st.id);
  });

  it('aksesuar: olmayan stok_id hata vermez, stoğa dokunmaz', async () => {
    const sat = await api('POST', '/api/aksesuarlar', { ad_soyad: benzersiz('F3 '), durum: 'tamamlandi', parcalar: [{ stok_id: 999999999, urun_adi: 'Olmayan ürün', adet: 1, maliyet: 1, satis_fiyati: 2 }] }, admin);
    assert.equal(sat.durum, 201);
    assert.equal(sat.govde.parcalar[0].stok_id, null);
  });

  it('yedek parça: stok 2, iş emri 5 adet → mevcut −3; iş emri silinince 2', async () => {
    const kod = benzersiz('F3Y').slice(0, 19);
    const st = await api('POST', '/api/yedek-parca-stok', { stok_kodu: kod, stok_adi: `Yağ ${kod}`, giren_miktar: 2, alis_fiyati: 10, satis_fiyati: 30 }, admin);
    const ie = await api('POST', '/api/is-emirleri', { musteri_ad_soyad: 'Stok F3', telefon: '05550003344', parcalar: [{ parca_kodu: kod, takilan_parca: 'Yağ', adet: 5, birim_fiyat: 30, maliyet: 10 }] }, admin);
    assert.equal(ie.durum, 201);
    let k = await stokOku('/api/yedek-parca-stok', kod);
    assert.equal(num(k.mevcut), -3);
    assert.equal(num(k.cikan_miktar), 5);
    await api('DELETE', `/api/is-emirleri/${ie.govde.id}`, undefined, admin);
    k = await stokOku('/api/yedek-parca-stok', kod);
    assert.equal(num(k.mevcut), 2);
    assert.equal(num(k.cikan_miktar), 0);
    assert.ok(st.durum === 201);
  });

  it('yedek parça satışı ve e-ticaret satışı da simetrik', async () => {
    const kod = benzersiz('F3P').slice(0, 19);
    const st = await api('POST', '/api/yedek-parca-stok', { stok_kodu: kod, stok_adi: `Balata ${kod}`, giren_miktar: 2, alis_fiyati: 10, satis_fiyati: 30 }, admin);
    const sat = await api('POST', '/api/yedek-parcalar', { urun_adi: 'Balata', alis_fiyati: 1, satis_fiyati: 2, stok_id: st.govde.id, adet: 5 }, admin);
    assert.equal(num((await stokOku('/api/yedek-parca-stok', kod)).mevcut), -3);
    await api('DELETE', `/api/yedek-parcalar/${sat.govde.id}`, undefined, admin);
    assert.equal(num((await stokOku('/api/yedek-parca-stok', kod)).mevcut), 2);

    const a = await aksStok(2);
    const et = await api('POST', '/api/eticaret', { stok_id: a.id, urun_adi: 'x', alis_fiyati: 1, satis_fiyati: 5, adet: 5 }, admin);
    assert.equal(et.durum, 201);
    assert.equal(num((await stokOku('/api/aksesuar-stok', a.kod)).mevcut), -3);
    await api('DELETE', `/api/eticaret/${et.govde.id}`, undefined, admin);
    const sonra = await stokOku('/api/aksesuar-stok', a.kod);
    assert.equal(num(sonra.mevcut), 2);
    assert.equal(num(sonra.cikan_miktar), 0);
  });
});

// ---------------------------------------------------------------- #13 / #14 / #15
describe('motor: yatırımcı ataması, okuma allowlist, yatırımcı raporu', () => {
  let pMotor, pNone, pFiyat, yat;
  const SATIS = (ek = {}) => ({
    plaka: benzersiz('34F3').slice(0, 12), marka: 'Yamaha', model: 'R25', yil: 2020, km: 5000,
    alis_fiyati: 100000, satis_fiyati: 150000, noter_alis: 1000, noter_satis: 5000, masraflar: 2000,
    alici_adi: 'Ali Veli', alici_tc: '11111111111', alici_telefon: '05551112233', alici_adres: 'Gizli adres',
    odeme_sekli: 'havale', durum: 'tamamlandi', kalan_odeme: 20000, yevmiye_no: '55',
    komisyoncu_adi: 'Komisyoncu K', komisyoncu_tutari: 3000, liste_fiyati: 160000, stok_tipi: 'konsinye',
    odeme_detaylari: [{ tip: 'Nakit', tutar: 130000 }], satici_adi: 'Satici S', satici_tc: '22222222222',
    aciklama: 'SATILDI 150 BIN TL', tarih: '2026-09-01', satis_tarihi: '2026-10-01', ...ek,
  });
  before(async () => {
    pMotor = await kullaniciOlustur(api, admin, benzersiz('f3_pm_'), 'personel', { motor_satis_yetkisi: true });
    pNone = await kullaniciOlustur(api, admin, benzersiz('f3_pn_'), 'personel');
    pFiyat = await kullaniciOlustur(api, admin, benzersiz('f3_pf_'), 'personel', { satis_fiyati_gor: true });
    yat = await kullaniciOlustur(api, admin, benzersiz('f3_yat_'), 'yatirimci');
  });
  const motorOlustur = async (ek) => (await api('POST', '/api/ikinci-el-motor', SATIS(ek), admin)).govde.id;

  it('#13 personel POST ile yatırımcı/yatırımcı kârı atayamaz (yok sayılır)', async () => {
    const r = await api('POST', '/api/ikinci-el-motor', SATIS({ yatirimci_id: yat.id, yatirimci_kar: 999, yatirimci_kar_orani: 50 }), pMotor.token);
    assert.equal(r.durum, 201);
    const db = (await sql('SELECT yatirimci_id, yatirimci_kar, yatirimci_kar_orani FROM ikinci_el_motorlar WHERE id = $1', [r.govde.id]))[0];
    assert.equal(db.yatirimci_id, null);
    assert.equal(num(db.yatirimci_kar), 0);
    assert.equal(num(db.yatirimci_kar_orani), 0);
  });

  it('#13 admin yatırımcı atayabilir', async () => {
    const r = await api('POST', '/api/ikinci-el-motor', SATIS({ yatirimci_id: yat.id, yatirimci_kar: 999 }), admin);
    const db = (await sql('SELECT yatirimci_id, yatirimci_kar FROM ikinci_el_motorlar WHERE id = $1', [r.govde.id]))[0];
    assert.equal(db.yatirimci_id, yat.id);
    assert.equal(num(db.yatirimci_kar), 999);
  });

  it('#14 hiç yetkisi olmayan personel satılmış motoru id ile de GÖREMEZ (listeyle aynı kural)', async () => {
    const id = await motorOlustur();
    const r = await api('GET', `/api/ikinci-el-motor/${id}`, undefined, pNone.token);
    assert.equal(r.durum, 404);
    const liste = await api('GET', '/api/ikinci-el-motor', undefined, pNone.token);
    assert.ok(!liste.govde.some((m) => m.id === id));
  });

  it('#14 stoktaki motorda hassas alanlar döndürülmez (allowlist), temel alanlar döner', async () => {
    const id = await motorOlustur({ durum: 'stokta', plaka: benzersiz('34S').slice(0, 12) });
    const r = await api('GET', `/api/ikinci-el-motor/${id}`, undefined, pNone.token);
    assert.equal(r.durum, 200);
    for (const alan of ['plaka', 'marka', 'model', 'yil', 'km', 'durum']) assert.ok(r.govde[alan] !== undefined, `${alan} yok`);
    for (const alan of ['alis_fiyati', 'satis_fiyati', 'noter_alis', 'noter_satis', 'masraflar', 'kar', 'kalan_odeme', 'odeme_detaylari', 'odeme_sekli',
      'alici_adi', 'alici_tc', 'alici_telefon', 'alici_adres', 'satici_adi', 'satici_tc', 'komisyoncu_adi', 'komisyoncu_tutari',
      'yatirimci_id', 'yatirimci_kar', 'liste_fiyati', 'aciklama', 'yevmiye_no']) {
      assert.ok(r.govde[alan] === undefined || r.govde[alan] === null, `${alan} sızıyor: ${JSON.stringify(r.govde[alan])}`);
    }
    // yeni eklenen bir kolon da varsayılan olarak GİZLİ kalır: yanıttaki tüm anahtarlar bilinen güvenli kümede
    const GUVENLI = new Set(['id', 'plaka', 'marka', 'model', 'yil', 'km', 'durum', 'stok_tipi', 'tarih', 'created_at', 'updated_at', 'fatura_kesildi',
      'vitrin_baslik', 'vitrin_aciklama', 'vitrin_segment', 'vitrin_cc', 'vitrin_hasar']);
    const fazla = Object.keys(r.govde).filter((k) => !GUVENLI.has(k) && r.govde[k] !== null && r.govde[k] !== undefined);
    assert.deepEqual(fazla, []);
  });

  it('#14 satış fiyatı yetkisi yalnızca ilgili alanları açar (alış/müşteri kapalı kalır)', async () => {
    const id = await motorOlustur({ durum: 'stokta', plaka: benzersiz('34G').slice(0, 12) });
    const r = (await api('GET', `/api/ikinci-el-motor/${id}`, undefined, pFiyat.token)).govde;
    assert.equal(num(r.satis_fiyati), 150000);
    assert.ok(r.alis_fiyati === undefined || r.alis_fiyati === null);
    assert.ok(r.alici_adi === undefined || r.alici_adi === null);
    assert.ok(r.kar === undefined || r.kar === null);
  });

  it('#14 motor satış yetkilisi satılmış motoru ve kendi alanlarını görür; kâr yine gizli', async () => {
    const id = await motorOlustur();
    const r = await api('GET', `/api/ikinci-el-motor/${id}`, undefined, pMotor.token);
    assert.equal(r.durum, 200);
    assert.equal(num(r.govde.satis_fiyati), 150000);
    assert.equal(num(r.govde.alis_fiyati), 100000);
    assert.equal(num(r.govde.masraflar), 2000);
    assert.equal(num(r.govde.kalan_odeme), 20000);
    assert.equal(r.govde.alici_adi, 'Ali Veli');
    assert.ok(r.govde.kar === undefined || r.govde.kar === null);
    assert.ok(r.govde.yatirimci_kar === undefined || r.govde.yatirimci_kar === null);
  });

  it('#14 admin her şeyi görür', async () => {
    const id = await motorOlustur();
    const r = (await api('GET', `/api/ikinci-el-motor/${id}`, undefined, admin)).govde;
    assert.equal(num(r.kar), 150000 - 100000 - 2000 - 3000);
    assert.equal(r.alici_tc, '11111111111');
  });

  it('#15 yatırımcı raporu müşteri/satıcı kimliği (TC, adres, telefon) taşımaz', async () => {
    await api('POST', '/api/ikinci-el-motor', SATIS({ yatirimci_id: yat.id, yatirimci_kar: 5000 }), admin);
    await api('POST', '/api/ikinci-el-motor', SATIS({ yatirimci_id: yat.id, durum: 'stokta', plaka: benzersiz('34R').slice(0, 12) }), admin);
    const r = await api('GET', '/api/raporlar/yatirimci-rapor', undefined, yat.token);
    assert.equal(r.durum, 200);
    assert.ok(r.govde.satilanlar.length >= 1 && r.govde.stoktakiler.length >= 1);
    for (const m of [...r.govde.satilanlar, ...r.govde.stoktakiler]) {
      for (const alan of ['alici_tc', 'alici_adres', 'alici_telefon', 'alici_adi', 'satici_tc', 'satici_adi', 'komisyoncu_adi', 'odeme_detaylari']) {
        assert.equal(m[alan], undefined, `${alan} sızıyor`);
      }
    }
    // rapor ekranının kullandığı alanlar duruyor
    const s0 = r.govde.satilanlar[0];
    for (const alan of ['plaka', 'marka', 'model', 'satis_fiyati', 'yatirimci_kar']) assert.ok(s0[alan] !== undefined, `${alan} eksik`);
    assert.ok(num(r.govde.ozet.toplam_yatirimci_kar) >= 5000);
  });
});

// ---------------------------------------------------------------- #33
describe('#33 vitrin: yayın durumu/sıra yalnız admin, bağlantılar doğrulanır', () => {
  let pVitrin, ilanId;
  const ilan = (ek = {}) => ({ kategori: 'motor', baslik: benzersiz('f3 ilan '), segment: 'Naked', ...ek });
  before(async () => {
    pVitrin = await kullaniciOlustur(api, admin, benzersiz('f3_vt_'), 'personel', { motor_vitrin_yetkisi: true });
    ilanId = (await api('POST', '/api/vitrin', ilan({ yayinda: true, siralama: 5 }), admin)).govde.id;
  });

  it('personel PUT ile yayından kaldıramaz ve sırayı değiştiremez (diğer alanlar güncellenir)', async () => {
    const r = await api('PUT', `/api/vitrin/${ilanId}`, ilan({ baslik: 'Personelin yeni başlığı', yayinda: false, siralama: 77 }), pVitrin.token);
    assert.equal(r.durum, 200);
    const d = (await api('GET', `/api/vitrin/${ilanId}`, undefined, admin)).govde;
    assert.equal(d.baslik, 'Personelin yeni başlığı');
    assert.equal(d.yayinda, true);
    assert.equal(d.siralama, 5);
  });

  it('admin PUT ile yayın durumunu ve sırayı değiştirebilir', async () => {
    await api('PUT', `/api/vitrin/${ilanId}`, ilan({ baslik: 'Admin', yayinda: false, siralama: 9 }), admin);
    const d = (await api('GET', `/api/vitrin/${ilanId}`, undefined, admin)).govde;
    assert.equal(d.yayinda, false);
    assert.equal(d.siralama, 9);
  });

  it('rubik_link ve video_url yalnızca http(s) olabilir (javascript:, ftp:, boşluk reddedilir)', async () => {
    for (const rubik_link of ['javascript:alert(1)', 'ftp://x.example/a', 'data:text/html,x', 'rubik.example/odeme']) {
      assert.equal((await api('POST', '/api/vitrin', ilan({ rubik_link }), admin)).durum, 400, rubik_link);
      assert.equal((await api('PUT', `/api/vitrin/${ilanId}`, ilan({ rubik_link }), admin)).durum, 400, rubik_link);
    }
    assert.equal((await api('POST', '/api/vitrin', ilan({ video_url: 'javascript:alert(1)' }), admin)).durum, 400);
    assert.equal((await api('POST', '/api/vitrin', ilan({ rubik_link: 'https://rubik.example/odeme/abc', video_url: 'https://youtu.be/abcdefghijk' }), admin)).durum, 201);
    assert.equal((await api('POST', '/api/vitrin', ilan({ rubik_link: '', video_url: '' }), admin)).durum, 201);
  });
});
