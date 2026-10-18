import { z } from 'zod';
import { gevsekMetin, serbest } from '../../../core/dogrulama/semalar';

/** POST /segmentler gövdesi. Ad zorunluluğu service'te (eski mesajla). */
export const segmentGovdesi = z.object({
  ad: serbest,
});

/** PUT /iletisim/:kategori gövdesi (hizmet sayfası iletişim bilgileri ve görseli). */
export const iletisimGovdesi = z.object({
  personel_adi: gevsekMetin,
  telefon: gevsekMetin,
  personel_adi_2: gevsekMetin,
  telefon_2: gevsekMetin,
  aciklama: gevsekMetin,
  baslik: gevsekMetin,
  /** base64 data URL (JPEG/PNG/WebP/GIF) ya da boş. Tür doğrulaması service'te, eski mesajla. */
  gorsel: serbest,
  gorsel_sil: serbest,
});

export type SegmentGovdesi = z.infer<typeof segmentGovdesi>;
export type IletisimGovdesi = z.infer<typeof iletisimGovdesi>;
