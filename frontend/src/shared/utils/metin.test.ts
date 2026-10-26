import { kucukHarf, aramaMetni, metinIcerir } from './metin';

describe('kucukHarf (eşitlik için)', () => {
  test.each([
    ['AYŞE YILMAZ', 'ayşe yilmaz'],
    ['Ayşe Yılmaz', 'ayşe yilmaz'],
    ['İSMAİL', 'ismail'],
    ['ISPARTA', 'isparta'],
    ['ışık', 'işik'],
  ])('%s -> %s', (girdi, beklenen) => {
    expect(kucukHarf(girdi)).toBe(beklenen);
  });

  test('"YILMAZ", "Yılmaz" ve "yilmaz" aynı kabul edilir', () => {
    expect(kucukHarf('YILMAZ')).toBe(kucukHarf('Yılmaz'));
    expect(kucukHarf('Yılmaz')).toBe(kucukHarf('yilmaz'));
  });

  test('aksanlı harfler ayrı kalır: "Şener" ile "Sener" kimlik eşitliğinde aynı sayılmaz', () => {
    expect(kucukHarf('Şener')).not.toBe(kucukHarf('Sener'));
  });

  test('null, undefined ve sayı güvenle metne çevrilir', () => {
    expect(kucukHarf(null)).toBe('');
    expect(kucukHarf(undefined)).toBe('');
    expect(kucukHarf(1250)).toBe('1250');
  });
});

describe('aramaMetni / metinIcerir (arama için)', () => {
  test('aksan farkı yok sayılır', () => {
    expect(aramaMetni('Küçük ÇAĞLAR')).toBe('kucuk caglar');
    expect(metinIcerir('Ayşe Yılmaz', 'ayse')).toBe(true);
    expect(metinIcerir('Ayşe Yılmaz', 'YILMAZ')).toBe(true);
  });

  test('regression: büyük harfle kayıtlı ad, küçük harfle yazılan aramada bulunur', () => {
    expect(metinIcerir('AYŞE YILMAZ', 'yılmaz')).toBe(true);
    expect(metinIcerir('AYŞE YILMAZ', 'yilmaz')).toBe(true);
    expect(metinIcerir('Işık Motor', 'ISIK')).toBe(true);
  });

  test('eşleşmeyen metin false; boş aranan her zaman true; boş metin yalnız boş aramayı karşılar', () => {
    expect(metinIcerir('Veli Demir', 'ayşe')).toBe(false);
    expect(metinIcerir('Veli Demir', '')).toBe(true);
    expect(metinIcerir(null, 'a')).toBe(false);
    expect(metinIcerir(undefined, '')).toBe(true);
  });
});
