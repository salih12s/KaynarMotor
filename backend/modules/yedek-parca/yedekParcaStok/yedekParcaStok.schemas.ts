import { z } from 'zod';
import { gevsekMetin, gevsekSayi, serbest } from '../../../core/dogrulama/semalar';

/** POST / ve PUT /:id gövdesi. Zorunluluk (stok kodu/adı) ve miktar kuralları service'te, eski mesajlarla. */
export const stokGovdesi = z.object({
  stok_kodu: gevsekMetin,
  stok_adi: gevsekMetin,
  marka: gevsekMetin,
  giren_miktar: gevsekSayi,
  birimi: gevsekMetin,
  alis_fiyati: gevsekSayi,
  satis_fiyati: gevsekSayi,
});

/** POST /toplu gövdesi. `stoklar` dizi mi ve satırlar geçerli mi: service eski mesajlarla denetler. */
export const topluStokGovdesi = z.object({
  stoklar: serbest,
});

export type StokGovdesi = z.infer<typeof stokGovdesi>;
export type TopluStokGovdesi = z.infer<typeof topluStokGovdesi>;
