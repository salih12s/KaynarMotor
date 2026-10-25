/*
 * Rapor hesapları (saf fonksiyonlar) için BİRİM testleri: ekran, sahte API, bekleme yok; girdi -> çıktı.
 * Ekran düzeyindeki karşılıkları Raporlar.test.js'te (aynı sayılar ekranda da doğru çıkıyor mu).
 */
import { hesaplaToplamlar, yatirimciOzetBirlestir } from './raporHesap';
import { hesaplaKomisyon } from '../eticaret/komisyon';
import { formatTL, formatDate, karColor, motorIsletmeKari } from './bicim';
import { kayit, kayitlar } from '../../shared/test/kayit';
import type { AralikRaporu, YatirimciOzeti } from '../../shared/tipler';

// Testler raporun yalnızca ilgilendikleri alanlarını yazar (sunucudan metin gelen DECIMAL'ler dahil)
const toplamlar = (rapor: object) => hesaplaToplamlar(kayit<AralikRaporu>(rapor));

describe('hesaplaToplamlar', () => {
  test('rapor henüz yokken (null) her şey 0', () => {
    expect(hesaplaToplamlar(null)).toEqual({
      hesaplananEticaretKar: 0,
      yedekParcaKar: 0,
      duzeltilmisTotalKar: 0,
      duzeltilmisTotalGelir: 0,
      duzeltilmisTotalMaliyet: 0,
    });
  });

  test('kâr = motor + iş emri + aksesuar + e-ticaret + yedek parça; gelir/maliyete yedek parça değeri eklenir', () => {
    const t = toplamlar({
      motorKar: 14000,
      isEmriKar: 1000,
      aksesuarKar: 400,
      eticaret: [],
      yedekParcaToplamDeger: 3000,
      yedekParcaToplamMaliyet: 2000,
      toplam: { gelir: 100000, maliyet: 70000 },
    });
    expect(t.yedekParcaKar).toBe(1000);
    expect(t.duzeltilmisTotalKar).toBe(16400);
    expect(t.duzeltilmisTotalGelir).toBe(103000);
    expect(t.duzeltilmisTotalMaliyet).toBe(72000);
  });

  test('sunucudan metin olarak gelen sayılar (DECIMAL) da toplanır', () => {
    const t = toplamlar({
      motorKar: '100.50',
      isEmriKar: '0',
      aksesuarKar: null,
      yedekParcaToplamDeger: '10',
      yedekParcaToplamMaliyet: '4',
      toplam: { gelir: '5', maliyet: '2' },
    });
    expect(t.duzeltilmisTotalKar).toBeCloseTo(106.5);
    expect(t.duzeltilmisTotalGelir).toBe(15);
  });

  test('e-ticaret kârı sunucudan değil hesaplaKomisyon sonucundan (satır satır) toplanır', () => {
    const satir = { platform_adi: 'Trendyol', satis_fiyati: 1000, alis_fiyati: 600, komisyon_orani: 15, kdv_orani: 20, kargo_ucreti: 50, adet: 2 };
    const beklenen = hesaplaKomisyon(1000, 600, 15, 20, 50, 2, 'trendyol').netKar;
    const t = toplamlar({ eticaret: [satir, satir], toplam: {} });
    expect(t.hesaplananEticaretKar).toBeCloseTo(beklenen * 2);
    expect(t.duzeltilmisTotalKar).toBeCloseTo(beklenen * 2);
  });
});

describe('yatirimciOzetBirlestir', () => {
  const ozet = kayitlar<YatirimciOzeti>([
    { id: 7, ad_soyad: 'Veli', stok_adet: 3, stok_degeri: 90000 },
    { id: 8, ad_soyad: 'Ayşe', stok_adet: 1 },
  ]);

  test('rapor yoksa sunucudaki özet olduğu gibi döner', () => {
    expect(yatirimciOzetBirlestir(null, ozet)).toBe(ozet);
  });

  test('satılan/satış/kâr değerleri rapordaki motorlardan; stok bilgisi özetten gelir', () => {
    const rapor = {
      motorlar: [
        { yatirimci_id: 7, satis_fiyati: 50000, kar: 6000, yatirimci_kar: 1000 },
        { yatirimci_id: '7', satis_fiyati: 20000, kar: 2000, yatirimci_kar: 500 }, // id metin de olsa aynı yatırımcı
        { yatirimci_id: null, satis_fiyati: 99999, kar: 99999, yatirimci_kar: 0 }, // yatırımcısız motor sayılmaz
      ],
    };
    const [veli, ayse] = yatirimciOzetBirlestir(kayit<AralikRaporu>(rapor), ozet);
    expect(veli).toMatchObject({ stok_adet: 3, stok_degeri: 90000, satilan_adet: 2, toplam_satis: 70000, yatirimci_kar: 1500, isletme_kar: 6500 });
    expect(ayse).toMatchObject({ stok_adet: 1, satilan_adet: 0, toplam_satis: 0, yatirimci_kar: 0, isletme_kar: 0 });
  });
});

describe('bicim', () => {
  test('formatTL: binlik nokta, iki ondalık, boş/NaN için 0,00', () => {
    expect(formatTL(1234.5)).toBe('1.234,50');
    expect(formatTL('2000')).toBe('2.000,00');
    expect(formatTL(null)).toBe('0,00');
    expect(formatTL(undefined)).toBe('0,00');
  });

  test('formatDate: gün.ay.yıl; boşsa tire', () => {
    expect(formatDate('2026-10-05T12:00:00')).toBe('05.10.2026');
    expect(formatDate(null)).toBe('-');
  });

  test('karColor: sıfır ve pozitif yeşil, negatif kırmızı', () => {
    expect(karColor(0)).toBe('#1D6A3B');
    expect(karColor('12.5')).toBe('#1D6A3B');
    expect(karColor(-0.01)).toBe('#C62828');
  });

  test('motorIsletmeKari: toplam kâr - yatırımcı payı', () => {
    expect(motorIsletmeKari({ kar: 6000, yatirimci_kar: 1000 })).toBe(5000);
    expect(motorIsletmeKari({ kar: '6000' })).toBe(6000);
    expect(motorIsletmeKari(undefined)).toBe(0);
  });
});
