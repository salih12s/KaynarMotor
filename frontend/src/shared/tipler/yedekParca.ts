/* Yedek parça tipleri. Kaynak: `yedek_parcalar` (satış kaydı) ve `yedek_parca_stok` tabloları. */
import type { Sayi } from '../utils/bicim';

export interface YedekParcaSatis {
  id: number;
  urun_adi: string;
  alis_fiyati?: Sayi;
  satis_fiyati: Sayi;
  created_at: string;
  updated_at: string;
  musteri_adi: string | null;
  musteri_telefon: string | null;
  kalan_odeme: Sayi;
  stok_id: number | null;
  adet: number | null;
}

export interface YedekParcaStok {
  id: number;
  stok_kodu: string;
  stok_adi: string;
  marka: string | null;
  giren_miktar: number | null;
  cikan_miktar: number | null;
  mevcut: number | null;
  birimi: string | null;
  alis_fiyati?: Sayi;
  satis_fiyati: Sayi;
  envanter_degeri?: Sayi;
  created_at?: string;
  updated_at?: string;
}
