import { z } from 'zod';
import { serbest } from '../../core/dogrulama/semalar';

/*
 * Kimlik doğrulama gövdeleri. Alan türü/boşluk denetimleri (ve onların ÖZEL mesajları) service'te yapılır: eskiden
 * { $ne: 1 } gibi nesne gönderen birine 500 yerine 401 veriliyor, mesajlar kullanıcı adının var olup olmadığını
 * sızdırmayacak biçimde sabitti. Şema yalnızca alan adlarını belgeler; türü bilerek `unknown` bırakır.
 */

/** POST /register ve POST /users gövdesi (rol yalnızca admin ucunda anlamlıdır). */
export const kullaniciOlusturGovdesi = z.object({
  kullanici_adi: serbest,
  sifre: serbest,
  ad_soyad: serbest,
  rol: serbest,
});

/** POST /login gövdesi. */
export const girisGovdesi = z.object({
  kullanici_adi: serbest,
  sifre: serbest,
});

/** PATCH /users/:id/sifre gövdesi. */
export const sifreGovdesi = z.object({
  sifre: serbest,
});

/** PATCH /users/:id/yetkiler gövdesi: yalnızca bilinen yetki bayrakları dikkate alınır (service izinli listeyi uygular). */
export const YETKI_ALANLARI = [
  'liste_fiyati_gor', 'alis_fiyati_gor', 'satis_fiyati_gor',
  'kar_gor', 'musteri_gor', 'satis_gecmisi_gor',
  'aksesuar_yetkisi', 'motor_satis_yetkisi', 'eticaret_yetkisi',
  'servis_yetkisi', 'aksesuar_stok_yetkisi', 'yedek_parca_yetkisi',
  'motor_vitrin_yetkisi', 'aksesuar_vitrin_yetkisi',
  'motor_satis_gor',
] as const;

export const yetkiGovdesi = z.object(Object.fromEntries(YETKI_ALANLARI.map((a) => [a, serbest])) as Record<(typeof YETKI_ALANLARI)[number], typeof serbest>);

export type KullaniciOlusturGovdesi = z.infer<typeof kullaniciOlusturGovdesi>;
export type GirisGovdesi = z.infer<typeof girisGovdesi>;
export type SifreGovdesi = z.infer<typeof sifreGovdesi>;
export type YetkiGovdesi = z.infer<typeof yetkiGovdesi>;
