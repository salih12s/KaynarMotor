/*
 * E-ticaret komisyon/kâr hesabı (saf fonksiyonlar). Arayüzün TEK kopyasıdır.
 * Sunucudaki karşılığı: backend/config/komisyon.js. İkisi aynı test vektörleriyle sınanır
 * (backend/tests/unit/komisyon.test.js ve bu klasördeki komisyon.test.js); biri değişirse diğeri de değişmeli.
 */

import type { Sayi } from '../../shared/utils/bicim';

export type PlatformTipi = 'trendyol' | 'hepsiburada' | 'n11' | 'shoppier';

// Platform adından tür çıkarır. "hb" yalnızca tek başına bir sözcük olarak sayılır (ör. "Shbank" Hepsiburada olmaz).
export const detectPlatform = (platformAdi: string | null | undefined): PlatformTipi => {
  if (!platformAdi) return 'trendyol';
  // Türkçe büyük harfler için: 'İ'.toLowerCase() birleşik noktalı 'i̇' üretir; aksan işaretlerini at, ı→i
  const name = String(platformAdi).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
  if (name.includes('hepsiburada') || name.includes('hepsi burada') || /(^|[^a-z0-9])hb($|[^a-z0-9])/.test(name)) return 'hepsiburada';
  if (name.includes('n11')) return 'n11';
  if (name.includes('shoppier') || name.includes('shopier')) return 'shoppier';
  return 'trendyol';
};

// KDV: 0 geçerli bir orandır (eskiden `Number(kdv) || 20` 0'ı sessizce 20 yapıyordu). Yalnızca boş/geçersizse %20.
export const kdvCoz = (kdvOrani: Sayi): number => {
  if (kdvOrani === '' || kdvOrani === null || kdvOrani === undefined) return 20;
  const n = Number(kdvOrani);
  return Number.isFinite(n) ? n : 20;
};

/** Hesabın sonucu: tutarlar adetle çarpılmış ve kuruşa yuvarlanmıştır. */
export interface KomisyonHesabi {
  platformTipi: PlatformTipi;
  satis: number;
  alis: number;
  komisyon: number;
  kdv: number;
  kargo: number;
  miktar: number;
  kdvHaricSatis: number;
  komisyonTutari: number;
  toplamKomisyon: number;
  toplamKesinti: number;
  komisyonKDV: number;
  hizmetBedeli: number;
  hizmetKDV: number;
  stopaj: number;
  odemeBedeli: number;
  islemBedeli: number;
  odemIslemKDV: number;
  pazarlamaHizmet: number;
  pazarlamaHizmetKDV: number;
  satistanKDV: number;
  alisKDV: number;
  kargoKDV: number;
  odenecekKDV: number;
  netKar: number;
  karOrani: number;
  yatirimGeriDonus: number;
}

