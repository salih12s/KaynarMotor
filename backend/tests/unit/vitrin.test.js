/*
 * Vitrin kuralları (sahte veritabanıyla, sunucu/MariaDB yok): kategori yetki matrisi, medya/bağlantı doğrulaması,
 * Range çözümleme, sıralama algoritması, medya önbelleği, liste filtreleri.
 * (Yükleme boyutu sınırı veritabanı paketine bağlıdır: API testlerinde.)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sahteDb } = require('./sahteDb');
const ortak = require('../../modules/vitrin/vitrinOrtak');
const servis = require('../../modules/vitrin/vitrin.service');
const iletisim = require('../../modules/vitrin/vitrinIletisim.service');
const medya = require('../../modules/vitrin/vitrinMedya.service');

const kul = (rol, ek = {}) => ({ id: 1, rol, motor_vitrin_yetkisi: false, aksesuar_vitrin_yetkisi: false, ...ek });
const ADMIN = kul('admin');
const MOTORCU = kul('personel', { motor_vitrin_yetkisi: true });
const AKSESUARCI = kul('personel', { aksesuar_vitrin_yetkisi: true });
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const MP4 = 'data:video/mp4;base64,AAAA';
const sorgular = (db, parca) => db.cagrilar.filter((c) => c.sql.includes(parca));

describe('kategori yetki matrisi (saf)', () => {
  it('admin hepsini yönetir; motor yetkilisi yalnız motor; aksesuar yetkilisi yalnız aksesuar; diğer kategoriler yalnız admin', () => {
    for (const k of ortak.KATEGORILER) assert.equal(ortak.kategoriYetkiliMi(ADMIN, k), true, `admin ${k}`);
    assert.deepEqual(ortak.KATEGORILER.filter((k) => ortak.kategoriYetkiliMi(MOTORCU, k)), ['motor']);
    assert.deepEqual(ortak.KATEGORILER.filter((k) => ortak.kategoriYetkiliMi(AKSESUARCI, k)), ['aksesuar']);
    assert.deepEqual(ortak.KATEGORILER.filter((k) => ortak.kategoriYetkiliMi(kul('personel'), k)), []);
  });
  it('kullanıcı yoksa ya da kategori bilinmiyorsa yetki yok (admin hariç)', () => {
    assert.equal(ortak.kategoriYetkiliMi(null, 'motor'), false);
    assert.equal(ortak.kategoriYetkiliMi(MOTORCU, 'bilinmeyen'), false);
  });
});

describe('motor durumu ve sayı yardımcıları (saf)', () => {
  it('motorDurumu: yalnız motor ilanında; geçersiz/boş "ikinci_el"; diğer kategoride NULL', () => {
    assert.equal(ortak.motorDurumu('motor', 'sifir'), 'sifir');
    assert.equal(ortak.motorDurumu('motor', 'ikinci_el'), 'ikinci_el');
    assert.equal(ortak.motorDurumu('motor', 'xyz'), 'ikinci_el');
    assert.equal(ortak.motorDurumu('motor', undefined), 'ikinci_el');
    assert.equal(ortak.motorDurumu('aksesuar', 'sifir'), null);
  });
  it('numOrNull: boş/null/undefined/sayı olmayan → null; sayı metni → sayı; 0 geçerli', () => {
    for (const bos of ['', null, undefined, 'abc']) assert.equal(ortak.numOrNull(bos), null, String(bos));
    assert.equal(ortak.numOrNull('12.5'), 12.5);
    assert.equal(ortak.numOrNull(0), 0);
  });
});

describe('medya doğrulama (saf)', () => {
  it('dataUrlMime: türü base64\'ü çözmeden okur; küçük harfe çevirir; geçersizde null', () => {
    assert.equal(ortak.dataUrlMime(PNG), 'image/png');
    assert.equal(ortak.dataUrlMime('data:IMAGE/PNG;base64,AAAA'), 'image/png');
    for (const kotu of ['image/png', 'data:image/png,AAAA', '', null, 5]) assert.equal(ortak.dataUrlMime(kotu), null, String(kotu));
  });

  it('görsel yalnız JPEG/PNG/WebP/GIF; video yalnız MP4/WebM/OGG/MOV (text/html XSS\'i engellenir)', () => {
    assert.equal(ortak.medyaHatasi([PNG], undefined), null);
    assert.equal(ortak.medyaHatasi([PNG, 'data:text/html;base64,AAAA'], undefined), 'Görseller yalnızca JPEG, PNG, WebP veya GIF olabilir');
    assert.equal(ortak.medyaHatasi([PNG, 'düz metin'], undefined), 'Görseller yalnızca JPEG, PNG, WebP veya GIF olabilir');
    assert.equal(ortak.medyaHatasi(undefined, MP4), null);
    assert.equal(ortak.medyaHatasi(undefined, 'data:application/x-msdownload;base64,AAAA'), 'Video yalnızca MP4, WebM, OGG veya MOV olabilir');
    assert.equal(ortak.medyaHatasi(undefined, ''), null, 'boş video "yok" demektir');
  });

  it('parseDataUrl: MIME izinli listede değilse null; geçerliyse mime + buffer', () => {
    const r = ortak.parseDataUrl(PNG, ortak.IZINLI_GORSEL);
    assert.equal(r.mime, 'image/png');
    assert.ok(Buffer.isBuffer(r.buffer) && r.buffer.length > 0);
    assert.equal(ortak.parseDataUrl('data:text/html;base64,AAAA', ortak.IZINLI_GORSEL), null);
    assert.ok(ortak.parseDataUrl('data:text/html;base64,AAAA'), 'izinli liste verilmezse yalnızca biçim denetlenir');
    assert.equal(ortak.parseDataUrl(null), null);
  });

  it('bağlantılar yalnız http(s): javascript:, data:, ftp:, şemasız ve metin olmayan reddedilir; boş geçerli', () => {
    assert.equal(ortak.baglantiHatasi('https://odeme.example/x', 'http://video.example/v'), null);
    assert.equal(ortak.baglantiHatasi('', null), null);
    assert.equal(ortak.baglantiHatasi('  https://x.example  ', undefined), null, 'baştaki/sondaki boşluk kırpılır');
    for (const kotu of ['javascript:alert(1)', 'ftp://x', 'data:text/html,x', 'example.com', 'https://a b', 5, {}]) {
      assert.equal(ortak.baglantiHatasi(kotu, undefined), 'Ödeme linki http:// veya https:// ile başlamalıdır', String(kotu));
    }
    assert.equal(ortak.baglantiHatasi(undefined, 'javascript:x'), 'Video linki http:// veya https:// ile başlamalıdır');
  });

  it('hamMb: base64 şişmesi (%33) hesaba katılır, en az 1 MB', () => {
    assert.equal(ortak.hamMb(4 * 1048576), 3);
    assert.equal(ortak.hamMb(10), 1);
    assert.equal(ortak.cokBuyukMesaji(4 * 1048576), 'Dosya çok büyük (en fazla ~3 MB yüklenebilir)');
  });
});

describe('Range çözümleme (saf)', () => {
  it('normal, açık uçlu, sınırı aşan, ters ve bozuk aralıklar', () => {
    assert.deepEqual(medya.aralikCoz('bytes=0-99', 1000), { baslangic: 0, bitis: 99 });
    assert.deepEqual(medya.aralikCoz('bytes=500-', 1000), { baslangic: 500, bitis: 999 });
    assert.deepEqual(medya.aralikCoz('bytes=900-5000', 1000), { baslangic: 900, bitis: 999 }, 'son boyuta kırpılır');
    assert.deepEqual(medya.aralikCoz('bytes=800-100', 1000), { baslangic: 0, bitis: 999 }, 'baş > son: tüm dosya');
    assert.deepEqual(medya.aralikCoz('bytes=abc', 1000), { baslangic: 0, bitis: 999 });
    assert.deepEqual(medya.aralikCoz('', 1000), { baslangic: 0, bitis: 999 });
  });
});

describe('medya servisi: önbellek ve güvenlik', () => {
  it('geçerli görsel bulunur ve BELLEĞE alınır: ikinci istek veritabanına gitmez', async () => {
    const db = sahteDb([['FROM vitrin_gorseller', [{ data: PNG }]]]);
    const ilk = await medya.gorselBul(db, 'onbellek-1');
    assert.equal(ilk.tur, 'bulundu');
    const ikinci = await medya.gorselBul(db, 'onbellek-1');
    assert.equal(ikinci.tur, 'bulundu');
    assert.equal(sorgular(db, 'FROM vitrin_gorseller').length, 1);
  });

  it('kayıt yoksa "yok"; veritabanında kalmış kötü MIME\'lı kayıt "gecersiz" (sunulmaz, önbelleğe girmez)', async () => {
    assert.deepEqual(await medya.gorselBul(sahteDb(), 'yok-1'), { tur: 'yok' });
    const db = sahteDb([['FROM vitrin_gorseller', [{ data: 'data:text/html;base64,PHNjcmlwdD4=' }]]]);
    assert.deepEqual(await medya.gorselBul(db, 'kotu-1'), { tur: 'gecersiz' });
    await medya.gorselBul(db, 'kotu-1');
    assert.equal(sorgular(db, 'FROM vitrin_gorseller').length, 2, 'geçersiz kayıt önbelleğe alınmaz');
  });

  it('görsel için görsel türleri, video için video türleri kabul edilir (çapraz kullanım reddedilir)', async () => {
    const gorselOlarakVideo = sahteDb([['FROM vitrin_gorseller', [{ data: MP4 }]]]);
    assert.equal((await medya.gorselBul(gorselOlarakVideo, 'capraz-1')).tur, 'gecersiz');
    const videoOlarak = sahteDb([['FROM vitrin_videolar', [{ data: MP4 }]]]);
    assert.equal((await medya.videoBul(videoOlarak, 'video-1')).tur, 'bulundu');
  });

  it('hizmet sayfası görseli: kayıt/görsel yoksa "yok", geçersizse "gecersiz", geçerliyse bulunur (bellekte tutulmaz)', async () => {
    assert.deepEqual(await medya.iletisimGorseliBul(sahteDb(), 'motor'), { tur: 'yok' });
    assert.equal((await medya.iletisimGorseliBul(sahteDb([['FROM vitrin_kategori_iletisim', [{ gorsel: 'data:text/html;base64,AA' }]]]), 'motor')).tur, 'gecersiz');
    assert.equal((await medya.iletisimGorseliBul(sahteDb([['FROM vitrin_kategori_iletisim', [{ gorsel: PNG }]]]), 'motor')).tur, 'bulundu');
  });
});

describe('liste filtreleri', () => {
  it('yayında olmayanlar yalnız hepsi isteğinde; geçersiz kategori/durum filtresi yok sayılır', async () => {
    const acik = sahteDb();
    await servis.ilanlariListele(acik, {});
    assert.match(acik.cagrilar[0].sql, /AND yayinda = TRUE/);
    const hepsi = sahteDb();
    await servis.ilanlariListele(hepsi, { hepsi: '1' });
    assert.doesNotMatch(hepsi.cagrilar[0].sql, /AND yayinda = TRUE/);
    const gecersiz = sahteDb();
    await servis.ilanlariListele(gecersiz, { kategori: 'hack', durum: 'xx' });
    assert.deepEqual(gecersiz.cagrilar[0].params, []);
  });

  it('geçerli filtreler parametre sırasıyla uygulanır; sıralama vitrin sırası öncelikli', async () => {
    const db = sahteDb();
    await servis.ilanlariListele(db, { kategori: 'motor', durum: 'sifir', marka: ' Honda ', cc_min: '125', cc_max: '400', km_max: '9000', q: 'pcx' });
    assert.deepEqual(db.cagrilar[0].params, ['motor', 'sifir', 'Honda', 125, 400, 9000, '%pcx%']);
    assert.match(db.cagrilar[0].sql, /ORDER BY siralama ASC, one_cikan DESC, created_at DESC/);
  });

  it('markalar: geçersiz durum yok sayılır; adetler sayıya çevrilir', async () => {
    const db = sahteDb([['FROM vitrin_urunleri', [{ marka: 'Honda', adet: '3' }]]]);
    assert.deepEqual(await servis.markalariListele(db, 'xx'), [{ marka: 'Honda', adet: 3 }]);
    assert.deepEqual(db.cagrilar[0].params, []);
    const sifir = sahteDb();
    await servis.markalariListele(sifir, 'sifir');
    assert.deepEqual(sifir.cagrilar[0].params, ['sifir']);
  });
});

describe('ilan detayı: yayında olmayan ilan gizlidir', () => {
  const kayit = (yayinda) => sahteDb([['FROM vitrin_urunleri WHERE id', [{ id: 5, yayinda }]], ['FROM vitrin_gorseller', [{ id: 11 }, { id: 12 }]]]);

  it('olmayan ilan 404', async () => {
    await assert.rejects(servis.ilanDetay(sahteDb(), 5, async () => null), (h) => h.status === 404 && h.message === 'Kayıt bulunamadı');
  });

  it('yayındaki ilan herkese açık; kullanıcı sorgulanmaz; görsel id listesi eklenir', async () => {
    let soruldu = false;
    const r = await servis.ilanDetay(kayit(true), 5, async () => { soruldu = true; return null; });
    assert.equal(soruldu, false);
    assert.deepEqual(r.gorsel_idler, [11, 12]);
  });

  it('yayında OLMAYAN ilan: anonim ve yetkisiz 404; admin ve vitrin yetkilisi görür', async () => {
    await assert.rejects(servis.ilanDetay(kayit(false), 5, async () => null), (h) => h.status === 404);
    await assert.rejects(servis.ilanDetay(kayit(false), 5, async () => kul('personel')), (h) => h.status === 404);
    assert.equal((await servis.ilanDetay(kayit(false), 5, async () => ADMIN)).id, 5);
    assert.equal((await servis.ilanDetay(kayit(false), 5, async () => AKSESUARCI)).id, 5);
  });
});

describe('sıralama', () => {
  const govde = (ek = {}) => ({ kategori: 'motor', urun_ids: [3, 1, 2], ...ek });

  it('doğrulama: geçersiz kategori 400; yetkisiz kategori 403; boş/uzun/tekrarlı/geçersiz liste 400', async () => {
    const db = sahteDb();
    await assert.rejects(servis.sirala(db, govde({ kategori: 'x' }), ADMIN), (h) => h.status === 400 && h.message === 'Geçersiz kategori');
    await assert.rejects(servis.sirala(db, govde(), AKSESUARCI), (h) => h.status === 403 && h.message === 'Bu kategori için vitrin yetkiniz yok');
    await assert.rejects(servis.sirala(db, govde({ urun_ids: [] }), ADMIN), (h) => h.message === 'Sıralanacak ilan listesi geçersiz');
    await assert.rejects(servis.sirala(db, govde({ urun_ids: 'x' }), ADMIN), (h) => h.message === 'Sıralanacak ilan listesi geçersiz');
    await assert.rejects(servis.sirala(db, govde({ urun_ids: Array.from({ length: 1001 }, (_, i) => i + 1) }), ADMIN), (h) => h.message === 'Sıralanacak ilan listesi geçersiz');
    await assert.rejects(servis.sirala(db, govde({ urun_ids: [1, 1] }), ADMIN), (h) => h.message === 'İlan listesinde geçersiz veya tekrar eden kayıt var');
    await assert.rejects(servis.sirala(db, govde({ urun_ids: [1, 'x'] }), ADMIN), (h) => h.message === 'İlan listesinde geçersiz veya tekrar eden kayıt var');
    await assert.rejects(servis.sirala(db, govde({ urun_ids: [1, -2] }), ADMIN), (h) => h.status === 400);
    assert.equal(db.cagrilar.length, 0, 'doğrulama hatasında veritabanına gidilmez');
  });

  it('başarılı: sıra = liste konumu (CASE id WHEN ... THEN i); tek transaction', async () => {
    const db = sahteDb([['UPDATE vitrin_urunleri SET siralama', [{}, {}, {}]]]);
    await servis.sirala(db, govde(), MOTORCU);
    const g = db.cagrilar[0];
    assert.match(g.sql, /CASE id WHEN \$2 THEN 0 WHEN \$3 THEN 1 WHEN \$4 THEN 2 END/);
    assert.deepEqual(g.params, ['motor', 3, 1, 2]);
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('bazı ilanlar o kategoriye ait değilse (etkilenen satır < liste) 400 ve ROLLBACK', async () => {
    const db = sahteDb([['UPDATE vitrin_urunleri SET siralama', [{}]]]);
    await assert.rejects(servis.sirala(db, govde(), ADMIN), (h) => h.status === 400 && h.message === 'Bazı ilanlar bu kategoriye ait değil');
    assert.deepEqual(db.olaylar, ['BEGIN', 'ROLLBACK']);
  });
});

describe('doğrudan sıraya taşıma ve yayın durumu', () => {
  const siraDb = (idler) => sahteDb([
    ['COALESCE(yayinda, FALSE) AS yayinda', [{ id: 4, kategori: 'motor', yayinda: true }]],
    ['FOR UPDATE', idler.map((id) => ({ id }))],
  ]);

  it('doğrulama: geçersiz sıra numarası 400 (0, negatif, ondalık, metin)', async () => {
    for (const sira of [0, -1, 1.5, 'abc', undefined]) {
      await assert.rejects(servis.siraAyarla(sahteDb(), 4, { sira }), (h) => h.status === 400 && h.message === 'Sıra numarası 1 veya daha büyük olmalı', String(sira));
    }
  });

  it('olmayan ilan 404', async () => {
    await assert.rejects(servis.siraAyarla(sahteDb(), 4, { sira: 1 }), (h) => h.status === 404 && h.message === 'Kayıt bulunamadı');
  });

  it('1. sıraya taşı: [1,2,3,4] içinde 4 → [4,1,2,3]', async () => {
    const r = await servis.siraAyarla(siraDb([1, 2, 3, 4]), 4, { sira: 1 });
    assert.deepEqual(r, { sira: 1, urun_ids: [4, 1, 2, 3] });
  });

  it('listenin sonundan büyük sıra istenirse SONA konur (kırpılır)', async () => {
    const r = await servis.siraAyarla(siraDb([4, 1, 2, 3]), 4, { sira: 99 });
    assert.deepEqual(r, { sira: 4, urun_ids: [1, 2, 3, 4] });
  });

  it('sıra yeni konumu CASE ile yazar; ilan kendi grubunda (kategori, yayın durumu) değilse 404', async () => {
    const db = siraDb([1, 2, 3, 4]);
    await servis.siraAyarla(db, 4, { sira: 2 });
    assert.deepEqual(sorgular(db, 'SET siralama = CASE id')[0].params, ['motor', 1, 4, 2, 3]);
    await assert.rejects(servis.siraAyarla(siraDb([1, 2, 3]), 4, { sira: 1 }), (h) => h.status === 404);
  });

  it('yayın durumu: boolean olmalı (400); olmayan ilan 404; başarılı {id, yayinda} döner', async () => {
    await assert.rejects(servis.yayinDurumuAyarla(sahteDb(), 4, { yayinda: 'true' }), (h) => h.status === 400 && h.message === 'Yayın durumu geçersiz');
    await assert.rejects(servis.yayinDurumuAyarla(sahteDb(), 4, { yayinda: true }), (h) => h.status === 404 && h.message === 'Kayıt bulunamadı');
    const db = sahteDb([['UPDATE vitrin_urunleri v', [{}]], ['SELECT id, yayinda FROM vitrin_urunleri', [{ id: 4, yayinda: true }]]]);
    assert.deepEqual(await servis.yayinDurumuAyarla(db, 4, { yayinda: true }), { id: 4, yayinda: true });
    assert.deepEqual(db.olaylar, ['BEGIN', 'COMMIT']);
  });

  it('yayına alınan ilan eski sırasını değil yayındaki listenin SONUNU alır (SQL kuralı)', async () => {
    const db = sahteDb([['UPDATE vitrin_urunleri v', [{}]], ['SELECT id, yayinda', [{ id: 4, yayinda: true }]]]);
    await servis.yayinDurumuAyarla(db, 4, { yayinda: true });
    const sql = db.cagrilar[0].sql;
    assert.match(sql, /COALESCE\(MAX\(s\.siralama\), -1\) \+ 1/);
    assert.ok(sql.indexOf('siralama = CASE') < sql.indexOf('yayinda = $1'), 'siralama yayinda\'dan ÖNCE yazılır (MariaDB soldan sağa)');
  });
});

describe('ilan yazma doğrulamaları (veritabanına gitmeden reddedilenler)', () => {
  const geçerli = { kategori: 'motor', baslik: 'PCX', segment: 'Scooter' };
  it('oluşturma: geçersiz kategori, yetkisiz kategori, boş başlık, motorda segment yok', async () => {
    const db = sahteDb();
    await assert.rejects(servis.ilanOlustur(db, { ...geçerli, kategori: 'x' }, ADMIN), (h) => h.message === 'Geçersiz kategori');
    await assert.rejects(servis.ilanOlustur(db, geçerli, AKSESUARCI), (h) => h.status === 403 && h.message === 'Bu kategori için vitrin yetkiniz yok');
    await assert.rejects(servis.ilanOlustur(db, { ...geçerli, baslik: '' }, ADMIN), (h) => h.message === 'Başlık zorunlu');
    await assert.rejects(servis.ilanOlustur(db, { ...geçerli, segment: '' }, ADMIN), (h) => h.message === 'Motor ilanı için segment zorunlu');
    assert.equal(db.cagrilar.length, 0);
  });

  it('oluşturma: kötü görsel/video MIME\'ı ve javascript: bağlantısı 400', async () => {
    const db = sahteDb();
    await assert.rejects(servis.ilanOlustur(db, { ...geçerli, gorseller: ['data:text/html;base64,AAAA'] }, ADMIN), (h) => h.status === 400 && /Görseller yalnızca/.test(h.message));
    await assert.rejects(servis.ilanOlustur(db, { ...geçerli, video: 'data:text/html;base64,AAAA' }, ADMIN), (h) => /Video yalnızca/.test(h.message));
    await assert.rejects(servis.ilanOlustur(db, { ...geçerli, rubik_link: 'javascript:alert(1)' }, ADMIN), (h) => h.message === 'Ödeme linki http:// veya https:// ile başlamalıdır');
    await assert.rejects(servis.ilanOlustur(db, { ...geçerli, video_url: 'ftp://x' }, ADMIN), (h) => h.message === 'Video linki http:// veya https:// ile başlamalıdır');
    assert.equal(db.cagrilar.length, 0);
  });

  it('güncelleme: olmayan ilan 404; hem mevcut hem hedef kategori yetkisi şart (personel kapsam dışına çıkamaz)', async () => {
    await assert.rejects(servis.ilanGuncelle(sahteDb(), 5, geçerli, ADMIN), (h) => h.status === 404);
    const aksesuarIlani = sahteDb([['FROM vitrin_urunleri WHERE id', [{ id: 5, kategori: 'aksesuar', yayinda: true, siralama: 1 }]]]);
    await assert.rejects(servis.ilanGuncelle(aksesuarIlani, 5, { ...geçerli, kategori: 'aksesuar' }, MOTORCU), (h) => h.status === 403);
    const motorIlani = sahteDb([['FROM vitrin_urunleri WHERE id', [{ id: 5, kategori: 'motor', yayinda: true, siralama: 1 }]]]);
    await assert.rejects(servis.ilanGuncelle(motorIlani, 5, { ...geçerli, kategori: 'aksesuar' }, MOTORCU), (h) => h.status === 403, 'motor ilanını aksesuara taşıyamaz');
  });

  it('silme: personel başka kategorideki ilanı silemez (403); olmayan ilan sessizce başarılı', async () => {
    const aksesuar = sahteDb([['SELECT kategori', [{ kategori: 'aksesuar' }]]]);
    await assert.rejects(servis.ilanSil(aksesuar, 5, MOTORCU), (h) => h.status === 403);
    assert.equal(sorgular(aksesuar, 'DELETE').length, 0);
    const yok = sahteDb();
    await servis.ilanSil(yok, 5, MOTORCU);
    assert.equal(sorgular(yok, 'DELETE FROM vitrin_urunleri').length, 1);
  });
});

describe('segmentler ve iletişim', () => {
  it('segment adı boş/metin değil 400 "Segment adı zorunlu"; var olanı ekleyince mevcut kaydı döner', async () => {
    for (const ad of ['', '   ', undefined, 5]) await assert.rejects(iletisim.segmentEkle(sahteDb(), { ad }), (h) => h.status === 400 && h.message === 'Segment adı zorunlu', String(ad));
    const db = sahteDb([['MAX(sira)', [{ s: 9 }]], ['SELECT id, ad FROM vitrin_segmentler WHERE ad', [{ id: 3, ad: 'Scooter' }]]]);
    assert.deepEqual(await iletisim.segmentEkle(db, { ad: ' Scooter ' }), { id: 3, ad: 'Scooter' });
    assert.deepEqual(sorgular(db, 'INSERT IGNORE')[0].params, ['Scooter', 9], 'sıra = mevcut en büyük + 1');
  });

  it('segmentiGaranti hatayı YUTAR (ilan kaydı segment hatasından etkilenmez) ve boş adda hiçbir şey yapmaz', async () => {
    const db = sahteDb([['MAX(sira)', new Error('db hatası')]]);
    await iletisim.segmentiGaranti(db, 'Yeni');
    const bos = sahteDb();
    await iletisim.segmentiGaranti(bos, '');
    assert.equal(bos.cagrilar.length, 0);
  });

  it('iletişim: gorsel_var 1/0 → true/false', async () => {
    const db = sahteDb([['FROM vitrin_kategori_iletisim', [{ kategori: 'motor', gorsel_var: 1 }, { kategori: 'sigorta', gorsel_var: '0' }]]]);
    assert.deepEqual((await iletisim.iletisimleriListele(db)).map((r) => r.gorsel_var), [true, false]);
  });

  it('iletişim kaydı: geçersiz kategori 400, yetkisiz kategori 403, kötü görsel 400', async () => {
    const db = sahteDb();
    await assert.rejects(iletisim.iletisimKaydet(db, 'x', {}, ADMIN), (h) => h.message === 'Geçersiz kategori');
    await assert.rejects(iletisim.iletisimKaydet(db, 'motor', {}, AKSESUARCI), (h) => h.status === 403);
    await assert.rejects(iletisim.iletisimKaydet(db, 'motor', { gorsel: 'data:text/html;base64,AAAA' }, ADMIN), (h) => h.message === 'Görsel yalnızca JPEG, PNG, WebP veya GIF olabilir');
    assert.equal(db.cagrilar.length, 0);
  });
});
