import { z } from 'zod';
import { gevsekMetin, gevsekSayi } from '../../core/semalar';

/** POST /platformlar ve PUT /platformlar/:id gövdesi. Platform adı zorunluluğu service'te (eski mesajla). */
export const platformGovdesi = z.object({
  platform_adi: gevsekMetin,
  komisyon_orani: gevsekSayi,
  kdv_orani: gevsekSayi,
  kargo_ucreti: gevsekSayi,
});

/** POST / ve PUT /:id gövdesi (e-ticaret satışı). */
export const satisGovdesi = z.object({
  stok_id: gevsekSayi,
  platform_id: gevsekSayi,
  urun_adi: gevsekMetin,
  alis_fiyati: gevsekSayi,
  satis_fiyati: gevsekSayi,
  komisyon_orani: gevsekSayi,
  kdv_orani: gevsekSayi,
  kargo_ucreti: gevsekSayi,
  adet: gevsekSayi,
  tarih: gevsekMetin,
});

export type PlatformGovdesi = z.infer<typeof platformGovdesi>;
export type SatisGovdesi = z.infer<typeof satisGovdesi>;
