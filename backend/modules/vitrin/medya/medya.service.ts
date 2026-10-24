/*
 * Vitrin medyası sunum kuralları: sık istenen küçük medya bellekten sunulur; geçersiz/kötü MIME'lı kayıtlar (veritabanında
 * kalmış eski kayıtlar dahil) ASLA sunulmaz; video için Range aralığı çözümlenir. HTTP bilmez (başlıklar controller'da).
 */
import { MedyaOnbellegi } from '../../../core/onbellek/medyaOnbellegi';
import type { Veritabani } from '../../../core/tipler';
import * as repo from './medya.repository';
import { IZINLI_GORSEL, IZINLI_VIDEO, parseDataUrl } from '../vitrinOrtak';
import type { Medya } from '../vitrinOrtak';

// Sık istenen küçük medya bellekten sunulur. Sınır MEDYA_ONBELLEK_MB (varsayılan 48; 0 = kapalı); paylaşımlı hostingte bellek dar.
const ayarliMb = Number(process.env.MEDYA_ONBELLEK_MB);
export const medyaOnbellegi = new MedyaOnbellegi<Medya>({
  azamiBayt: (process.env.MEDYA_ONBELLEK_MB && Number.isFinite(ayarliMb) ? ayarliMb : 48) * 1024 * 1024,
});

/** Sunulacak medya, kayıt yok ya da kayıt var ama geçersiz (izinli olmayan tür / bozuk veri). */
export type MedyaSonucu = { tur: 'bulundu'; medya: Medya } | { tur: 'yok' } | { tur: 'gecersiz' };

const onbellekliBul = async (anahtar: string, getir: () => Promise<string | null>, izinli: string[]): Promise<MedyaSonucu> => {
  const bellekte = medyaOnbellegi.get(anahtar);
  if (bellekte) return { tur: 'bulundu', medya: bellekte };
  const veri = await getir();
  if (veri === null) return { tur: 'yok' };
  const medya = parseDataUrl(veri, izinli);
  if (!medya) return { tur: 'gecersiz' };
  medyaOnbellegi.set(anahtar, medya, medya.buffer.length); // sınırın yarısından büyükse alınmaz
  return { tur: 'bulundu', medya };
};

export const gorselBul = (db: Veritabani, id: string) => onbellekliBul(`g:${id}`, () => repo.gorselVerisi(db, id), IZINLI_GORSEL);

export const videoBul = (db: Veritabani, id: string) => onbellekliBul(`v:${id}`, () => repo.videoVerisi(db, id), IZINLI_VIDEO);

/** Hizmet sayfası görseli bellekte tutulmaz (az istenir, değişebilir). */
export const iletisimGorseliBul = async (db: Veritabani, kategori: string): Promise<MedyaSonucu> => {
  const veri = await repo.iletisimGorseli(db, kategori);
  if (veri === null) return { tur: 'yok' };
  const medya = parseDataUrl(veri, IZINLI_GORSEL);
  return medya ? { tur: 'bulundu', medya } : { tur: 'gecersiz' };
};

/**
 * "bytes=BAŞ-SON" aralığını toplam boyuta göre çözer. Bozuk/aşan değerler düzeltilir; baş > son ise tüm dosya döner.
 * (Tarayıcı parça (Range) isteyince 206 ile yalnızca o aralık gönderilir: video kasmaz, sarılabilir.)
 */
export const aralikCoz = (rangeBasligi: string, toplam: number): { baslangic: number; bitis: number } => {
  const m = /bytes=(\d*)-(\d*)/.exec(rangeBasligi);
  let baslangic = m && m[1] ? parseInt(m[1], 10) : 0;
  let bitis = m && m[2] ? parseInt(m[2], 10) : toplam - 1;
  if (Number.isNaN(baslangic) || baslangic < 0) baslangic = 0;
  if (Number.isNaN(bitis) || bitis >= toplam) bitis = toplam - 1;
  if (baslangic > bitis) {
    baslangic = 0;
    bitis = toplam - 1;
  }
  return { baslangic, bitis };
};
