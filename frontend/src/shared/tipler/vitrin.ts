/* Vitrin (herkese açık mağaza) tipleri. Kaynak: `vitrin_urunleri`, `vitrin_kategori_iletisim`, `vitrin_segmentler`. */
import type { Sayi } from '../utils/bicim';

/** Vitrin kategorisi: 'motor' | 'aksesuar' | 'yedek_parca' | 'hizmet' ... (sunucu metin olarak tutar). */
export type VitrinKategori = string;

export interface VitrinIlan {
  id: number;
  ilan_no: number | null;
  kategori: VitrinKategori;
  baslik: string;
  aciklama: string | null;
  fiyat: Sayi;
  video_url: string | null;
  video_dosya_id: number | null;
  kapak_gorsel_id: number | null;
  marka: string | null;
  model: string | null;
  yil: number | null;
  segment: string | null;
  motor_cc: number | null;
  km: number | null;
  yayinda: boolean;
  siralama: number | null;
  one_cikan: boolean | null;
  rubik_link: string | null;
  hasar_kaydi: string | null;
  /** 'sifir' | 'ikinci_el' */
  motor_durumu: string | null;
  stok_motor_id: number | null;
  /** Sıfır ilanının bağlı olduğu sıfır stok modeli. */
  sifir_motor_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface VitrinIletisim {
  kategori: VitrinKategori;
  personel_adi: string | null;
  telefon: string | null;
  aciklama: string | null;
  /** Sunucu görselin kendisini değil, var olup olmadığını döner. */
  gorsel_var?: boolean;
  baslik: string | null;
  personel_adi_2: string | null;
  telefon_2: string | null;
  updated_at?: string;
}

export interface VitrinSegment {
  id: number;
  ad: string;
  sira: number | null;
}
