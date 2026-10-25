/*
 * İlan arama kuralının (saf fonksiyon; yönetim paneli ve herkese açık mağaza aynı kuralı kullanır) BİRİM testleri.
 * Ekran düzeyindeki karşılıkları yonetim/Vitrin.test.js içinde.
 */
import { ilanAramaUygunMu } from './ilanArama';
import { kayit } from '../../shared/test/kayit';
import type { VitrinIlan } from '../../shared/tipler';

const ilan = kayit<VitrinIlan>({
  baslik: 'Küçük Chopper',
  marka: 'Yamaha',
  model: 'XVS',
  yil: 2021,
  segment: 'Chopper',
  aciklama: 'Çok temiz, bakımlı',
  ilan_no: 7,
});

describe('ilanAramaUygunMu', () => {
  test('boş arama her ilanı kabul eder', () => {
    expect(ilanAramaUygunMu(ilan, '')).toBe(true);
    expect(ilanAramaUygunMu(ilan, '   ')).toBe(true);
    expect(ilanAramaUygunMu(ilan, undefined)).toBe(true);
  });

  test('başlık, marka, model, segment, açıklama, yıl alanlarında arar', () => {
    for (const q of ['chopper', 'yamaha', 'xvs', 'temiz', '2021']) expect(ilanAramaUygunMu(ilan, q)).toBe(true);
    expect(ilanAramaUygunMu(ilan, 'honda')).toBe(false);
  });

  test('büyük/küçük harf ve Türkçe karakter/aksan farkı yoktur ("Küçük" = "kucuk" = "KÜÇÜK")', () => {
    expect(ilanAramaUygunMu(ilan, 'kucuk')).toBe(true);
    expect(ilanAramaUygunMu(ilan, 'KÜÇÜK')).toBe(true);
    expect(ilanAramaUygunMu(kayit<VitrinIlan>({ baslik: 'ISPARTA Işık' }), 'isik')).toBe(true); // I / ı -> i
  });

  test('aramadaki HER kelime aynı ilanda bulunmalı (VE mantığı)', () => {
    expect(ilanAramaUygunMu(ilan, 'yamaha 2021')).toBe(true);
    expect(ilanAramaUygunMu(ilan, 'yamaha 2023')).toBe(false);
    expect(ilanAramaUygunMu(ilan, '  yamaha    chopper ')).toBe(true);
  });

  test('ilan numarası "ILN-0007" biçiminde de aranır; numarası olmayan ilan hata vermez', () => {
    expect(ilanAramaUygunMu(ilan, 'iln-0007')).toBe(true);
    expect(ilanAramaUygunMu(ilan, 'ILN-0008')).toBe(false);
    expect(ilanAramaUygunMu(kayit<VitrinIlan>({ baslik: 'X' }), 'iln')).toBe(false);
  });
});
