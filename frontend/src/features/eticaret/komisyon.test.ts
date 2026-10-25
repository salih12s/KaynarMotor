import { hesaplaKomisyon, detectPlatform, type KomisyonHesabi } from './komisyon';
import type { Sayi } from '../../shared/utils/bicim';

// Bu dosyadaki vektörler backend/tests/unit/komisyon.test.js ile AYNIDIR: sunucu ve arayüz kopyası aynı sonucu vermeli.
// Elle hesap (Trendyol, satış 1000, alış 500, komisyon %10, kargo 0): KDV %0 → 388,83; KDV %20 → 324,02.
const T = (kdv: Sayi, adet: Sayi = 1) => hesaplaKomisyon(1000, 500, 10, kdv, 0, adet, 'trendyol');

describe('hesaplaKomisyon', () => {
  test('KDV %0 gerçekten 0 olarak hesaplanır', () => {
    expect(T(0).netKar).toBe(388.83);
    expect(T('0').netKar).toBe(388.83);
    expect(T('0.00').netKar).toBe(388.83);
  });

  test('KDV %20 ve %10 beklenen değeri verir', () => {
    expect(T(20).netKar).toBe(324.02);
    expect(T(10).netKar).toBe(353.48);
  });

  test('KDV verilmemişse (boş, null, undefined, geçersiz) %20 kullanılır', () => {
    for (const bos of ['', null, undefined, 'abc']) expect(T(bos).netKar).toBe(324.02);
  });

  test('adet çarpanı', () => {
    expect(T(0, 3).netKar).toBe(1166.49);
    expect(T(0, 3).komisyonTutari).toBe(300);
    expect(T(0, '').netKar).toBe(388.83);
  });

  test('arayüzün kullandığı ek alanlar bulunur (kâr oranı, geri dönüş, KDV kalemleri)', () => {
    const h = T(20);
    for (const alan of ['netKar', 'komisyonTutari', 'toplamKomisyon', 'karOrani', 'yatirimGeriDonus', 'odenecekKDV', 'satistanKDV', 'alisKDV', 'stopaj']) {
      expect(typeof h[alan as keyof KomisyonHesabi]).toBe('number');
    }
  });

  test('Shopier yalnızca komisyon keser', () => {
    expect(hesaplaKomisyon(1000, 500, 10, 20, 0, 1, 'shoppier').toplamKomisyon).toBe(100);
  });
});

describe('detectPlatform', () => {
  test('platform adından tür çıkarır', () => {
    expect(detectPlatform('Trendyol')).toBe('trendyol');
    expect(detectPlatform('Hepsiburada')).toBe('hepsiburada');
    expect(detectPlatform('Hepsi Burada')).toBe('hepsiburada');
    expect(detectPlatform('HEPSİBURADA')).toBe('hepsiburada');
    expect(detectPlatform('HEPSIBURADA')).toBe('hepsiburada');
    expect(detectPlatform('HB Pazar')).toBe('hepsiburada');
    expect(detectPlatform('N11')).toBe('n11');
    expect(detectPlatform('Shopier')).toBe('shoppier');
    expect(detectPlatform(null)).toBe('trendyol');
  });

  test('içinde "hb" geçen alakasız adlar Hepsiburada sayılmaz', () => {
    expect(detectPlatform('Shbank Pazar')).toBe('trendyol');
    expect(detectPlatform('Ahbap Market')).toBe('trendyol');
  });
});
