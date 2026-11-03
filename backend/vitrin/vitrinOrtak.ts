/*
 * Vitrin özellikleri arasında ortak SAF yardımcılar (veritabanı/HTTP yok): kategori kuralları, bağlantı doğrulama,
 * kategori yetkisi. Medya (görsel/video) kuralları vitrine özgü olmadığından platform/medya/medya.ts içindedir.
 */
import type { Kullanici } from '../platform/lib/tipler';

// Geçerli kategoriler
export const KATEGORILER = ['motor', 'aksesuar', 'yedek_parca', 'bakim_servis', 'nakliye', 'sigorta'];
// Motor ilanı durumu: sitede "Sıfır" ve "İkinci El" ayrı listelenir
export const MOTOR_DURUMLARI = ['sifir', 'ikinci_el'];

/** Yalnızca motor ilanının durumu vardır: geçersiz/boş değer "ikinci_el" olur; diğer kategorilerde NULL. */
export const motorDurumu = (kategori: unknown, v: unknown): string | null =>
  kategori === 'motor' ? (MOTOR_DURUMLARI.includes(v as string) ? (v as string) : 'ikinci_el') : null;

export const numOrNull = (v: unknown): number | null => {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

// Ödeme linki ve video linki yalnızca http(s) olabilir: "javascript:", "data:", "ftp:" gibi şemalar ya da şemasız metin reddedilir
const HTTP_URL = /^https?:\/\/\S+$/i;

/** Geçersiz bağlantı varsa kullanıcıya gösterilecek mesaj, yoksa null. */
export const baglantiHatasi = (rubik: unknown, video: unknown): string | null => {
  for (const [ad, deger] of [
    ['Ödeme linki', rubik],
    ['Video linki', video],
  ] as Array<[string, unknown]>) {
    if (deger === undefined || deger === null || deger === '') continue;
    if (typeof deger !== 'string' || (deger.trim() && !HTTP_URL.test(deger.trim()))) return `${ad} http:// veya https:// ile başlamalıdır`;
  }
  return null;
};

/** Personel yalnızca izinli olduğu kategoriyi yönetebilir (admin hepsini). */
export const kategoriYetkiliMi = (
  user: Pick<Kullanici, 'rol' | 'motor_vitrin_yetkisi' | 'aksesuar_vitrin_yetkisi'> | null | undefined,
  kategori: unknown,
): boolean => {
  if (!user) return false;
  if (user.rol === 'admin') return true;
  if (kategori === 'motor') return !!user.motor_vitrin_yetkisi;
  if (kategori === 'aksesuar') return !!user.aksesuar_vitrin_yetkisi;
  return false; // diğer kategoriler yalnızca admin
};
