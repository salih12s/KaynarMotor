/*
 * Motor Stok'un saf kurallarının (yetki bayrakları ve veri kuralları) BİRİM testleri: ekran, sahte API, bekleme yok; girdi -> çıktı.
 * Ekran düzeyindeki karşılıkları ../MotorStok.test.js içinde.
 */
import { motorYetkileri } from './yetkiler';
import { filtrele, parseOdeme, bosForm, motordenForm } from './motorStokVeri';

const bayrak = (user) => {
  const { canAlis, canMusteri, canListe, canKar, canEdit } = motorYetkileri(user);
  return { canAlis, canMusteri, canListe, canKar, canEdit };
};

describe('motorYetkileri: rol matrisi', () => {
  test('admin her şeyi görür ve düzenler', () => {
    expect(bayrak({ rol: 'admin' })).toEqual({ canAlis: true, canMusteri: true, canListe: true, canKar: true, canEdit: true });
  });

  test('motor satış yetkilisi: alış ve müşteri açık, ilan fiyatı kapalı, KÂR KAPALI, düzenleyebilir', () => {
    expect(bayrak({ rol: 'personel', motor_satis_yetkisi: true })).toEqual({ canAlis: true, canMusteri: true, canListe: false, canKar: false, canEdit: true });
  });

  test('yetkisiz personel hiçbir şeyi görmez/düzenlemez; alan bayrakları tek tek açılır', () => {
    expect(bayrak({ rol: 'personel' })).toEqual({ canAlis: false, canMusteri: false, canListe: false, canKar: false, canEdit: false });
    expect(bayrak({ rol: 'personel', alis_fiyati_gor: true }).canAlis).toBe(true);
    expect(bayrak({ rol: 'personel', musteri_gor: true }).canMusteri).toBe(true);
    expect(bayrak({ rol: 'personel', liste_fiyati_gor: true }).canListe).toBe(true);
  });

  test('yatırımcı (vitrin): yalnızca ilan fiyatı; hiçbir işlem yapamaz; kâr kapalı', () => {
    const y = motorYetkileri({ rol: 'yatirimci', liste_fiyati_gor: true });
    expect(y).toMatchObject({
      isYatirimciVitrin: true,
      isYatirimciSahip: false,
      full: false,
      canListe: true,
      canAlis: false,
      canMusteri: false,
      canKar: false,
      canEdit: false,
    });
  });

  test('yatırımcı (sahip): kendi motorunu tam görür ama işlem yapamaz ve kâr (admin payı) görmez', () => {
    const y = motorYetkileri({ rol: 'yatirimci' });
    expect(y).toMatchObject({ isYatirimciSahip: true, full: true, canAlis: true, canMusteri: true, canListe: true, canKar: false, canEdit: false });
  });

  test('yatırımcı motor_satis_yetkisi taşısa bile düzenleyemez', () => {
    expect(motorYetkileri({ rol: 'yatirimci', motor_satis_yetkisi: true }).canEdit).toBe(false);
  });

  test('oturum yoksa her bayrak kapalı (hata vermez)', () => {
    expect(bayrak(null)).toEqual({ canAlis: false, canMusteri: false, canListe: false, canKar: false, canEdit: false });
  });
});

describe('filtrele', () => {
  const liste = [
    { id: 1, plaka: 'AAA', marka: 'Honda', durum: 'tamamlandi', fatura_kesildi: true },
    { id: 2, plaka: 'BBB', marka: 'Yamaha', durum: 'stokta', stok_tipi: 'konsinye', kalan_odeme: '100' },
    { id: 3, plaka: 'CCC', marka: 'Suzuki', durum: 'stokta', stok_tipi: 'sahip' },
    { id: 4, plaka: 'DDD', marka: 'BMW', durum: 'perte' },
    { id: 5, plaka: 'EEE', marka: 'KTM', durum: 'kapora' },
  ];
  const bos = { isYatirimci: false, activeFilter: null, secondaryFilter: null, search: '' };
  const idler = (o) => filtrele(liste, { ...bos, ...o }).map((m) => m.id);

  test('durum sırası: stokta(sahip) -> kapora -> konsinye -> perte -> satılan', () => {
    expect(idler({})).toEqual([3, 5, 2, 4, 1]);
  });

  test('"stokta" çipi konsinyeyi dışlar; "konsinye" yalnızca konsinyeyi alır', () => {
    expect(idler({ activeFilter: 'stokta' })).toEqual([3]);
    expect(idler({ activeFilter: 'konsinye' })).toEqual([2]);
  });

  test('ikincil süzgeçler: fatura ve kalan ödeme', () => {
    expect(idler({ secondaryFilter: 'fatura_kesildi' })).toEqual([1]);
    expect(idler({ secondaryFilter: 'odeme_bekliyor' })).toEqual([2]);
    expect(idler({ secondaryFilter: 'odeme_tamam' })).toEqual([3, 5, 4, 1]);
  });

  test('yatırımcı satılanları yalnızca "tamamlandi" süzgecinde görür', () => {
    expect(idler({ isYatirimci: true })).not.toContain(1);
    expect(idler({ isYatirimci: true, activeFilter: 'tamamlandi' })).toEqual([1]);
  });

  test('arama büyük/küçük harf farkı olmadan plaka, marka, model, satıcı ve alıcıda arar', () => {
    expect(idler({ search: 'honda' })).toEqual([1]);
    expect(idler({ search: 'kt' })).toEqual([5]);
  });
});

describe('form dönüşümleri ve ödeme çözümleme', () => {
  test('bosForm her çağrıda yeni nesne; varsayılanlar', () => {
    expect(bosForm()).not.toBe(bosForm());
    expect(bosForm()).toMatchObject({ durum: 'stokta', stok_tipi: 'sahip', yatirimci: false, fatura_kesildi: false, plaka: '' });
  });

  test('motordenForm: boşlar "", tarih yyyy-aa-gg, yatırımcı varlığı bayrağa dönüşür', () => {
    const f = motordenForm({ plaka: 'X', tarih: '2026-09-01T12:00:00', yatirimci_id: 9, fatura_kesildi: true });
    expect(f).toMatchObject({
      plaka: 'X',
      marka: '',
      tarih: '2026-09-01',
      yatirimci: true,
      yatirimci_id: 9,
      fatura_kesildi: true,
      durum: 'stokta',
      stok_tipi: 'sahip',
    });
    expect(motordenForm({}).yatirimci).toBe(false);
  });

  test('parseOdeme: dizi, JSON metni ya da bozuk/boş değer -> her zaman dizi', () => {
    expect(parseOdeme([{ tip: 'Nakit' }])).toEqual([{ tip: 'Nakit' }]);
    expect(parseOdeme('[{"tip":"Kart","tutar":5}]')).toEqual([{ tip: 'Kart', tutar: 5 }]);
    expect(parseOdeme('{"a":1}')).toEqual([]);
    expect(parseOdeme('bozuk')).toEqual([]);
    expect(parseOdeme(null)).toEqual([]);
  });
});
