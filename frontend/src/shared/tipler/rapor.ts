/*
 * Rapor tipleri. Kaynak: backend/modules/raporlar (raporlar.hesap.ts toplamları, raporlar.repository.ts sorguları).
 * Toplamlar sunucuda JS sayısı olarak hesaplanır (number); satır kayıtları tablo satırlarıdır (DECIMAL: metin).
 */
import type { Sayi } from '../utils/bicim';
import type { AksesuarSatis } from './aksesuar';
import type { EticaretSatis } from './eticaret';
import type { Motor } from './motor';
import type { IsEmriDetayi } from './servis';
import type { YedekParcaSatis } from './yedekParca';

/** `/raporlar/aralik`: tarih aralığındaki tamamlanan işler ve toplamlar. */
export interface AralikRaporu {
  baslangic: string;
  bitis: string;
  motorlar: Motor[];
  motorGelir: number;
  motorMaliyet: number;
  motorKar: number;
  motorKarToplam: number;
  motorYatirimciKar: number;
  motorKomisyon: number;
  motorNoterSatisCiro: number;
  isEmirleri: IsEmriDetayi[];
  isEmriGelir: number;
  isEmriMaliyet: number;
  isEmriKar: number;
  aksesuarlar: AksesuarSatis[];
  aksesuarGelir: number;
  aksesuarMaliyet: number;
  aksesuarKar: number;
  eticaret: EticaretSatis[];
  eticaretGelir: number;
  eticaretMaliyet: number;
  eticaretKar: number;
  yedekParcalar: YedekParcaSatis[];
  yedekParcaToplamDeger: number;
  yedekParcaToplamMaliyet: number;
  motorStokToplam: number;
  toplam: { gelir: number; maliyet: number; kar: number };
}

/** `/raporlar/fis-kar`: iş emri başına gelir/maliyet/kâr. */
export interface FisKarSatiri {
  fis_no: number | null;
  musteri_ad_soyad: string | null;
  gercek_toplam_ucret: Sayi;
  toplam_maliyet: Sayi;
  kar: Sayi;
  durum: string;
  tamamlama_tarihi: string | null;
  created_at: string;
  marka: string | null;
  model_tip: string | null;
  telefon: string | null;
  olusturan_kisi: string | null;
}

/** `/raporlar/yatirimci-ozet`: yatırımcı bazlı özet (sayaçlar BIGINT: metin gelebilir). */
export interface YatirimciOzeti {
  id: number;
  ad_soyad: string;
  kullanici_adi: string;
  stok_adet: Sayi;
  satilan_adet: Sayi;
  stok_degeri: Sayi;
  toplam_satis: Sayi;
  yatirimci_kar: Sayi;
  isletme_kar: Sayi;
}

/** Yatırımcı raporunun taşıdığı motor alanları (kişi bilgisi yok: KVKK). */
export type YatirimciMotoru = Pick<
  Motor,
  | 'id'
  | 'plaka'
  | 'marka'
  | 'model'
  | 'yil'
  | 'km'
  | 'durum'
  | 'stok_tipi'
  | 'tarih'
  | 'created_at'
  | 'alis_fiyati'
  | 'liste_fiyati'
  | 'satis_fiyati'
  | 'satis_tarihi'
  | 'tamamlama_tarihi'
  | 'yatirimci_id'
  | 'yatirimci_kar'
>;

/** `/raporlar/yatirimci-rapor`. */
export interface YatirimciRaporu {
  stoktakiler: YatirimciMotoru[];
  satilanlar: YatirimciMotoru[];
  ozet: {
    stok_adet: number;
    satilan_adet: number;
    toplam_yatirimci_kar: number;
    toplam_satis: number;
    toplam_alis: number;
    stok_degeri: number;
  };
}
