/*
 * Motor görünüm politikası (saf fonksiyonlar: veritabanı/HTTP yok). "Kim hangi alanı görür" kuralı para ve KVKK
 * açısından en riskli kural; burada her rol için ayrı ayrı sınanır.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeMotor, sanitizeOzet, motorKapsami, muhasebeMotorGorur } = require('../../modules/motor/ikinciElMotor/ikinciElMotor.gorunum');

const kul = (rol, ek = {}) => ({
  id: 10,
  rol,
  motor_satis_yetkisi: false,
  alis_fiyati_gor: false,
  satis_fiyati_gor: false,
  musteri_gor: false,
  liste_fiyati_gor: false,
  satis_gecmisi_gor: false,
  kar_gor: false,
  motor_satis_gor: false,
  ...ek,
});

const satir = {
  id: 1,
  plaka: '34ABC123',
  marka: 'Honda',
  model: 'PCX',
  yil: 2021,
  km: 5000,
  durum: 'tamamlandi',
  stok_tipi: 'sahip',
  tarih: '2026-08-01',
  fatura_kesildi: true,
  alis_fiyati: 100000,
  noter_alis: 90000,
  masraflar: 2000,
  satis_fiyati: 150000,
  noter_satis: 120000,
  kalan_odeme: 0,
  odeme_detaylari: '[]',
  odeme_sekli: 'nakit',
  satis_tarihi: '2026-09-01',
  tamamlama_tarihi: 'T',
  yevmiye_no: 'Y1',
  aciklama: 'not',
  alici_adi: 'Ali',
  alici_tc: '111',
  alici_telefon: '0555',
  alici_adres: 'adres',
  satici_adi: 'Veli',
  satici_tc: '222',
  komisyoncu_adi: 'K',
  komisyoncu_telefon: '0532',
  komisyoncu_tutari: 3000,
  kar: 45000,
  yatirimci_id: 10,
  yatirimci_kar: 5000,
  yatirimci_kar_orani: 10,
  liste_fiyati: 160000,
  yeni_kolon_ileride_eklenecek: 'gizli kalmali',
};
const var_ = (nesne, alanlar) => alanlar.every((a) => a in nesne);
const yok = (nesne, alanlar) => alanlar.every((a) => !(a in nesne) || nesne[a] === null);

const KAR = ['kar', 'yatirimci_id', 'yatirimci_kar', 'yatirimci_kar_orani'];
const MUSTERI = [
  'alici_adi',
  'alici_tc',
  'alici_telefon',
  'alici_adres',
  'satici_adi',
  'satici_tc',
  'komisyoncu_adi',
  'komisyoncu_telefon',
  'komisyoncu_tutari',
];
const ALIS = ['alis_fiyati', 'noter_alis', 'masraflar'];
const SATIS = ['satis_fiyati', 'noter_satis', 'kalan_odeme', 'odeme_detaylari', 'odeme_sekli', 'satis_tarihi', 'tamamlama_tarihi', 'yevmiye_no', 'aciklama'];

describe('sanitizeMotor: admin ve boş girdi', () => {
  it('admin her şeyi görür (kâr dahil)', () => {
    assert.deepEqual(sanitizeMotor(satir, kul('admin')), satir);
  });
  it('kayıt yoksa olduğu gibi döner (null/undefined)', () => {
    assert.equal(sanitizeMotor(null, kul('personel')), null);
    assert.equal(sanitizeMotor(undefined, kul('personel')), undefined);
  });
});

describe('sanitizeMotor: personel (allowlist)', () => {
  it('hiç yetkisi yoksa yalnızca temel alanlar; alış/satış/müşteri/kâr YOK', () => {
    const m = sanitizeMotor(satir, kul('personel'));
    assert.ok(var_(m, ['id', 'plaka', 'marka', 'model', 'yil', 'km', 'durum']));
    assert.ok(yok(m, [...ALIS, ...SATIS, ...MUSTERI, ...KAR, 'liste_fiyati']));
  });

  it('listede olmayan YENİ bir kolon varsayılan olarak GİZLİDİR', () => {
    assert.ok(!('yeni_kolon_ileride_eklenecek' in sanitizeMotor(satir, kul('personel', { motor_satis_yetkisi: true }))));
  });

  it('alış fiyatı yetkisi yalnızca alış alanlarını açar', () => {
    const m = sanitizeMotor(satir, kul('personel', { alis_fiyati_gor: true }));
    assert.ok(var_(m, ALIS));
    assert.ok(yok(m, [...SATIS, ...MUSTERI, ...KAR]));
  });

  it('satış fiyatı yetkisi yalnızca satış alanlarını açar', () => {
    const m = sanitizeMotor(satir, kul('personel', { satis_fiyati_gor: true }));
    assert.ok(var_(m, SATIS));
    assert.ok(yok(m, [...ALIS, ...MUSTERI, ...KAR]));
  });

  it('müşteri yetkisi yalnızca kişi alanlarını açar', () => {
    const m = sanitizeMotor(satir, kul('personel', { musteri_gor: true }));
    assert.ok(var_(m, MUSTERI));
    assert.ok(yok(m, [...ALIS, ...SATIS, ...KAR]));
  });

  it('Motor Satış yetkisi alış+satış+müşteriyi açar ama KÂR ve yatırımcı payı hiçbir yetkiyle açılmaz', () => {
    const m = sanitizeMotor(satir, kul('personel', { motor_satis_yetkisi: true, kar_gor: true }));
    assert.ok(var_(m, [...ALIS, ...SATIS, ...MUSTERI]));
    assert.ok(yok(m, KAR), 'kar_gor bayrağı artık hiçbir şeyi açmaz');
  });

  it('liste fiyatı yetkisi liste_fiyati alanını açar', () => {
    assert.ok('liste_fiyati' in sanitizeMotor(satir, kul('personel', { liste_fiyati_gor: true })));
  });
});

describe('sanitizeMotor: yatırımcı', () => {
  it('kendi motoru: mali alanlar ve payı görür; alıcı/satıcı/komisyoncu kimliği ve iletişimi HİÇ gitmez (KVKK)', () => {
    const m = sanitizeMotor(satir, kul('yatirimci'));
    assert.ok(var_(m, ['alis_fiyati', 'satis_fiyati', 'yatirimci_kar']));
    assert.ok(yok(m, ['alici_adi', 'alici_tc', 'alici_telefon', 'alici_adres', 'satici_adi', 'satici_tc', 'komisyoncu_adi', 'komisyoncu_telefon']));
  });

  it('vitrin modu (liste fiyatı yetkisi): yalnızca temel alanlar + liste fiyatı; mali ve kişi alanları null', () => {
    const m = sanitizeMotor(satir, kul('yatirimci', { liste_fiyati_gor: true }));
    assert.equal(m.liste_fiyati, 160000);
    assert.ok(yok(m, [...ALIS, 'satis_fiyati', 'noter_satis', 'kar', 'yatirimci_kar', ...MUSTERI]));
    assert.ok(!('yeni_kolon_ileride_eklenecek' in m));
  });
});

describe('sanitizeMotor: muhasebeci', () => {
  it('anahtar KAPALI: hiçbir alan (boş nesne)', () => {
    assert.deepEqual(sanitizeMotor(satir, kul('muhasebeci')), {});
  });

  it('anahtar AÇIK: alım/satım, noter, satış ve kişi bilgisi var; MASRAF, kâr ve yatırımcı alanları yok', () => {
    const m = sanitizeMotor(satir, kul('muhasebeci', { motor_satis_gor: true }));
    assert.ok(var_(m, ['alis_fiyati', 'noter_alis', ...SATIS, ...MUSTERI]));
    assert.ok(!('masraflar' in m), 'masraf kâr hesabına yarar: gizli');
    assert.ok(yok(m, [...KAR, 'liste_fiyati', 'yeni_kolon_ileride_eklenecek']));
  });

  it('motor_satis_yetkisi muhasebeciye ek alan KAZANDIRMAZ (rol önceliklidir)', () => {
    const m = sanitizeMotor(satir, kul('muhasebeci', { motor_satis_gor: true, motor_satis_yetkisi: true }));
    assert.ok(!('masraflar' in m));
  });
});

describe('sanitizeOzet', () => {
  const ozet = { toplam: 3, toplam_satis: 500, toplam_alis: 300, toplam_kar: 200, toplam_satis_tutari: 500 };
  it('admin tam görür', () => assert.deepEqual(sanitizeOzet(ozet, kul('admin')), ozet));
  it('personel (yetkisiz): kâr, alış ve satış toplamları null', () => {
    const o = sanitizeOzet(ozet, kul('personel'));
    assert.deepEqual([o.toplam_kar, o.toplam_alis, o.toplam_satis, o.toplam_satis_tutari], [null, null, null, null]);
    assert.equal(o.toplam, 3, 'adet gizlenmez');
  });
  it('Motor Satış yetkilisi alış/satış toplamlarını görür, kâr toplamını GÖRMEZ', () => {
    const o = sanitizeOzet(ozet, kul('personel', { motor_satis_yetkisi: true }));
    assert.deepEqual([o.toplam_alis, o.toplam_satis, o.toplam_kar], [300, 500, null]);
  });
  it('anahtarlı muhasebeci alış/satış toplamlarını görür, kâr toplamını görmez', () => {
    const o = sanitizeOzet(ozet, kul('muhasebeci', { motor_satis_gor: true }));
    assert.deepEqual([o.toplam_alis, o.toplam_satis, o.toplam_kar], [300, 500, null]);
  });
});

describe('motorKapsami ve muhasebeMotorGorur', () => {
  it('yatırımcı: liste fiyatı yetkisi vitrin kapsamı, yoksa yalnızca KENDİ motorları', () => {
    assert.deepEqual(motorKapsami(kul('yatirimci', { liste_fiyati_gor: true })), { tur: 'yatirimci-vitrin' });
    assert.deepEqual(motorKapsami(kul('yatirimci', { id: 77 })), { tur: 'yatirimci-kendi', yatirimciId: 77 });
  });
  it('yetkisiz personel satılmış motorları göremez; satış geçmişi/Motor Satış yetkilisi ve admin hepsini görür', () => {
    assert.deepEqual(motorKapsami(kul('personel')), { tur: 'satilmislar-gizli' });
    assert.deepEqual(motorKapsami(kul('personel', { satis_gecmisi_gor: true })), { tur: 'hepsi' });
    assert.deepEqual(motorKapsami(kul('personel', { motor_satis_yetkisi: true })), { tur: 'hepsi' });
    assert.deepEqual(motorKapsami(kul('admin')), { tur: 'hepsi' });
  });
  it('muhasebeci yalnızca anahtar açıksa satılmışları görür', () => {
    assert.deepEqual(motorKapsami(kul('muhasebeci', { motor_satis_gor: true })), { tur: 'hepsi' });
    assert.deepEqual(motorKapsami(kul('muhasebeci')), { tur: 'satilmislar-gizli' });
  });
  it('muhasebeMotorGorur yalnızca muhasebeci rolü + anahtar', () => {
    assert.equal(muhasebeMotorGorur(kul('muhasebeci', { motor_satis_gor: true })), true);
    assert.equal(muhasebeMotorGorur(kul('personel', { motor_satis_gor: true })), false);
    assert.equal(muhasebeMotorGorur(kul('muhasebeci')), false);
  });
});
