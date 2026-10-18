import { z } from 'zod';
import { gevsekMetin, gevsekSayi, serbest } from '../../core/semalar';

/*
 * Vitrin ilanı gövdeleri. Kategori/medya/bağlantı kuralları ve ÖZEL mesajları service'te yapılır (eski mesajlar sabit);
 * şema alan adlarını belgeler, türü gevşek bırakır. Görseller/video base64 data URL'dir (büyük gövde: server.js'te vitrin
 * için 120 MB sınırlı ayrıştırıcı, kimlik doğrulama ve vitrin yetkisinden SONRA okunur).
 */
const ilanAlanlari = {
  kategori: gevsekMetin,
  baslik: gevsekMetin,
  aciklama: gevsekMetin,
  fiyat: gevsekSayi,
  video_url: serbest,
  marka: gevsekMetin,
  model: gevsekMetin,
  yil: gevsekSayi,
  segment: gevsekMetin,
  motor_cc: gevsekSayi,
  km: gevsekSayi,
  yayinda: serbest,
  siralama: gevsekSayi,
  /** base64 data URL dizisi; ilki kapak. Dizi/tür doğrulaması service'te. */
  gorseller: serbest,
  /** base64 video data URL. */
  video: serbest,
  one_cikan: serbest,
  stok_motor_id: gevsekSayi,
  rubik_link: serbest,
  hasar_kaydi: gevsekMetin,
  motor_durumu: serbest,
};

/** POST / gövdesi. */
export const ilanOlusturGovdesi = z.object(ilanAlanlari);

/** PUT /:id gövdesi (`video_sil`: mevcut videoyu kaldır). */
export const ilanGuncelleGovdesi = z.object({ ...ilanAlanlari, video_sil: serbest });

/** PUT /sirala gövdesi. */
export const siralaGovdesi = z.object({ kategori: serbest, urun_ids: serbest });

/** PATCH /:id/yayin gövdesi. */
export const yayinGovdesi = z.object({ yayinda: serbest });

/** PATCH /:id/sira gövdesi. */
export const siraGovdesi = z.object({ sira: serbest });

/** GET / sorgu parametreleri (hepsi isteğe bağlı metin). */
export const ilanSorgusu = z.object({
  kategori: z.string().optional(),
  segment: z.string().optional(),
  cc_min: z.string().optional(),
  cc_max: z.string().optional(),
  km_max: z.string().optional(),
  marka: z.string().optional(),
  q: z.string().optional(),
  hepsi: z.string().optional(),
  durum: z.string().optional(),
});

export type IlanOlusturGovdesi = z.infer<typeof ilanOlusturGovdesi>;
export type IlanGuncelleGovdesi = z.infer<typeof ilanGuncelleGovdesi>;
export type SiralaGovdesi = z.infer<typeof siralaGovdesi>;
export type YayinGovdesi = z.infer<typeof yayinGovdesi>;
export type SiraGovdesi = z.infer<typeof siraGovdesi>;
export type IlanSorgusu = z.infer<typeof ilanSorgusu>;
