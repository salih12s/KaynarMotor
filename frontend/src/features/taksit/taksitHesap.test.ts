// Taksit hesabı karakterizasyonu (aşama 4.5): taksit hesabının frontend'de testi yoktu. Müşteriye giden tutarlar bu hesaptan çıkar.
// Önce mevcut davranışı sabitleyen testler yazıldı (yeşil), sonra hesap saf modüle (taksitHesap) taşındı.
import { hesaplaTaksit, ORANLAR, MAKS_NAKIT, fmtTL, formatParaInput, paraToNumber, type TaksitSatiri } from './taksitHesap';
import type { Sayi } from '../../shared/utils/bicim';

// Tablo beklenen durumlarda null olmamalı: olursa testin kendisi açıklayıcı hatayla düşer
const tablo = (nakit: Sayi, pesinat?: Sayi): TaksitSatiri[] => {
  const sonuc = hesaplaTaksit(nakit, pesinat);
  if (!sonuc) throw new Error(`tablo beklenirken null döndü (nakit=${String(nakit)}, peşinat=${String(pesinat)})`);
  return sonuc;
};
const satir = (sonuc: TaksitSatiri[], ay: number): TaksitSatiri => {
  const bulunan = sonuc.find((s) => s.ay === ay);
  if (!bulunan) throw new Error(`${ay} aylık satır yok`);
  return bulunan;
};
const oranOf = (ay: number): number => {
  const o = ORANLAR.find((x) => x.ay === ay);
  if (!o) throw new Error(`${ay} ay için oran yok`);
  return o.oran;
};

describe('taksit oranları', () => {
  test('3, 6, 9 ve 12 ay; nakit fiyat oranla bölünür', () => {
    expect(ORANLAR).toEqual([
      { ay: 3, oran: 0.9 },
      { ay: 6, oran: 0.83 },
      { ay: 9, oran: 0.78 },
      { ay: 12, oran: 0.73 },
    ]);
  });
});

describe('hesaplaTaksit', () => {
  test('peşinatsız: 90.000 ₺ nakit, 3 ayda 100.000 ₺ toplam, aylık 33.333,33 ₺', () => {
    const uc = satir(tablo(90000), 3);
    expect(uc.toplam).toBeCloseTo(100000, 6);
    expect(uc.aylik).toBeCloseTo(100000 / 3, 6);
  });

  test('her süre için toplam = nakit / oran, aylık = toplam / ay', () => {
    const sonuc = tablo(100000);
    expect(sonuc.map((s) => s.ay)).toEqual([3, 6, 9, 12]);
    for (const { ay, toplam, aylik } of sonuc) {
      expect(toplam).toBeCloseTo(100000 / oranOf(ay), 6);
      expect(aylik).toBeCloseTo(toplam / ay, 6);
    }
  });

  test('peşinat nakit fiyattan düşülür, kalan üzerinden hesaplanır', () => {
    const sonuc = tablo(100000, 10000);
    expect(satir(sonuc, 3).toplam).toBeCloseTo(90000 / 0.9, 6);
    expect(satir(sonuc, 12).toplam).toBeCloseTo(90000 / 0.73, 6);
  });

  test('nakit metin olarak gelirse (URL parametresi, form alanı) sayıya çevrilir', () => {
    expect(satir(tablo('90000'), 3).toplam).toBeCloseTo(100000, 6);
  });

  test('geçersiz peşinat (boş, metin) 0 sayılır', () => {
    expect(satir(tablo(90000, 'abc'), 3).toplam).toBeCloseTo(100000, 6);
    expect(satir(tablo(90000, undefined), 3).toplam).toBeCloseTo(100000, 6);
  });

  test.each<[Sayi]>([[0], [-5], ['abc'], [''], [null], [undefined], [NaN]])('geçersiz nakit fiyat (%s) tablo üretmez', (nakit) => {
    expect(hesaplaTaksit(nakit)).toBeNull();
  });

  test('üst sınır: MAKS_NAKIT aşılırsa tablo yok, tam sınırda var (paylaşım linki absürt tutar göstermesin)', () => {
    expect(hesaplaTaksit(MAKS_NAKIT + 1)).toBeNull();
    expect(hesaplaTaksit(MAKS_NAKIT)).not.toBeNull();
  });

  test('peşinat nakit fiyata eşit veya büyükse taksitlendirilecek tutar kalmaz', () => {
    expect(hesaplaTaksit(50000, 50000)).toBeNull();
    expect(hesaplaTaksit(50000, 60000)).toBeNull();
    expect(hesaplaTaksit(50000, 49999)).not.toBeNull();
  });
});

describe('biçim yardımcıları', () => {
  test('fmtTL tam liraya yuvarlar, binlik ayracı nokta, sonda ₺', () => {
    expect(fmtTL(1234.4)).toBe('1.234 ₺');
    expect(fmtTL(1234.5)).toBe('1.235 ₺');
    expect(fmtTL(0)).toBe('0 ₺');
  });

  test('formatParaInput yalnızca rakamları alır ve binlik ayracı koyar', () => {
    expect(formatParaInput('50000')).toBe('50.000');
    expect(formatParaInput('1.234.567')).toBe('1.234.567');
    expect(formatParaInput('abc')).toBe('');
    expect(formatParaInput(null)).toBe('');
  });

  test('paraToNumber ayraçları atıp tamsayı döner, geçersiz değer 0', () => {
    expect(paraToNumber('1.234.567')).toBe(1234567);
    expect(paraToNumber('50.000 ₺')).toBe(50000);
    expect(paraToNumber('')).toBe(0);
    expect(paraToNumber(undefined)).toBe(0);
  });
});