export const hesaplaKomisyon = (
  satisFiyati: Sayi,
  alisFiyati: Sayi,
  komisyonOrani: Sayi,
  kdvOrani: Sayi,
  kargoUcreti: Sayi,
  adet: Sayi,
  platformTipi: PlatformTipi = 'trendyol',
): KomisyonHesabi => {
  const satis = Number(satisFiyati) || 0;
  const alis = Number(alisFiyati) || 0;
  const komisyon = Number(komisyonOrani) || 0;
  const kdv = kdvCoz(kdvOrani);
  const kargo = Number(kargoUcreti) || 0;
  const miktar = Number(adet) || 1;

  // KDV hariç fiyatlar ve KDV tutarları
  const kdvHaricSatis = satis / (1 + kdv / 100);
  const kdvHaricAlis = alis / (1 + kdv / 100);
  const satistanKDV = satis - kdvHaricSatis;
  const alisKDV = alis - kdvHaricAlis;
  const kargoKDV = kargo - kargo / (1 + kdv / 100);

  let komisyonTutari: number, komisyonKDV: number, hizmetBedeli: number, hizmetKDV: number, stopaj: number;
  let odemeBedeli = 0,
    islemBedeli = 0,
    odemIslemKDV = 0;
  let pazarlamaHizmet = 0,
    pazarlamaHizmetKDV = 0;

  if (platformTipi === 'hepsiburada') {
    // Komisyon = satış × komisyon%, sonra KDV eklenir; ödeme %0,96 ve işlem %0,315 bedeli (KDV dahil); stopaj KDV hariç satışın %1
    komisyonTutari = ((satis * komisyon) / 100) * (1 + kdv / 100);
    komisyonKDV = komisyonTutari - komisyonTutari / (1 + kdv / 100);
    odemeBedeli = satis * 0.0096;
    islemBedeli = satis * 0.00315;
    odemIslemKDV = odemeBedeli + islemBedeli - (odemeBedeli + islemBedeli) / (1 + kdv / 100);
    hizmetBedeli = odemeBedeli + islemBedeli;
    hizmetKDV = odemIslemKDV;
    stopaj = kdvHaricSatis * 0.01;
  } else if (platformTipi === 'n11') {
    // Komisyon KDV dahil gömülü; pazarlama ve hizmet gideri %1,258 (KDV dahil); stopaj KDV hariç satışın %1
    komisyonTutari = (satis * komisyon) / 100;
    komisyonKDV = komisyonTutari - komisyonTutari / (1 + kdv / 100);
    pazarlamaHizmet = satis * 0.01258;
    pazarlamaHizmetKDV = pazarlamaHizmet - pazarlamaHizmet / (1 + kdv / 100);
    hizmetBedeli = pazarlamaHizmet;
    hizmetKDV = pazarlamaHizmetKDV;
    stopaj = kdvHaricSatis * 0.01;
  } else if (platformTipi === 'shoppier') {
    // Yalnızca komisyon (hizmet bedeli ve stopaj yok)
    komisyonTutari = (satis * komisyon) / 100;
    komisyonKDV = komisyonTutari - komisyonTutari / (1 + kdv / 100);
    hizmetBedeli = 0;
    hizmetKDV = 0;
    stopaj = 0;
  } else {
    // Trendyol (varsayılan): hizmet bedeli %0,347; stopaj KDV hariç komisyonun %7,7'si
    komisyonTutari = (satis * komisyon) / 100;
    komisyonKDV = komisyonTutari - komisyonTutari / (1 + kdv / 100);
    hizmetBedeli = satis * 0.00347;
    hizmetKDV = hizmetBedeli - hizmetBedeli / (1 + kdv / 100);
    stopaj = (komisyonTutari / (1 + kdv / 100)) * 0.077;
  }

  const toplamKomisyon = komisyonTutari + hizmetBedeli + stopaj;
  const odenecekKDV = satistanKDV - alisKDV - kargoKDV - komisyonKDV - hizmetKDV;
  const netKar = satis - alis - kargo - komisyonTutari - hizmetBedeli - stopaj - odenecekKDV;
  const karOrani = alis > 0 ? (netKar / alis) * 100 : 0; // KDV dahil alışa göre
  const yatirimGeriDonus = kdvHaricAlis > 0 ? (netKar / kdvHaricAlis) * 100 : 0; // KDV hariç alışa göre

  const r = (v: number) => Math.round(v * 100) / 100;
  return {
    platformTipi,
    satis,
    alis,
    komisyon,
    kdv,
    kargo,
    miktar,
    kdvHaricSatis: r(kdvHaricSatis),
    komisyonTutari: r(komisyonTutari * miktar),
    toplamKomisyon: r(toplamKomisyon * miktar),
    toplamKesinti: r(toplamKomisyon * miktar), // toplamKomisyon ile aynı (eski ad)
    komisyonKDV: r(komisyonKDV * miktar),
    hizmetBedeli: r(hizmetBedeli * miktar),
    hizmetKDV: r(hizmetKDV * miktar),
    stopaj: r(stopaj * miktar),
    odemeBedeli: r(odemeBedeli * miktar),
    islemBedeli: r(islemBedeli * miktar),
    odemIslemKDV: r(odemIslemKDV * miktar),
    pazarlamaHizmet: r(pazarlamaHizmet * miktar),
    pazarlamaHizmetKDV: r(pazarlamaHizmetKDV * miktar),
    satistanKDV: r(satistanKDV * miktar),
    alisKDV: r(alisKDV * miktar),
    kargoKDV: r(kargoKDV * miktar),
    odenecekKDV: r(odenecekKDV * miktar),
    netKar: r(netKar * miktar),
    karOrani: r(karOrani),
    yatirimGeriDonus: r(yatirimGeriDonus),
  };
};
