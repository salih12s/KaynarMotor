/* E-ticaret tipleri. Kaynak: `eticaret_platformlar` ve `eticaret_satislar` tabloları (satışta platform adı birleştirilir). */
import type { Sayi } from '../utils/bicim';

export interface Platform {
  id: number;
  platform_adi: string;
  komisyon_orani: Sayi;
  kdv_orani: Sayi;
  kargo_ucreti: Sayi;
  created_at?: string;
  updated_at?: string;
}

export interface EticaretSatis {
  id: number;
  stok_id: number | null;
  platform_id: number | null;
  /** JOIN ile gelir. */
  platform_adi?: string | null;
  platform_komisyon?: Sayi;
  urun_adi: string | null;
  alis_fiyati: Sayi;
  satis_fiyati: Sayi;
  komisyon_orani: Sayi;
  komisyon_tutari: Sayi;
  kar: Sayi;
  adet: number | null;
  tarih: string | null;
  durum: string;
  kdv_orani: Sayi;
  kargo_ucreti: Sayi;
  created_at?: string;
  updated_at?: string;
}

export type EticaretIstatistik = Record<string, Sayi>;
