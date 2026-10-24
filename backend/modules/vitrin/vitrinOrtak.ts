/*
 * Vitrin özellikleri arasında ortak SAF yardımcılar (veritabanı/HTTP yok, tek istisna paketAsimi): kategori ve medya kuralları,
 * base64 data URL çözümleme, bağlantı doğrulama, kategori yetkisi.
 */
import { maxPaket } from '../../core/veritabani/db';
import type { Kullanici } from '../../core/tipler';

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

// İzin verilen medya türleri. MIME istemciden geldiği için allowlist ŞARTTIR: aksi hâlde "text/html" gibi bir tür yüklenip
// aynı kaynaktan (origin) sunulur ve yönetici o bağlantıyı açınca betik çalışır (XSS).
export const IZINLI_GORSEL = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const IZINLI_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

/** Data URL'in MIME türünü base64'ü ÇÖZMEDEN okur (büyük video için ucuz doğrulama). */
export const dataUrlMime = (data: unknown): string | null => {
  const m = typeof data === 'string' ? /^data:([^;,]+);base64,/.exec(data) : null;
  return m && m[1] ? m[1].toLowerCase() : null;
};

export const medyaGecerli = (data: unknown, izinli: string[]): boolean => izinli.includes(dataUrlMime(data) as string);

export interface Medya {
  mime: string;
  buffer: Buffer;
}

/**
 * base64 data URL'i { mime, buffer } olarak çözer. `izinli` verilirse MIME bu listede değilse null döner (veritabanında
 * kalmış eski/kötü kayıtlar da sunulmaz).
 */
export const parseDataUrl = (data: unknown, izinli?: string[]): Medya | null => {
  if (!data || typeof data !== 'string') return null;
  const m = data.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  const mime = m[1] as string;
  if (izinli && !izinli.includes(mime.toLowerCase())) return null;
  return { mime, buffer: Buffer.from(m[2] as string, 'base64') };
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

/** Yazma uçlarında: geçersiz medya varsa kullanıcıya gösterilecek hata, yoksa null. */
export const medyaHatasi = (gorseller: unknown, video: unknown): string | null => {
  if (Array.isArray(gorseller) && gorseller.some((g) => !medyaGecerli(g, IZINLI_GORSEL))) {
    return 'Görseller yalnızca JPEG, PNG, WebP veya GIF olabilir';
  }
  if (typeof video === 'string' && video && !medyaGecerli(video, IZINLI_VIDEO)) {
    return 'Video yalnızca MP4, WebM, OGG veya MOV olabilir';
  }
  return null;
};

// sinir base64 metnin bayt sınırıdır; kullanıcıya HAM dosya boyutunu söyle (base64 dosyayı ~%33 şişirir)
export const hamMb = (sinir: number): number => Math.max(1, Math.floor((sinir * 0.75) / 1048576));
export const cokBuyukMesaji = (sinir: number): string => `Dosya çok büyük (en fazla ~${hamMb(sinir)} MB yüklenebilir)`;

/**
 * Veritabanı sunucusunun tek pakette kabul ettiği boyutu aşan yükleme (görsel/video) önceden reddedilir. Aksi halde sorgu
 * 'Sunucu hatası' ile (ve bağlantı koparak) düşerdi. Dönüş: sınır (bayt) ya da null.
 */
export const paketAsimi = async (...metinler: unknown[]): Promise<number | null> => {
  const sinir = (await maxPaket()) - 1024 * 1024; // sorgunun geri kalanı için pay
  return metinler.some((m) => typeof m === 'string' && Buffer.byteLength(m) > sinir) ? sinir : null;
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
