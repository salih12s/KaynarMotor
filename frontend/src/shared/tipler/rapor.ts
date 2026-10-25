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

/** Veresiye (açık borç) kaynağı: borcun hangi satıştan geldiği. */
export type BorcKaynagi = 'motor' | 'servis' | 'aksesuar' | 'yedek_parca';

/** Borç kaydındaki parça/ürün satırı (servis ve aksesuar borçlarında). */
export interface BorcParcasi {
  takilan_parca?: string | null;
  urun_adi?: string | null;
  adet?: number | string | null;
  birim_fiyat?: Sayi;
  toplam_fiyat?: Sayi;
  satis_fiyati?: Sayi;
}

/** Borcun kaynağa özgü ayrıntıları (backend veresiye.service.ts borclariBirlestir): hangi alanların dolu olduğu kaynağa göre değişir. */
export interface BorcDetayi {
  plaka?: string | null;
  marka?: string | null;
  model?: string | null;
  model_tip?: string | null;
  yil?: number | string | null;
  km?: number | string | null;
  fis_no?: number | null;
  adres?: string | null;
  ariza_sikayetler?: string | null;
  odeme_sekli?: string | null;
  odeme_detaylari?: string | null;
  alici_tc?: string | null;
  alici_adres?: string | null;
  alis_fiyati?: number;
  satis_fiyati?: number;
  noter_satis?: number;
  tahmini_toplam_ucret?: number;
  fatura_kesildi?: boolean | null;
  yevmiye_no?: string | null;
  notlar?: string | null;
  durum?: string | null;
  urun_adi?: string | null;
  parcalar?: BorcParcasi[];
}

/** `/veresiye` yanıtındaki tek borç satırı. */
export interface Borc {
  kaynak: string;
  kaynak_key: BorcKaynagi;
  id: number;
  fis_no?: number | null;
  musteri_adi: string;
  telefon: string;
  kalan_odeme: number;
  toplam_tutar: number;
  tarih: string | null;
  aciklama: string;
  detay: BorcDetayi;
}

export interface VeresiyeOzeti {
  motor: number;
  servis: number;
  aksesuar: number;
  yedek_parca: number;
  toplam: number;
  kayit_sayisi: number;
}

/** `/veresiye` yanıtı: borçlar (en yeni önce) ve kaynak bazında özet. */
export interface VeresiyeYaniti {
  borclar: Borc[];
  ozet: VeresiyeOzeti;
}

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
