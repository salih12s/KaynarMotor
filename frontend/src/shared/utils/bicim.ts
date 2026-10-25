/*
 * Görüntü biçimleyicileri (sayı, para, tarih). Saf fonksiyonlar: durumları yok.
 *
 * Kodun farklı yerlerinde yazılı olan `toLocaleString('tr-TR', ...)` ifadelerinin çıktısını birebir korur
 * (bkz. bicim.test.js). Para birimi simgesi (₺) bilerek burada değil: ekranlarda önde (₺1.500) ve
 * sonda (1.500 ₺) iki ayrı kullanım var, çağıran yer seçer.
 */

/** Sunucudan gelen para/sayı alanı: MariaDB DECIMAL değerleri JSON'da metin gelir, form alanları da metindir. */
export type Sayi = number | string | null | undefined;

/** Boş/geçersiz değer `varsayilan` (0) olur: `parseFloat(v || varsayilan)` ile aynı sonuç; parseFloat zaten metne çevirir. */
export const sayiDegeri = (v: Sayi, varsayilan = 0): number => parseFloat(String(v || varsayilan));

// 1.234,568 (en çok 3 ondalık); boş/geçersiz değer 0 görünür
export const sayiYaz = (v: Sayi): string => sayiDegeri(v).toLocaleString('tr-TR');

// 1.500,00 (en az 2 ondalık)
export const paraYaz = (v: Sayi): string => sayiDegeri(v).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

/** Tarih alanı: sunucudan ISO metni, formlardan YYYY-AA-GG metni ya da Date gelir. */
export type TarihGirdisi = string | number | Date | null | undefined;

// 05.01.2026; `bos` değer yoksa gösterilecek metin (varsayılan '-', Excel çıktısında '')
export const tarihYaz = (d: TarihGirdisi, bos = '-'): string => (d ? new Date(d).toLocaleDateString('tr-TR') : bos);
