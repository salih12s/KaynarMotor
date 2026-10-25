/*
 * Servis (iş emri) tipleri. Kaynak: `is_emirleri` ve `parcalar` tabloları. DECIMAL kolonlar sunucudan metin gelir
 * (backend/core/veritabani/db.ts), form alanları da metindir: bu yüzden `Sayi`.
 */
import type { Sayi } from '../utils/bicim';

export interface Parca {
  id?: number;
  is_emri_id?: number;
  parca_kodu: string | null;
  takilan_parca: string | null;
  adet: number | string | null;
  birim_fiyat: Sayi;
  maliyet: Sayi;
  toplam_fiyat?: Sayi;
  created_at?: string;
}

export interface IsEmri {
  id: number;
  fis_no: number | null;
  musteri_id: number | null;
  musteri_ad_soyad: string | null;
  adres: string | null;
  telefon: string | null;
  km: number | null;
  model_tip: string | null;
  marka: string | null;
  aciklama: string | null;
  ariza_sikayetler: string | null;
  tahmini_teslim_tarihi: string | null;
  tahmini_toplam_ucret: Sayi;
  gercek_toplam_ucret: Sayi;
  toplam_maliyet: Sayi;
  kar: Sayi;
  durum: string;
  musteri_imza: boolean | null;
  teslim_alan_ad_soyad: string | null;
  teslim_eden_teknisyen: string | null;
  teslim_tarihi: string | null;
  olusturan_kullanici_id: number | null;
  olusturan_kisi: string | null;
  /** JSON metni: ödeme dağılımı (nakit, kart, havale...). */
  odeme_detaylari: string | null;
  tamamlama_tarihi: string | null;
  created_at: string;
  updated_at: string;
  kalan_odeme: Sayi;
  plaka: string | null;
}

/** Servis geçmişi satırı (herkese açık QR sayfası): maliyet, kâr ve iletişim bilgisi içermez. */
export interface ServisGecmisiSatiri {
  fis_no: number | null;
  plaka: string | null;
  marka: string | null;
  model_tip: string | null;
  km: number | null;
  durum: string;
  tarih: string;
  teslim_tarihi: string | null;
  tamamlama_tarihi: string | null;
  toplam_tutar: Sayi;
  islemler: Array<{ islem: string | null; adet: number | string | null }>;
}

/** `/servis-gecmisi/:token` yanıtı. */
export interface ServisGecmisiYaniti {
  plaka: string;
  servisler: ServisGecmisiSatiri[];
}

/** Tek iş emri yanıtı: parçalarıyla birlikte. */
export interface IsEmriDetayi extends IsEmri {
  parcalar: Parca[];
}
