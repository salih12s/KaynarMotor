/*
 * İş emri liste kurallarının (saf fonksiyonlar) BİRİM testleri: ekran, sahte API, bekleme yok; girdi -> çıktı.
 * Ekran düzeyindeki karşılıkları ../IsEmirleri.test.js içinde.
 */
import { filtrele, istatistikler, kayittanForm, bosForm, bosParca, durumRenk, durumLabel, durumTon, formatTarih, type ListeSatiri } from './isEmriVeri';
import { kayit, kayitlar } from '../../../shared/test/kayit';
import type { IsEmri } from '../../../shared/tipler';

const liste = kayitlar<ListeSatiri>([
  {
    id: 1,
    fis_no: 101,
    musteri_ad_soyad: 'Ayşe Yılmaz',
    telefon: '05551112233',
    marka: 'Honda',
    durum: 'beklemede',
    created_at: '2026-10-18T09:00:00',
    gercek_toplam_ucret: 1500,
    kar: 600,
  },
  {
    id: 2,
    fis_no: 102,
    musteri_ad_soyad: 'Veli Demir',
    telefon: '05332223344',
    marka: 'Yamaha',
    durum: 'devam_ediyor',
    created_at: '2026-09-15T12:00:00',
    gercek_toplam_ucret: '1000.50',
    kar: '400.25',
  },
  {
    id: 3,
    fis_no: 103,
    musteri_ad_soyad: 'Zeynep Kaya',
    marka: 'Suzuki',
    durum: 'tamamlandi',
    tarih: '2026-10-01T12:00:00',
    gercek_toplam_ucret: 2500,
    kar: 1000,
  },
]);

describe('filtrele', () => {
  const hepsi = { search: '', startDate: '', endDate: '' };
  test('süzgeç yoksa hepsi döner', () => {
    expect(filtrele(liste, hepsi)).toHaveLength(3);
  });

  test('arama: ad (küçük/büyük harf fark etmez), fiş no, telefon, marka', () => {
    expect(filtrele(liste, { ...hepsi, search: 'AYŞE' }).map((x) => x.id)).toEqual([1]);
    expect(filtrele(liste, { ...hepsi, search: 'ayşe' }).map((x) => x.id)).toEqual([1]);
    expect(filtrele(liste, { ...hepsi, search: '102' }).map((x) => x.id)).toEqual([2]);
    expect(filtrele(liste, { ...hepsi, search: '0533' }).map((x) => x.id)).toEqual([2]);
    expect(filtrele(liste, { ...hepsi, search: 'suz' }).map((x) => x.id)).toEqual([3]);
  });

  test('tarih aralığı oluşturma tarihine (yoksa tarih alanına) göre, uçlar dahil', () => {
    expect(filtrele(liste, { ...hepsi, startDate: '2026-10-01' }).map((x) => x.id)).toEqual([1, 3]);
    expect(filtrele(liste, { ...hepsi, endDate: '2026-10-01' }).map((x) => x.id)).toEqual([2, 3]);
    expect(filtrele(liste, { ...hepsi, startDate: '2026-10-01', endDate: '2026-10-01' }).map((x) => x.id)).toEqual([3]);
  });

  // Regression: eskiden düz toLowerCase kullanılıyordu; büyük "I" küçük "ı" ile eşleşmiyor, büyük harfle yazılan "YILMAZ" bulunmuyordu
  test('Türkçe harf: "YILMAZ", "yılmaz" ve "yilmaz" aynı kaydı bulur; aksan farkı yok sayılır ("ayse" = "Ayşe")', () => {
    expect(filtrele(liste, { ...hepsi, search: 'YILMAZ' }).map((x) => x.id)).toEqual([1]);
    expect(filtrele(liste, { ...hepsi, search: 'yılmaz' }).map((x) => x.id)).toEqual([1]);
    expect(filtrele(liste, { ...hepsi, search: 'yilmaz' }).map((x) => x.id)).toEqual([1]);
    expect(filtrele(liste, { ...hepsi, search: 'ayse' }).map((x) => x.id)).toEqual([1]);
  });

  test('telefonu olmayan kayıt aramada hata vermez', () => {
    expect(() => filtrele(liste, { ...hepsi, search: '055' })).not.toThrow();
  });
});

describe('istatistikler', () => {
  test('durum sayıları, toplam tutar ve kâr; metin gelen sayılar da toplanır', () => {
    const s = istatistikler(liste, new Date('2026-10-18T15:00:00'));
    expect(s).toMatchObject({ toplam: 3, bugun: 1, beklemede: 1, islemde: 1, tamamlandi: 1 });
    expect(s.tutar).toBeCloseTo(5000.5);
    expect(s.kar).toBeCloseTo(2000.25);
  });

  test('boş listede her şey 0', () => {
    expect(istatistikler([])).toEqual({ toplam: 0, bugun: 0, beklemede: 0, islemde: 0, tamamlandi: 0, tutar: 0, kar: 0 });
  });
});

describe('form dönüşümleri', () => {
  test('bosForm/bosParca her çağrıda yeni nesne verir (paylaşılan durum olmaz)', () => {
    expect(bosForm()).not.toBe(bosForm());
    expect(bosParca()).toEqual({ parca_kodu: '', takilan_parca: '', adet: 1, birim_fiyat: 0, maliyet: 0 });
    expect(bosForm()).toMatchObject({ durum: 'beklemede', odeme_tamamlandi: true, musteri_ad_soyad: '' });
  });

  test('kayittanForm: boş alanlar "", tarihler yyyy-aa-gg, kalan ödeme varsa ödeme tamamlanmadı', () => {
    const f = kayittanForm(
      kayit<IsEmri>({ musteri_ad_soyad: 'Ayşe', tahmini_teslim_tarihi: '2026-10-20T12:00:00', kalan_odeme: '500.00', olusturan_kisi: 'ofis' }),
    );
    expect(f).toMatchObject({
      musteri_ad_soyad: 'Ayşe',
      telefon: '',
      tahmini_teslim_tarihi: '2026-10-20',
      teslim_tarihi: '',
      durum: 'beklemede',
      kalan_odeme: '500.00',
      odeme_tamamlandi: false,
      teslim_alan_ad_soyad: 'ofis',
      teslim_eden_teknisyen: 'ofis',
    });
  });

  test('kayittanForm: kalan ödeme "0.00" (metin) veya yok ise ödeme tamamlandı sayılır', () => {
    expect(kayittanForm(kayit<IsEmri>({ kalan_odeme: '0.00' })).odeme_tamamlandi).toBe(true);
    expect(kayittanForm(kayit<IsEmri>({})).odeme_tamamlandi).toBe(true);
  });
});

describe('durum etiketleri', () => {
  test('renk ve kısa etiket', () => {
    expect([durumRenk('tamamlandi'), durumRenk('devam_ediyor'), durumRenk('beklemede'), durumRenk('?')]).toEqual(['success', 'info', 'warning', 'warning']);
    expect([durumLabel('tamamlandi'), durumLabel('devam_ediyor'), durumLabel('beklemede')]).toEqual(['Tamamlandı', 'İşlemde', 'Beklemede']);
    expect([durumTon('tamamlandi'), durumTon('devam_ediyor'), durumTon('beklemede'), durumTon('?')]).toEqual(['yesil', 'mavi', 'bekle', 'bekle']);
  });
  test('formatTarih: boşsa boş metin', () => {
    expect(formatTarih(null)).toBe('');
    expect(formatTarih('2026-10-05T12:00:00')).toBe('05.10.2026');
  });
});
