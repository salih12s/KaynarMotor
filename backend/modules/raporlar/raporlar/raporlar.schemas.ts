import { z } from 'zod';

/*
 * Rapor uçlarının sorgu parametreleri (hepsi GET). Gövde yoktur. Tarihler YYYY-AA-GG metni olarak SQL'e verilir
 * (DATE karşılaştırması); biçim denetimi sözleşmeyi değiştirmemek için yapılmaz, yalnızca metin olması beklenir.
 */
const tarihMetni = z.string().optional();

export const gunlukSorgusu = z.object({ tarih: tarihMetni });
export const aralikSorgusu = z.object({ baslangic: tarihMetni, bitis: tarihMetni });
export const fisKarSorgusu = z.object({ baslangic: tarihMetni, bitis: tarihMetni });
export const yatirimciRaporSorgusu = z.object({ yatirimci_id: z.string().optional(), baslangic: tarihMetni, bitis: tarihMetni });
export const yatirimciOzetSorgusu = z.object({ baslangic: tarihMetni, bitis: tarihMetni });

export type GunlukSorgusu = z.infer<typeof gunlukSorgusu>;
export type AralikSorgusu = z.infer<typeof aralikSorgusu>;
export type FisKarSorgusu = z.infer<typeof fisKarSorgusu>;
export type YatirimciRaporSorgusu = z.infer<typeof yatirimciRaporSorgusu>;
export type YatirimciOzetSorgusu = z.infer<typeof yatirimciOzetSorgusu>;
