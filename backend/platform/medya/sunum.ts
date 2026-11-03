/* Medyayı HTTP ile sunarken ortak başlıklar (vitrin ve sıfır motor görselleri aynı kuralı kullanır). */
import type { Response } from 'express';

export const KALICI_ONBELLEK = 'public, max-age=31536000, immutable';

/** Sunulan medya betik çalıştıramasın: sniffing kapalı, sandbox'lı CSP. */
export const medyaBasliklari = (res: Response) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Security-Policy', "default-src 'none'; sandbox");
};
