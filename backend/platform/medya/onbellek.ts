/*
 * Medya önbelleği (tek örnek): vitrin görselleri/videoları ve sıfır motor görselleri aynı bellek sınırını paylaşır.
 * Anahtar önekleri çakışmayı önler: "g:" vitrin görseli, "v:" vitrin videosu, "s:" sıfır motor görseli.
 */
import { MedyaOnbellegi } from './medyaOnbellegi';
import type { Medya } from './medya';

// Sık istenen küçük medya bellekten sunulur. Sınır MEDYA_ONBELLEK_MB (varsayılan 48; 0 = kapalı); paylaşımlı hostingte bellek dar.
const ayarliMb = Number(process.env.MEDYA_ONBELLEK_MB);
export const medyaOnbellegi = new MedyaOnbellegi<Medya>({
  azamiBayt: (process.env.MEDYA_ONBELLEK_MB && Number.isFinite(ayarliMb) ? ayarliMb : 48) * 1024 * 1024,
});

/** Sunulacak medya, kayıt yok ya da kayıt var ama geçersiz (izinli olmayan tür / bozuk veri). */
export type MedyaSonucu = { tur: 'bulundu'; medya: Medya } | { tur: 'yok' } | { tur: 'gecersiz' };
