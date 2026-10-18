/*
 * Faz 8 regression testleri (gerçek sunucu + gerçek MariaDB): kalan rapor maddeleri.
 *
 *   #45 medya uçları: hata yanıtları uzun süre önbelleğe girmez; geçerli medya hâlâ sunulur
 *   #46 şifre sıfırlanınca eski token'lar geçersiz olur; JWT_SECRET yoksa sunucu açılmaz
 *   #47 şifre en az 8 karakter
 *   #48 yedek parça stok kodu değişince iş emri bağlantısı kopmaz (silince stok yine geri gelir)
 *   #49 negatif tutar reddedilir (400)
 *   #50 çok uzun metin 500 değil 400 verir
 *   #51 toplu stok içe aktarma ya hep ya hiç
 *   #52 aksesuar sıradaki stok kodu gerçek barkodlardan (EAN) etkilenmez
 *   #53 motor güncelleme: vitrin senkronu ve eşzamanlı güncelleme
 */
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { sunucuBaslat, kullaniciOlustur, sunucuArgumanlari } = require('./yardimci');

const SON = Date.now().toString(36);
const num = (v) => Number(v);
let s, api, admin, sayac = 0;
const benzersiz = (onek) => `${onek}${SON}${++sayac}`;

before(async () => { s = await sunucuBaslat(); api = s.api; admin = s.admin; });
after(() => s && s.durdur());

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

describe('#45 medya uçları', () => {
  it('olmayan görsel 404 verir ve "bir yıl önbellekte tut" başlığı taşımaz', async () => {
    const r = await api('GET', '/api/vitrin/gorsel/99999999');
    assert.equal(r.durum, 404);
    const cc = r.basliklar.get('cache-control') || '';
    assert.ok(!/immutable|max-age=31536000/.test(cc), `404 uzun süre önbelleğe girer: ${cc}`);
  });

  it('geçerli görsel sunulur, değişmez başlıkla; ikinci istek aynı baytları verir', async () => {
    const c = await api('POST', '/api/vitrin', { kategori: 'aksesuar', baslik: benzersiz('F8 medya '), gorseller: [PNG] }, admin);
    assert.equal(c.durum, 201);
    const url = `${s.url}/api/vitrin/gorsel/${c.govde.kapak_gorsel_id}`;
    const bir = await fetch(url); const iki = await fetch(url);
    assert.equal(bir.status, 200); assert.equal(iki.status, 200);
    assert.equal(bir.headers.get('content-type'), 'image/png');
    assert.match(bir.headers.get('cache-control'), /immutable/);
    assert.deepEqual(Buffer.from(await bir.arrayBuffer()), Buffer.from(await iki.arrayBuffer()));
  });
});

describe('#46 oturum: şifre sıfırlanınca eski token geçersiz', () => {
  it('sıfırlamadan sonra eski token 401, yeni şifreyle alınan token çalışır', async () => {
    const ad = benzersiz('f8_oturum_');
    const k = await kullaniciOlustur(api, admin, ad, 'personel');
    assert.equal((await api('GET', '/api/auth/verify', undefined, k.token)).durum, 200);

    const sifirla = await api('PATCH', `/api/auth/users/${k.id}/sifre`, { sifre: 'Yeni-sifre-8' }, admin);
    assert.equal(sifirla.durum, 200);

    const eski = await api('GET', '/api/auth/verify', undefined, k.token);
    assert.equal(eski.durum, 401, 'eski token hâlâ geçerli');
    assert.equal(eski.govde.code, 'TOKEN_INVALID');

    const g = await api('POST', '/api/auth/login', { kullanici_adi: ad, sifre: 'Yeni-sifre-8' });
    assert.equal(g.durum, 200);
    assert.equal((await api('GET', '/api/auth/verify', undefined, g.govde.token)).durum, 200);
  });

  it('yetki değişikliği oturumu düşürmez (yalnız şifre değişimi düşürür)', async () => {
    const k = await kullaniciOlustur(api, admin, benzersiz('f8_yetki_'), 'personel');
    await api('PATCH', `/api/auth/users/${k.id}/yetkiler`, { servis_yetkisi: true }, admin);
    assert.equal((await api('GET', '/api/auth/verify', undefined, k.token)).durum, 200);
  });

  it('JWT_SECRET tanımsızsa sunucu hata koduyla kapanır (güvensiz açılmaz)', async () => {
    const cocuk = spawn(process.execPath, sunucuArgumanlari(), {
      cwd: path.resolve(__dirname, '..', '..'),
      env: { ...process.env, PORT: '0', NODE_ENV: 'test', JWT_SECRET: '' }, // boş değer .env dosyasının doldurmasını da engeller
      stdio: 'ignore',
    });
    const kod = await new Promise((coz) => { cocuk.on('exit', coz); setTimeout(() => { cocuk.kill(); coz('ACIK_KALDI'); }, 8000); });
    assert.equal(typeof kod, 'number', 'sunucu JWT_SECRET olmadan açık kaldı');
    assert.notEqual(kod, 0);
  });
});

