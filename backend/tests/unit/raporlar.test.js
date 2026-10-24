/*
 * Rapor hesapları ve rapor/veresiye servis kuralları (sahte veritabanıyla, sunucu/MariaDB yok).
 * Para toplamları burada ELLE hesaplanmış sayılarla sabitlenir: bir formül değişirse test kırılır.
 *
 * NOT (mevcut davranış, bilerek sabitlenmiştir): toplam.gelir/kar/maliyet yedek parça satışlarını İÇERMEZ;
 * yedek parça ayrı alanlarda (yedekParcaToplamDeger/Maliyet) raporlanır. Değiştirmek ayrı bir iştir.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sahteDb } = require('./sahteDb');
const hesap = require('../../modules/raporlar/raporlar/raporlar.hesap');
const servis = require('../../modules/raporlar/raporlar/raporlar.service');
const veresiye = require('../../modules/raporlar/veresiye/veresiye.service');

// DECIMAL kolonlar sürücüden METİN gelir.
const isEmirleri = [
  { gercek_toplam_ucret: '100.50', toplam_maliyet: '40', kar: '60.50' },
  { gercek_toplam_ucret: '200', toplam_maliyet: '100', kar: '100' },
];
const aksesuarlar = [{ toplam_satis: '580', toplam_maliyet: '300', kar: '280' }];
const motorlar = [
  { satis_fiyati: '150000', alis_fiyati: '100000', masraflar: '2000', kar: '45000', yatirimci_kar: '5000', komisyoncu_tutari: '3000', noter_satis: '120000' },
  { satis_fiyati: '80000', alis_fiyati: '70000', masraflar: null, kar: '10000', yatirimci_kar: null, komisyoncu_tutari: null, noter_satis: '60000' },
];
const eticaret = [
  { satis_fiyati: '300', alis_fiyati: '100', adet: 2, kar: '80' },
  { satis_fiyati: '50', alis_fiyati: '20', adet: null, kar: '10' },
];

describe('günlük rapor hesabı', () => {
  const r = hesap.gunlukHesapla('2026-10-01', { isEmirleri, aksesuarlar, motorlar, eticaret });

  it('iş emri toplamları', () => {
    assert.deepEqual([r.is_emirleri.gelir, r.is_emirleri.maliyet, r.is_emirleri.kar], [300.5, 140, 160.5]);
  });

  it('motor: gelir = satış; maliyet = alış + masraf; işletme payı = toplam kâr − yatırımcı kârı; NULL 0 sayılır', () => {
    assert.equal(r.motorlar.gelir, 230000);
    assert.equal(r.motorlar.maliyet, 100000 + 2000 + 70000);
    assert.equal(r.motorlar.kar_toplam, 55000);
    assert.equal(r.motorlar.yatirimci_kar, 5000);
    assert.equal(r.motorlar.kar, 50000);
    assert.equal(r.motorlar.komisyon, 3000);
  });

  it('e-ticaret: gelir = fiyat x adet; adet boşsa 1', () => {
    assert.equal(r.eticaret.gelir, 300 * 2 + 50 * 1);
    assert.equal(r.eticaret.kar, 90);
  });

  it('toplam gelir ve kâr dört kaynağın toplamı (kâr: motorda YATIRIMCI payı düşülmüş)', () => {
    assert.equal(r.toplam.gelir, 300.5 + 580 + 230000 + 650);
    assert.equal(r.toplam.kar, 160.5 + 280 + 50000 + 90);
  });

  it('tarih ve kayıtlar olduğu gibi yanıtta', () => {
    assert.equal(r.tarih, '2026-10-01');
    assert.equal(r.motorlar.kayitlar.length, 2);
  });

  it('hiç kayıt yoksa her toplam 0', () => {
    const bos = hesap.gunlukHesapla('2026-10-01', { isEmirleri: [], aksesuarlar: [], motorlar: [], eticaret: [] });
    assert.deepEqual([bos.toplam.gelir, bos.toplam.kar], [0, 0]);
  });
});

describe('aralık rapor hesabı', () => {
  const yedekParcalar = [
    { satis_fiyati: '150', alis_fiyati: '90' },
    { satis_fiyati: '50', alis_fiyati: '30' },
  ];
  const r = hesap.aralikHesapla('2026-10-01', '2026-10-31', { isEmirleri, aksesuarlar, motorlar, eticaret, yedekParcalar, motorStokToplam: 123456 });

  it('toplam maliyet = iş emri + aksesuar + motor (alış+masraf) + e-ticaret (alış x adet)', () => {
    assert.equal(r.eticaretMaliyet, 100 * 2 + 20 * 1);
    assert.equal(r.toplam.maliyet, 140 + 300 + 172000 + 220);
  });

  it('motor alanları: noter satış cirosu, yatırımcı kârı, komisyon', () => {
    assert.equal(r.motorNoterSatisCiro, 180000);
    assert.equal(r.motorYatirimciKar, 5000);
    assert.equal(r.motorKomisyon, 3000);
    assert.equal(r.motorKar, 50000);
    assert.equal(r.motorKarToplam, 55000);
  });

  it('yedek parça ayrı raporlanır ve toplam gelire GİRMEZ (mevcut davranış)', () => {
    assert.equal(r.yedekParcaToplamDeger, 200);
    assert.equal(r.yedekParcaToplamMaliyet, 120);
    assert.equal(r.toplam.gelir, 300.5 + 580 + 230000 + 650);
  });

  it('motor stok toplamı ve tarih aralığı yanıtta', () => {
    assert.equal(r.motorStokToplam, 123456);
    assert.deepEqual([r.baslangic, r.bitis], ['2026-10-01', '2026-10-31']);
  });
});

describe('genel rapor hesabı', () => {
  it('toplam gelir/kâr SQL ile toplanmış metin değerlerden hesaplanır', () => {
    const r = hesap.genelHesapla({
      isEmirleri: { gelir: '100', kar: '40' },
      aksesuarlar: { gelir: '200.5', kar: '50' },
      motorlar: { gelir: '1000', kar: '300' },
      eticaret: { gelir: '10', kar: '2' },
      yedekParcalar: { toplam_deger: '9' },
    });
    assert.deepEqual([r.toplam.gelir, r.toplam.kar], [1310.5, 392]);
    assert.deepEqual(r.yedek_parcalar, { toplam_deger: '9' });
  });
});

describe('yatırımcı raporu hesabı', () => {
  it('adetler ve özet: yatırımcı kârı, satış, alış, stok değeri (stoktakilerin ALIŞ fiyatı)', () => {
    const r = hesap.yatirimciRaporuHesapla(
      [{ alis_fiyati: '1000' }, { alis_fiyati: '500' }],
      [
        { yatirimci_kar: '100', satis_fiyati: '1500', alis_fiyati: '1000' },
        { yatirimci_kar: null, satis_fiyati: '200', alis_fiyati: '150' },
      ],
    );
    assert.deepEqual(r.ozet, { stok_adet: 2, satilan_adet: 2, toplam_yatirimci_kar: 100, toplam_satis: 1700, toplam_alis: 1150, stok_degeri: 1500 });
  });
});

describe('rapor servisi: tarih ve erişim kuralları', () => {
  it('günlük: tarih verilmezse BUGÜN (UTC), verilirse o tarih kullanılır', async () => {
    const db = sahteDb();
    const r = await servis.gunluk(db, {}, new Date('2026-10-18T23:30:00Z'));
    assert.equal(r.tarih, '2026-10-18');
    assert.deepEqual(db.cagrilar[0].params, ['2026-10-18']);
    const db2 = sahteDb();
    assert.equal((await servis.gunluk(db2, { tarih: '2026-01-05' })).tarih, '2026-01-05');
    assert.deepEqual(db2.cagrilar[0].params, ['2026-01-05']);
  });

  it('aralık: başlangıç ya da bitiş eksikse 400 (veritabanına gidilmez)', async () => {
    const db = sahteDb();
    await assert.rejects(servis.aralik(db, { baslangic: '2026-10-01' }), (h) => h.status === 400 && h.message === 'Başlangıç ve bitiş tarihi gerekli');
    await assert.rejects(servis.aralik(db, {}), (h) => h.status === 400);
    assert.equal(db.cagrilar.length, 0);
  });

  it('aralık: motor stok toplamı veritabanından okunur', async () => {
    const db = sahteDb([['SUM(alis_fiyati)', [{ toplam_alis: '777' }]]]);
    const r = await servis.aralik(db, { baslangic: '2026-10-01', bitis: '2026-10-31' });
    assert.equal(r.motorStokToplam, 777);
  });

  const KUL = (rol, id = 10) => ({ id, rol });
  it('yatırımcı raporu: yatırımcı YALNIZCA kendi verisini görür (yatirimci_id parametresi yok sayılır)', async () => {
    const db = sahteDb();
    await servis.yatirimciRaporu(db, KUL('yatirimci', 42), { yatirimci_id: '99' });
    assert.ok(
      db.cagrilar.every((c) => c.params[0] === 42),
      'tüm sorgular kendi id ile',
    );
  });

  it('yatırımcı raporu: admin yatirimci_id ile istediğini görür; id yoksa 400', async () => {
    const db = sahteDb();
    await servis.yatirimciRaporu(db, KUL('admin', 1), { yatirimci_id: '99' });
    assert.ok(db.cagrilar.every((c) => c.params[0] === 99));
    await assert.rejects(servis.yatirimciRaporu(sahteDb(), KUL('admin'), {}), (h) => h.status === 400 && h.message === 'yatirimci_id gerekli');
  });

  it('yatırımcı raporu: diğer roller 403 "Yetkiniz yok" (veritabanına dokunulmaz)', async () => {
    for (const rol of ['personel', 'muhasebeci']) {
      const db = sahteDb();
      await assert.rejects(servis.yatirimciRaporu(db, KUL(rol), { yatirimci_id: '1' }), (h) => h.status === 403 && h.message === 'Yetkiniz yok');
      assert.equal(db.cagrilar.length, 0);
    }
  });

  it('yatırımcı satış sorgusu tarih filtresini yalnızca verildiğinde ekler', async () => {
    const db = sahteDb();
    await servis.yatirimciRaporu(db, KUL('yatirimci', 5), {});
    const bos = db.cagrilar.find((c) => c.sql.includes("durum = 'tamamlandi'"));
    assert.deepEqual(bos.params, [5]);
    const db2 = sahteDb();
    await servis.yatirimciRaporu(db2, KUL('yatirimci', 5), { baslangic: '2026-01-01', bitis: '2026-02-01' });
    assert.deepEqual(db2.cagrilar.find((c) => c.sql.includes("durum = 'tamamlandi'")).params, [5, '2026-01-01', '2026-02-01']);
  });

  it('yatırımcı raporu kolonları alıcı/satıcı kimliğini (TC, adres, telefon) İÇERMEZ (KVKK)', async () => {
    const db = sahteDb();
    await servis.yatirimciRaporu(db, KUL('yatirimci', 5), {});
    for (const c of db.cagrilar)
      for (const alan of ['alici_tc', 'alici_adres', 'alici_telefon', 'satici_tc', 'komisyoncu_telefon']) assert.ok(!c.sql.includes(alan), `${alan} sorguda`);
  });
});

describe('veresiye: borç birleştirme (saf)', () => {
  const T1 = '2026-10-01T10:00:00Z';
  const T2 = '2026-10-05T10:00:00Z';
  const g = {
    motor: [
      {
        id: 1,
        musteri_adi: 'Ali',
        telefon: '0555',
        kalan_odeme: '5000',
        toplam_tutar: '90000',
        tarih: T1,
        plaka: '34A',
        marka: 'Honda',
        model: 'PCX',
        alis_fiyati: '70000',
        noter_satis: '60000',
      },
    ],
    servis: [
      {
        id: 2,
        fis_no: 7,
        musteri_adi: null,
        telefon: null,
        kalan_odeme: '300',
        toplam_tutar: '800',
        tarih: T2,
        marka: 'Yamaha',
        model_tip: 'R25',
        parcalar: [],
      },
    ],
    aksesuar: [
      {
        id: 3,
        musteri_adi: 'Veli',
        telefon: '0532',
        kalan_odeme: '100',
        toplam_tutar: '400',
        tarih: null,
        notlar: 'not',
        parcalar: [{ urun_adi: 'Kask' }, { urun_adi: null }, { urun_adi: 'Eldiven' }],
      },
    ],
    yedek: [
      {
        id: 4,
        musteri_adi: 'Can',
        telefon: '0505',
        kalan_odeme: '50',
        toplam_tutar: '150',
        alis_fiyati: '90',
        tarih: '2026-09-01T00:00:00Z',
        urun_adi: 'Balata',
      },
    ],
  };
  const r = veresiye.borclariBirlestir(g);

  it('en yeni önce sıralanır; tarihi olmayan en sona', () => {
    assert.deepEqual(
      r.borclar.map((b) => b.kaynak_key),
      ['servis', 'motor', 'yedek_parca', 'aksesuar'],
    );
  });

  it('özet: kaynak bazında kalan ödeme, toplam borç ve kayıt sayısı', () => {
    assert.deepEqual(r.ozet, { motor: 5000, servis: 300, aksesuar: 100, yedek_parca: 50, toplam: 5450, kayit_sayisi: 4 });
  });

  it('müşteri adı boşsa "-", telefon boşsa "" ; tutarlar sayıya çevrilir', () => {
    const servis = r.borclar.find((b) => b.kaynak_key === 'servis');
    assert.equal(servis.musteri_adi, '-');
    assert.equal(servis.telefon, '');
    assert.equal(servis.toplam_tutar, 800);
    assert.equal(servis.fis_no, 7);
  });

  it('açıklama: motor "plaka marka model"; servis "Fiş #no • marka model"; aksesuar ürün adları (boşlar atılır)', () => {
    assert.equal(r.borclar.find((b) => b.kaynak_key === 'motor').aciklama, '34A Honda PCX');
    assert.equal(r.borclar.find((b) => b.kaynak_key === 'servis').aciklama, 'Fiş #7 • Yamaha R25');
    assert.equal(r.borclar.find((b) => b.kaynak_key === 'aksesuar').aciklama, 'Kask, Eldiven');
  });

  it('aksesuarda parça yoksa açıklama notlardan, o da yoksa boş', () => {
    const a = veresiye.borclariBirlestir({
      motor: [],
      servis: [],
      yedek: [],
      aksesuar: [{ id: 1, kalan_odeme: '1', toplam_tutar: '1', notlar: 'sadece not', parcalar: [] }],
    });
    assert.equal(a.borclar[0].aciklama, 'sadece not');
    const b = veresiye.borclariBirlestir({ motor: [], servis: [], yedek: [], aksesuar: [{ id: 1, kalan_odeme: '1', toplam_tutar: '1', parcalar: [] }] });
    assert.equal(b.borclar[0].aciklama, '');
  });

  it('hiç borç yoksa boş liste ve sıfır özet', () => {
    const bos = veresiye.borclariBirlestir({ motor: [], servis: [], aksesuar: [], yedek: [] });
    assert.deepEqual(bos, { borclar: [], ozet: { motor: 0, servis: 0, aksesuar: 0, yedek_parca: 0, toplam: 0, kayit_sayisi: 0 } });
  });
});
