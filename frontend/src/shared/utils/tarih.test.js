import { yerelTarih, bugunYerel } from './tarih';

describe('yerelTarih', () => {
  test('yerel gün alınır, UTC günü değil (gece yarısından hemen sonra)', () => {
    // Yerel saat 00:30: UTC'ye çevrilince (UTC+ bölgelerde) önceki güne düşerdi
    expect(yerelTarih(new Date(2026, 9, 16, 0, 30))).toBe('2026-10-16');
    expect(yerelTarih(new Date(2026, 9, 16, 23, 59))).toBe('2026-10-16');
  });

  test('tek haneli ay ve gün sıfırla doldurulur; yıl sonu sınırı', () => {
    expect(yerelTarih(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(yerelTarih(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31');
  });

  test('bugunYerel YYYY-AA-GG biçimindedir', () => {
    expect(bugunYerel()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