describe('#47 şifre kuralı', () => {
  it('7 karakter reddedilir, 8 karakter kabul edilir', async () => {
    const dar = await api('POST', '/api/auth/users', { kullanici_adi: benzersiz('f8_s7_'), sifre: '1234567', ad_soyad: 'X', rol: 'personel' }, admin);
    assert.equal(dar.durum, 400);
    const tamam = await api('POST', '/api/auth/users', { kullanici_adi: benzersiz('f8_s8_'), sifre: '12345678', ad_soyad: 'X', rol: 'personel' }, admin);
    assert.equal(tamam.durum, 201);
  });
});

describe('#48 yedek parça stok kodu değişince iş emri bağlantısı kopmaz', () => {
  it('stok kodu yeniden adlandırılır; iş emri silinince stok yine başlangıç değerine döner', async () => {
    const kod = benzersiz('F8Y').slice(0, 19), yeniKod = benzersiz('F8N').slice(0, 19);
    const st = await api('POST', '/api/yedek-parca-stok', { stok_kodu: kod, stok_adi: `Zincir ${kod}`, giren_miktar: 10, alis_fiyati: 50, satis_fiyati: 120 }, admin);
    assert.equal(st.durum, 201);
    const e = await api('POST', '/api/is-emirleri', { musteri_ad_soyad: benzersiz('F8 '), durum: 'beklemede', parcalar: [{ parca_kodu: kod, takilan_parca: 'Zincir', adet: 3, birim_fiyat: 120, maliyet: 50 }] }, admin);
    assert.equal(e.durum, 201);
    assert.equal(num((await api('GET', `/api/yedek-parca-stok/barkod/${kod}`, undefined, admin)).govde.mevcut), 7);

    const r = await api('PUT', `/api/yedek-parca-stok/${st.govde.id}`, { stok_kodu: yeniKod, stok_adi: `Zincir ${kod}`, giren_miktar: 10, alis_fiyati: 50, satis_fiyati: 120 }, admin);
    assert.equal(r.durum, 200);

    assert.equal((await api('DELETE', `/api/is-emirleri/${e.govde.id}`, undefined, admin)).durum, 200);
    assert.equal(num((await api('GET', `/api/yedek-parca-stok/barkod/${yeniKod}`, undefined, admin)).govde.mevcut), 10, 'iade yeni koda gitmedi');
  });
});

describe('#49 negatif tutar reddedilir', () => {
  it('iş emri parçası, aksesuar satırı, motor ve stok negatif tutarla 400 alır; sıfır geçerlidir', async () => {
    const ie = await api('POST', '/api/is-emirleri', { musteri_ad_soyad: benzersiz('F8 '), parcalar: [{ parca_kodu: '', takilan_parca: 'x', adet: 1, birim_fiyat: -100, maliyet: 0 }] }, admin);
    assert.equal(ie.durum, 400);
    const ak = await api('POST', '/api/aksesuarlar', { ad_soyad: benzersiz('F8 '), durum: 'beklemede', parcalar: [{ urun_adi: 'x', adet: 1, maliyet: -5, satis_fiyati: 10 }] }, admin);
    assert.equal(ak.durum, 400);
    const mt = await api('POST', '/api/ikinci-el-motor', { plaka: benzersiz('34N').slice(0, 12), marka: 'X', model: 'Y', alis_fiyati: -1 }, admin);
    assert.equal(mt.durum, 400);
    const sk = await api('POST', '/api/aksesuar-stok', { stok_kodu: benzersiz('F8S').slice(0, 19), stok_adi: 'x', giren_miktar: 1, alis_fiyati: 1, satis_fiyati: -3 }, admin);
    assert.equal(sk.durum, 400);

    const sifir = await api('POST', '/api/is-emirleri', { musteri_ad_soyad: benzersiz('F8 '), parcalar: [{ parca_kodu: '', takilan_parca: 'x', adet: 1, birim_fiyat: 0, maliyet: 0 }] }, admin);
    assert.equal(sifir.durum, 201);
    // kâr alanları eksi olabilir (zararına satış): engellenmez
    const zarar = await api('POST', '/api/ikinci-el-motor', { plaka: benzersiz('34Z').slice(0, 12), marka: 'X', model: 'Y', alis_fiyati: 100, satis_fiyati: 50 }, admin);
    assert.equal(zarar.durum, 201);
    assert.ok(num(zarar.govde.kar) < 0);
  });
});

