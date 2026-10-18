import { z } from 'zod';
import { gevsekMetin, gevsekSayi } from '../../../core/dogrulama/semalar';

/** POST / ve PUT /:id gövdesi (yedek parça satışı). `adet` boşsa 1; geçersizse service 400 verir (adetCoz). */
export const satisGovdesi = z.object({
  urun_adi: gevsekMetin,
  alis_fiyati: gevsekSayi,
  satis_fiyati: gevsekSayi,
  musteri_adi: gevsekMetin,
  musteri_telefon: gevsekMetin,
  kalan_odeme: gevsekSayi,
  stok_id: gevsekSayi,
  adet: gevsekSayi,
});

export type SatisGovdesi = z.infer<typeof satisGovdesi>;
