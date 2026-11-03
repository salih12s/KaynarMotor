import { sayiYaz, paraYaz, tarihYaz, trSayi } from './bicim';

/*
 * Karakterizasyon: yeni fonksiyonlar, kodda bugüne kadar yazılı olan ifadelerin birebir aynı çıktısını vermeli.
 * Sol taraf = eski satır (kopya), sağ taraf = yeni fonksiyon.
 */
const SAYI_GIRDILERI = [0, 5, 1234, 1234.5, 1234.5678, 0.1, -1500.25, '1234.5', '99', '', null, undefined, NaN, 'abc', 1e9, 0.0004];
const TARIH_GIRDILERI = ['2026-10-16', '2026-10-16T21:30:00.000Z', '2026-01-05T00:00:00', new Date(2026, 11, 31, 23, 59), '', null, undefined, 'bozuk-tarih'];

// Test başlığında girdiyi gösterir (metin tırnaklı, tarih ISO): "99" ile 99 ayrı görünür. Vitest'in %p biçimi bunu yapmıyor.
const girdiAdi = (v: unknown) => (typeof v === 'string' ? JSON.stringify(v) : v instanceof Date ? v.toISOString() : String(v));

describe('sayiYaz (eski: parseFloat(String(v || 0)).toLocaleString("tr-TR"))', () => {
  SAYI_GIRDILERI.forEach((v) => {
    test(`${girdiAdi(v)} eski ifadeyle aynı`, () => {
      expect(sayiYaz(v)).toBe(parseFloat(String(v || 0)).toLocaleString('tr-TR'));
    });
  });

  test('binlik ayraç nokta, ondalık virgül; en çok 3 ondalık', () => {
    expect(sayiYaz(1234567.891)).toBe('1.234.567,891');
    expect(sayiYaz(1234.5678)).toBe('1.234,568');
  });

  test('boş ve geçersiz değer 0 görünür (ekran bozulmaz)', () => {
    expect(sayiYaz(null)).toBe('0');
    expect(sayiYaz(undefined)).toBe('0');
    expect(sayiYaz('')).toBe('0');
  });
});

describe('paraYaz (eski: minimumFractionDigits: 2)', () => {
  SAYI_GIRDILERI.forEach((v) => {
    test(`${girdiAdi(v)} eski ifadeyle aynı`, () => {
      expect(paraYaz(v)).toBe(parseFloat(String(v || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 2 }));
    });
  });

  test('her zaman en az iki ondalık', () => {
    expect(paraYaz(1500)).toBe('1.500,00');
    expect(paraYaz('99.9')).toBe('99,90');
  });
});

describe('sayiYaz, minimumFractionDigits: 0 yazan eski çağrılarla da aynı', () => {
  SAYI_GIRDILERI.forEach((v) => {
    test(`${girdiAdi(v)} eski ifadeyle aynı`, () => {
      expect(sayiYaz(v)).toBe(parseFloat(String(v || 0)).toLocaleString('tr-TR', { minimumFractionDigits: 0 }));
    });
  });
});

describe('tarihYaz (eski: d ? new Date(d).toLocaleDateString("tr-TR") : "-")', () => {
  TARIH_GIRDILERI.forEach((d) => {
    test(`${girdiAdi(d)} eski ifadeyle aynı`, () => {
      expect(tarihYaz(d)).toBe(d ? new Date(d).toLocaleDateString('tr-TR') : '-');
    });
  });

  test('boşken ikinci parametre görünecek metni belirler (Excel için boş metin)', () => {
    expect(tarihYaz(null, '')).toBe('');
    expect(tarihYaz(undefined)).toBe('-');
  });

  test('gün.ay.yıl biçimi', () => {
    expect(tarihYaz(new Date(2026, 0, 5))).toBe('05.01.2026');
  });
});

// Regression (E11/E13): Excel'den yapıştırılan Türkçe sayı ham metin olarak sunucuya gidiyor ve parseFloat ile okunuyordu:
// "1.250,50" → 1,25 (fiyat 1000 kat küçülür), "1250,5" → 1250 (ondalık kaybolur).
describe('trSayi: Türkçe (Excel) sayı metni', () => {
  test.each([
    ['1.250,50', 1250.5],
    ['1250,5', 1250.5],
    ['0,5', 0.5],
    [',5', 0.5],
    ['1.250.000,5', 1250000.5],
    ['1.250', 1250],
    ['1.250.000', 1250000],
    ['1250', 1250],
    ['12.5', 12.5],
    ['50', 50],
    ['₺1.250,00', 1250],
    ['1 250,5', 1250.5],
    ['1.250,50 TL', 1250.5],
    ['-5', -5],
    ['  7  ', 7],
  ])('%j → %d', (girdi, beklenen) => {
    expect(trSayi(girdi)).toBe(beklenen);
  });

  test('boş girdi 0 olur', () => {
    for (const bos of ['', '   ', null, undefined]) expect(trSayi(bos)).toBe(0);
  });

  test('sayı olmayan ya da belirsiz girdi NaN döner (çağıran satırı reddeder, sessizce 0 yapmaz)', () => {
    for (const kotu of ['abc', '12,5,3', '1,2.3', '--5', '5x', '1.2.3']) expect(trSayi(kotu)).toBeNaN();
  });
});