describe('#50 çok uzun metin 500 değil 400 verir', () => {
  it('iş emri, stok, motor ve müşteri', async () => {
    const uzun = (n) => 'x'.repeat(n);
    assert.equal((await api('POST', '/api/is-emirleri', { musteri_ad_soyad: uzun(300), parcalar: [] }, admin)).durum, 400);
    assert.equal((await api('POST', '/api/aksesuar-stok', { stok_kodu: uzun(60), stok_adi: 'x', giren_miktar: 1 }, admin)).durum, 400);
    assert.equal((await api('POST', '/api/ikinci-el-motor', { plaka: uzun(60), marka: 'X', model: 'Y' }, admin)).durum, 400);
    assert.equal((await api('POST', '/api/musteriler', { ad_soyad: uzun(300), telefon: '1', adres: 'a' }, admin)).durum, 400);
  });
});

describe('#51 toplu stok içe aktarma ya hep ya hiç', () => {
  it('ortadaki hatalı satır yüzünden hiçbir kayıt yazılmaz', async () => {
    const ilk = benzersiz('F8T').slice(0, 19);
    const r = await api('POST', '/api/aksesuar-stok/toplu', { stoklar: [
      { stok_kodu: ilk, stok_adi: 'Ilk', giren_miktar: 5, alis_fiyati: 1, satis_fiyati: 2 },
      { stok_kodu: 'U'.repeat(60), stok_adi: 'Hatali', giren_miktar: 1, alis_fiyati: 1, satis_fiyati: 2 },
    ] }, admin);
    assert.equal(r.durum, 400);
    assert.equal((await api('GET', `/api/aksesuar-stok/barkod/${ilk}`, undefined, admin)).durum, 404, 'ilk satır yazılmış kalmış');
  });
});

describe('#52 aksesuar sıradaki stok kodu', () => {
  it('gerçek barkod (EAN) araya girse de dahili sıra bozulmaz', async () => {
    const mevcut = (await api('GET', '/api/aksesuar-stok/next-stok-kodu', undefined, admin)).govde.nextStokKodu;
    assert.match(mevcut, /^0\d{12}$/);
    const ean = '9' + String(Date.now()).slice(-12); // 13 haneli, 0 ile başlamayan gerçek barkod
    await api('POST', '/api/aksesuar-stok', { stok_kodu: ean, stok_adi: benzersiz('F8 EAN '), giren_miktar: 1 }, admin);
    const sonra = (await api('GET', '/api/aksesuar-stok/next-stok-kodu', undefined, admin)).govde.nextStokKodu;
    assert.equal(sonra, mevcut, 'EAN yüzünden sıradaki kod zıpladı');
  });
});

describe('#53 motor güncelleme', () => {
  const motor = (ek = {}) => ({ plaka: benzersiz('34M').slice(0, 12), marka: 'Honda', model: 'CB', alis_fiyati: 1000, satis_fiyati: 2000, durum: 'stokta', liste_fiyati: 3000, ...ek });

  it('satılınca bağlı ilan yayından kalkar; liste fiyatı değişince ilan fiyatı eşitlenir', async () => {
    const m = await api('POST', '/api/ikinci-el-motor', motor(), admin);
    assert.equal(m.durum, 201);
    const ilan = await api('POST', '/api/vitrin', { kategori: 'motor', segment: 'Naked', baslik: benzersiz('F8 ilan '), fiyat: 3000, stok_motor_id: m.govde.id, yayinda: true }, admin);
    assert.equal(ilan.durum, 201);

    assert.equal((await api('PUT', `/api/ikinci-el-motor/${m.govde.id}`, { liste_fiyati: 3500 }, admin)).durum, 200);
    assert.equal(num((await api('GET', `/api/vitrin/${ilan.govde.id}`, undefined, admin)).govde.fiyat), 3500);

    assert.equal((await api('PUT', `/api/ikinci-el-motor/${m.govde.id}`, { durum: 'tamamlandi' }, admin)).durum, 200);
    const sonra = (await api('GET', `/api/vitrin/${ilan.govde.id}`, undefined, admin)).govde;
    assert.equal(sonra.yayinda, false, 'satılan motorun ilanı yayında kaldı');
  });

  it('eşzamanlı iki güncelleme ikisi de başarılı olur (500 yok)', async () => {
    const m = await api('POST', '/api/ikinci-el-motor', motor(), admin);
    const yanit = await Promise.all([1, 2, 3].map((i) => api('PUT', `/api/ikinci-el-motor/${m.govde.id}`, { aciklama: `not ${i}` }, admin)));
    assert.deepEqual(yanit.map((y) => y.durum), [200, 200, 200]);
  });
});
