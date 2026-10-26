import { z } from 'zod';
import { gevsekMetin, gevsekSayi } from '../../../core/dogrulama/semalar';

/**
 * Sıfır motor (model) alanları. POST ve PUT aynı alanları kullanır; PUT KISMİ güncellemedir (gönderilmeyen alan mevcut
 * değerle korunur). `gorseller`: base64 data URL dizisi (ilki kapak); PUT'ta gönderilirse görseller tamamen yenilenir.
 */
const sifirMotorAlanlari = {
  marka: gevsekMetin,
  model: gevsekMetin,
  yil: gevsekSayi,
  motor_cc: gevsekSayi,
  segment: gevsekMetin,
  alis_fiyati: gevsekSayi,
  liste_fiyati: gevsekSayi,
  aciklama: gevsekMetin,
  gorseller: z.array(z.unknown()).max(30, 'En fazla 30 görsel yüklenebilir').optional(),
};

export const sifirMotorGovdesi = z.object(sifirMotorAlanlari);

export type SifirMotorGovdesi = z.infer<typeof sifirMotorGovdesi>;
