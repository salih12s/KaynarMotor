import { z } from 'zod';
import { gevsekMetin } from '../../core/dogrulama/semalar';

/** POST / ve PUT /:id gövdesi (yönetim ekranı). Alanlar eski davranışla aynı: gönderilmeyen alan NULL yazılır. */
export const musteriGovdesi = z.object({
  ad_soyad: gevsekMetin,
  adres: gevsekMetin,
  telefon: gevsekMetin,
});

export type MusteriGovdesi = z.infer<typeof musteriGovdesi>;
