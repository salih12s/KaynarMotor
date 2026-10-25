/*
 * Oturum ve kullanıcı tipleri. Kaynak: backend/core/tipler.ts (Rol, YetkiBayraklari) ve `kullanicilar` tablosu.
 * Yetki bayrakları sunucudan boolean gelir; eski kayıtlarda eksik olabileceği için hepsi isteğe bağlıdır.
 */

export type Rol = 'admin' | 'personel' | 'yatirimci' | 'muhasebeci';

export interface YetkiBayraklari {
  aksesuar_yetkisi: boolean;
  motor_satis_yetkisi: boolean;
  eticaret_yetkisi: boolean;
  servis_yetkisi: boolean;
  aksesuar_stok_yetkisi: boolean;
  yedek_parca_yetkisi: boolean;
  motor_vitrin_yetkisi: boolean;
  aksesuar_vitrin_yetkisi: boolean;
  liste_fiyati_gor: boolean;
  alis_fiyati_gor: boolean;
  satis_fiyati_gor: boolean;
  kar_gor: boolean;
  musteri_gor: boolean;
  satis_gecmisi_gor: boolean;
  /** Muhasebeci için: Motor Satış sayfasını salt okunur görebilir (admin açar). */
  motor_satis_gor: boolean;
}

/** `/auth/verify` ve giriş yanıtındaki kullanıcı; kullanıcı yönetimi listesi de aynı alanlara ek olarak `created_at` taşır. */
export interface Kullanici extends Partial<YetkiBayraklari> {
  id: number;
  kullanici_adi: string;
  ad_soyad: string;
  rol: Rol;
  onay_durumu?: string;
  created_at?: string;
}

/** Personel/kullanıcı seçim listesi satırı (açılır listeler). */
export type KullaniciOzeti = YatirimciKaydi;

/** Yatırımcı seçim listesi (`/auth/yatirimcilar`). */
export interface YatirimciKaydi {
  id: number;
  ad_soyad: string;
  kullanici_adi?: string;
}

/** Aktivite günlüğü satırı (`aktivite_log`). */
export interface AktiviteKaydi {
  id: number;
  kullanici_id: number | null;
  kullanici_adi: string | null;
  islem_tipi: string;
  islem_detay: string | null;
  hedef_tablo: string | null;
  hedef_id: number | null;
  ip_adresi: string | null;
  tarayici_bilgisi: string | null;
  created_at: string;
}
