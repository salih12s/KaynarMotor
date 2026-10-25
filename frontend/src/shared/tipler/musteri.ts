/* `musteriler` tablosu ve müşteri detayındaki işlem geçmişi (backend musteriler.repository.ts, ad üzerinden eşleşir). */
import type { Motor } from './motor';
import type { AksesuarSatis } from './aksesuar';
import type { IsEmri } from './servis';

export interface Musteri {
  id: number;
  ad_soyad: string | null;
  adres: string | null;
  telefon: string | null;
  created_at?: string;
  updated_at?: string;
}

export type MusteriMotorGecmisi = Pick<
  Motor,
  | 'id'
  | 'plaka'
  | 'marka'
  | 'model'
  | 'yil'
  | 'alis_fiyati'
  | 'satis_fiyati'
  | 'noter_satis'
  | 'kar'
  | 'durum'
  | 'tarih'
  | 'satis_tarihi'
  | 'satici_adi'
  | 'alici_adi'
  | 'yevmiye_no'
>;

export type MusteriAksesuarGecmisi = Pick<AksesuarSatis, 'id' | 'ad_soyad' | 'telefon' | 'toplam_satis' | 'kar' | 'durum' | 'satis_tarihi' | 'olusturan_kisi'>;

export type MusteriIsEmriGecmisi = Pick<IsEmri, 'id' | 'fis_no' | 'musteri_ad_soyad' | 'model_tip' | 'marka' | 'durum' | 'gercek_toplam_ucret' | 'created_at'>;

/** `/musteriler/:id`: müşteri ve işlem geçmişi. */
export interface MusteriDetayi extends Musteri {
  motorlar: MusteriMotorGecmisi[];
  aksesuarlar: MusteriAksesuarGecmisi[];
  isEmirleri: MusteriIsEmriGecmisi[];
}
