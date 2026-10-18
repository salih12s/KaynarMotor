import { z } from 'zod';
import { gevsekMetin, gevsekSayi, serbest } from '../../core/semalar';

/** Satış satırı. `adet` geçersizse service 400 verir (adetCoz); boş adet 1 sayılır. */
export const parcaGovdesi = z.object({
  stok_id: gevsekSayi,
  urun_adi: gevsekMetin,
  adet: gevsekSayi,
  maliyet: gevsekSayi,
  satis_fiyati: gevsekSayi,
});

/** POST / ve PUT /:id gövdesi (aksesuar satışı). */
export const satisGovdesi = z.object({
  ad_soyad: gevsekMetin,
  telefon: gevsekMetin,
  odeme_sekli: gevsekMetin,
  aciklama: gevsekMetin,
  durum: gevsekMetin,
  /** Ödeme dağılımı: nesne, dizi ya da JSON metni (olduğu gibi saklanır). */
  odeme_detaylari: serbest,
  kalan_odeme: gevsekSayi,
  satis_tarihi: gevsekMetin,
  indirim: gevsekSayi,
  parcalar: z.array(parcaGovdesi).nullish(),
});

export type ParcaGovdesi = z.infer<typeof parcaGovdesi>;
export type SatisGovdesi = z.infer<typeof satisGovdesi>;
