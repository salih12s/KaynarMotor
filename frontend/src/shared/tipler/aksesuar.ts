/*
 * Aksesuar tipleri. Kaynak: `aksesuarlar` (satış kaydı), `aksesuar_parcalar` (satış satırları), `aksesuar_stok`.
 * Kâr alanı yalnızca admin'e gönderilir (kariGizle).
 */
import type { Sayi } from '../utils/bicim';

export interface AksesuarParca {
  id?: number;
  aksesuar_id?: number;
  urun_adi: string | null;
  adet: number | string | null;
  maliyet: Sayi;
  satis_fiyati: Sayi;
  stok_id?: number | null;
  created_at?: string;
}

export interface AksesuarSatis {
  id: number;
  ad_soyad: string | null;
  telefon: string | null;
  urun_adi: string | null;
  odeme_tutari: Sayi;
  odeme_sekli: string | null;
  aciklama: string | null;
  durum: string;
  toplam_maliyet?: Sayi;
  toplam_satis: Sayi;
  kar?: Sayi;
  /** JSON metni: ödeme dağılımı. */
  odeme_detaylari: string | null;
  satis_tarihi: string | null;
  tamamlama_tarihi: string | null;
  created_at: string;
  updated_at: string;
  olusturan_kisi: string | null;
  kalan_odeme: Sayi;
  indirim: Sayi;
  /** Tek kayıt yanıtında satış satırları da gelir. */
  parcalar?: AksesuarParca[];
}

export interface AksesuarStok {
  id: number;
  stok_kodu: string;
  stok_adi: string;
  giren_miktar: number | null;
  cikan_miktar: number | null;
  mevcut: number | null;
  birimi: string | null;
  alis_fiyati?: Sayi;
  satis_fiyati: Sayi;
  envanter_degeri?: Sayi;
  created_at?: string;
  updated_at?: string;
  marka: string | null;
  platform: string | null;
  beden: string | null;
  renk: string | null;
  kategori: string | null;
}

export type AksesuarIstatistik = Record<string, Sayi>;
