import { z } from 'zod';
import { gevsekMetin, gevsekSayi, serbest } from '../../core/semalar';

/** İş emrine bağlı parça/işçilik satırı. `adet` geçersizse service 400 verir (adetCoz). */
export const parcaGovdesi = z.object({
  parca_kodu: gevsekMetin,
  takilan_parca: gevsekMetin,
  adet: gevsekSayi,
  birim_fiyat: gevsekSayi,
  maliyet: gevsekSayi,
});

const ortakAlanlar = {
  musteri_ad_soyad: gevsekMetin,
  adres: gevsekMetin,
  telefon: gevsekMetin,
  km: gevsekSayi,
  model_tip: gevsekMetin,
  marka: gevsekMetin,
  plaka: gevsekMetin,
  aciklama: gevsekMetin,
  ariza_sikayetler: gevsekMetin,
  tahmini_teslim_tarihi: gevsekMetin,
  tahmini_toplam_ucret: gevsekSayi,
  durum: gevsekMetin,
  /** Ödeme dağılımı: nesne, dizi ya da JSON metni (olduğu gibi saklanır). */
  odeme_detaylari: serbest,
  kalan_odeme: gevsekSayi,
  parcalar: z.array(parcaGovdesi).nullish(),
};

/** POST / gövdesi. */
export const isEmriOlusturGovdesi = z.object(ortakAlanlar);

/** PUT /:id gövdesi (teslim alanları da gelir). */
export const isEmriGuncelleGovdesi = z.object({
  ...ortakAlanlar,
  teslim_alan_ad_soyad: gevsekMetin,
  teslim_eden_teknisyen: gevsekMetin,
  teslim_tarihi: gevsekMetin,
});

export type ParcaGovdesi = z.infer<typeof parcaGovdesi>;
export type IsEmriOlusturGovdesi = z.infer<typeof isEmriOlusturGovdesi>;
export type IsEmriGuncelleGovdesi = z.infer<typeof isEmriGuncelleGovdesi>;

/** GET / sorgu parametreleri (tarih aralığı ve durum). */
export interface IsEmriFiltresi {
  baslangic?: string;
  bitis?: string;
  durum?: string;
}
