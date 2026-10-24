import { sonIstek } from './sonIstek';

// Elle çözülebilen söz: yanıtların geliş sırasını biz belirleriz
const ertelenmis = () => {
  let coz, reddet;
  const vaat = new Promise((c, r) => {
    coz = c;
    reddet = r;
  });
  return { vaat, coz, reddet };
};

describe('sonIstek', () => {
  test('eski istek sonradan gelse de yenisini ezmez (null döner)', async () => {
    const sonAra = sonIstek();
    const ilk = ertelenmis();
    const ikinci = ertelenmis();
    const p1 = sonAra(ilk.vaat);
    const p2 = sonAra(ikinci.vaat);
    ikinci.coz('yeni');
    ilk.coz('eski'); // eski yanıt SONRA geldi
    expect(await p2).toBe('yeni');
    expect(await p1).toBeNull();
  });

  test('tek istek normal sonuç verir', async () => {
    const sonAra = sonIstek();
    expect(await sonAra(Promise.resolve(42))).toBe(42);
  });

  test('eski isteğin hatası yutulur, güncel isteğin hatası iletilir', async () => {
    const sonAra = sonIstek();
    const ilk = ertelenmis();
    const p1 = sonAra(ilk.vaat);
    const p2 = sonAra(Promise.reject(new Error('guncel hata')));
    ilk.reddet(new Error('eski hata'));
    expect(await p1).toBeNull();
    await expect(p2).rejects.toThrow('guncel hata');
  });

  test('iptal() bekleyen yanıtları yok sayar', async () => {
    const sonAra = sonIstek();
    const bekleyen = ertelenmis();
    const p = sonAra(bekleyen.vaat);
    sonAra.iptal();
    bekleyen.coz('gecikmis');
    expect(await p).toBeNull();
  });
});
