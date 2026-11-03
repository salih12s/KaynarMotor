import { z } from 'zod';

/** Yükleme gövdesinin üst sınırı (express.raw limiti): dosya başına 10 MB. İstek biçimine ait olduğu için routes buradan okur. */
export const MAX_BOYUT = 10 * 1024 * 1024;

/** POST /motor/:motorId?ad=dosya.pdf sorgusu. Gövde ham dosyadır (express.raw), JSON değildir. */
export const belgeYuklemeSorgusu = z.object({
  ad: z.string().optional(),
});
