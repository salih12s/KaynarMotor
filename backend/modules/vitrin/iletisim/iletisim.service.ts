/*
 * Vitrin segmentleri ve hizmet sayfası iletişim iş kuralları. HTTP bilmez (express yok).
 * Segmentler otomatik büyür: ilan eklerken yeni bir segment adı yazılırsa listeye eklenir (segmentiGaranti).
 */
import { GecersizIstek, YetkiHatasi, bosuNull } from '../../../core/dogrulama/dogrula';
import type { Kullanici, Veritabani } from '../../../core/tipler';
import * as repo from './iletisim.repository';
import type { IletisimGovdesi, SegmentGovdesi } from './iletisim.schemas';
import { IZINLI_GORSEL, KATEGORILER, cokBuyukMesaji, kategoriYetkiliMi, medyaGecerli, paketAsimi } from '../vitrinOrtak';

export const segmentleriListele = (db: Veritabani) => repo.segmentleriListele(db);

/** Yeni segment yoksa ekler (auto-grow); ilan eklenirken kullanılır. Hata sessizce yutulur (ilan kaydı bundan etkilenmesin). */
export const segmentiGaranti = async (db: Veritabani, ad: unknown): Promise<void> => {
  if (!ad) return;
  try {
    const sira = await repo.sonrakiSegmentSirasi(db);
    await repo.segmentEkleYoksa(db, ad as string, sira);
  } catch {
    /* sessiz */
  }
};

/** Segment ekler (var olan adla çağrılırsa mevcut kaydı döner). */
export const segmentEkle = async (db: Veritabani, govde: SegmentGovdesi) => {
  const ad = typeof govde.ad === 'string' ? govde.ad.trim() : '';
  if (!ad) throw new GecersizIstek('Segment adı zorunlu');
  await segmentiGaranti(db, ad);
  return repo.segmentBul(db, ad);
};

/** Boolean ifade MariaDB'de 1/0 döner; PostgreSQL true/false döndürüyordu: yanıtta true/false. */
export const iletisimleriListele = async (db: Veritabani) =>
  (await repo.iletisimleriListele(db)).map((r: Record<string, any>) => ({ ...r, gorsel_var: Number(r.gorsel_var) === 1 }));

/** Kategori iletişimini kaydeder (upsert). Görsel: yeni geldiyse değiştirilir, gorsel_sil işaretliyse kaldırılır, yoksa dokunulmaz. */
export const iletisimKaydet = async (db: Veritabani, kategori: string, govde: IletisimGovdesi, kullanici: Kullanici) => {
  if (!KATEGORILER.includes(kategori)) throw new GecersizIstek('Geçersiz kategori');
  if (!kategoriYetkiliMi(kullanici, kategori)) throw new YetkiHatasi('Bu kategori için vitrin yetkiniz yok');
  const gorsel = govde.gorsel;
  if (typeof gorsel === 'string' && gorsel && !medyaGecerli(gorsel, IZINLI_GORSEL)) {
    throw new GecersizIstek('Görsel yalnızca JPEG, PNG, WebP veya GIF olabilir');
  }
  const asim = await paketAsimi(gorsel);
  if (asim) throw new GecersizIstek(cokBuyukMesaji(asim), 413);

  await repo.iletisimKaydet(db, kategori, {
    personel_adi: bosuNull(govde.personel_adi),
    telefon: bosuNull(govde.telefon),
    aciklama: bosuNull(govde.aciklama),
    baslik: bosuNull(govde.baslik),
    personel_adi_2: bosuNull(govde.personel_adi_2),
    telefon_2: bosuNull(govde.telefon_2),
  });
  if (typeof gorsel === 'string' && gorsel) await repo.iletisimGorseliYaz(db, kategori, gorsel);
  else if (govde.gorsel_sil) await repo.iletisimGorseliniSil(db, kategori);
};
