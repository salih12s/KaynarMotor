import { z } from 'zod';

/** POST /motor/:motorId?ad=dosya.pdf sorgusu. Gövde ham dosyadır (express.raw), JSON değildir. */
export const belgeYuklemeSorgusu = z.object({
  ad: z.string().optional(),
});

export type BelgeYuklemeSorgusu = z.infer<typeof belgeYuklemeSorgusu>;
