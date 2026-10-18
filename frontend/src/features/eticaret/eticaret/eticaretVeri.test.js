/*
 * E-Ticaret'in saf kurallarının (form dönüşümleri, süzme, biçim, toplam kâr, kâr etiketi) BİRİM testleri: ekran, sahte API, bekleme yok.
 * Ekran düzeyindeki karşılıkları ../ETicaret.test.js içinde.
 */
import { karEtiketi, formatTL, bosSatisForm, satistanForm, bosPlatformForm, platformdanForm, platformSuz, hesaplaToplamKar } from './eticaretVeri';
import { hesaplaKomisyon, detectPlatform } from '../komisyon';

describe('karEtiketi: yalnızca admin\'e gösterilecek etiketler', () => {
  test('kâr ve yatırım geri dönüşü içeren etiketler (büyük/küçük harf farkı olmadan)', () => {
    for (const e of ['Kâr Oranı', 'Yat. Geri Dönüş Oranı', 'Yat. Geri Dönüş', 'Net Kâr']) expect(karEtiketi(e)).toBe(true);
  });
  test('komisyon, KDV ve stopaj etiketleri herkese açıktır', () => {
    for (const e of ['Komisyon', 'Komisyon (Toplam)', 'KDV', 'Stopaj Bedeli', 'Ödeme Bedeli']) expect(karEtiketi(e)).toBe(false);
  });
});

describe('formatTL', () => {
  test('her zaman iki ondalık, tr-TR biçimi; boş/NaN 0,00', () => {
    expect(formatTL(1234.5)).toBe('1.234,50');
    expect(formatTL('600')).toBe('600,00');
    expect(formatTL(null)).toBe('0,00');
    expect(formatTL(0.005)).toBe('0,01');
  });
});

describe('form dönüşümleri', () => {
  test('bosSatisForm: KDV %20, kargo 0, adet 1, tarih bugün; her çağrıda yeni nesne', () => {
    const f = bosSatisForm();
    expect(f).toMatchObject({ kdv_orani: '20', kargo_ucreti: '0', adet: 1, urun_adi: '' });
    expect(f.tarih).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(bosSatisForm()).not.toBe(f);
  });

  test('satistanForm: boşlar "", KDV yoksa "20" ama 0 geçerli bir KDV\'dir, tarih yyyy-aa-gg', () => {
    expect(satistanForm({ urun_adi: 'A', tarih: '2026-10-02T12:00:00' })).toMatchObject({ urun_adi: 'A', stok_id: '', kdv_orani: '20', kargo_ucreti: '0', adet: 1, tarih: '2026-10-02' });
    expect(satistanForm({ kdv_orani: 0 }).kdv_orani).toBe(0);
    expect(satistanForm({}).tarih).toBe('');
  });

  test('platform formları', () => {
    expect(bosPlatformForm()).toEqual({ platform_adi: '', komisyon_orani: '', kdv_orani: '20', kargo_ucreti: '0' });
    expect(platformdanForm({ platform_adi: 'N11', komisyon_orani: 10, kdv_orani: 18, kargo_ucreti: 30 })).toEqual({ platform_adi: 'N11', komisyon_orani: 10, kdv_orani: 18, kargo_ucreti: 30 });
    expect(platformdanForm({ platform_adi: 'X', komisyon_orani: 5 })).toEqual({ platform_adi: 'X', komisyon_orani: 5, kdv_orani: '20', kargo_ucreti: '0' });
  });
});

describe('platformSuz ve hesaplaToplamKar', () => {
  const satislar = [
    { id: 1, platform_id: 1, platform_adi: 'Trendyol', satis_fiyati: 1000, alis_fiyati: 600, komisyon_orani: 15, kdv_orani: 20, kargo_ucreti: 50, adet: 2 },
    { id: 2, platform_id: 2, platform_adi: 'Hepsiburada', satis_fiyati: 500, alis_fiyati: 300, komisyon_orani: 12, kdv_orani: 20, kargo_ucreti: 40, adet: 1 },
  ];
  test('platform süzgeci: boşsa hepsi, doluysa yalnızca o platform (id metin de olabilir)', () => {
    expect(platformSuz(satislar, '')).toHaveLength(2);
    expect(platformSuz(satislar, '2').map((s) => s.id)).toEqual([2]);
    expect(platformSuz(satislar, 1).map((s) => s.id)).toEqual([1]);
  });

  test('toplam kâr satır satır hesaplaKomisyon net kârlarının toplamıdır; boş liste 0', () => {
    const beklenen = satislar.reduce((t, s) => t + hesaplaKomisyon(s.satis_fiyati, s.alis_fiyati, s.komisyon_orani, s.kdv_orani, s.kargo_ucreti, s.adet, detectPlatform(s.platform_adi)).netKar, 0);
    expect(hesaplaToplamKar(satislar)).toBeCloseTo(beklenen);
    expect(hesaplaToplamKar([])).toBe(0);
  });
});
