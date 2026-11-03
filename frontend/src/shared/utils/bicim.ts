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

/**
 * Türkçe yazılmış (Excel'den yapıştırılan) sayı metni → sayı. Türkçe: nokta binlik, virgül ondalık ("1.250,50" → 1250,5).
 * Eskiden ham metin sunucuya gidiyor ve `parseFloat` ile okunuyordu: "1.250,50" → 1,25 (fiyat 1000 kat küçülür), "1250,5" → 1250 (ondalık kaybolur).
 * Virgül yoksa yalnız "1.250" / "1.250.000" gibi binlik gruplu biçim binlik sayılır (içe aktarma Türkçe bir iş aracıdır);
 * "12.5" gibi diğer noktalı değerler ondalık kalır. Boş → 0; sayı olmayan ya da belirsiz → NaN (çağıran satırı reddeder, sessizce 0 yapmaz).
 */
export const trSayi = (ham: unknown): number => {
  let s = String(ham ?? '').replace(/[\s₺]|TL/gi, '');
  if (s === '') return 0;
  if (s.includes(',')) {
    // nokta yalnız ondalık virgülden ÖNCE ve 3'lü binlik gruplarında olabilir; virgül tek
    if (!/^-?(\d{1,3}(\.\d{3})+|\d*),\d+$/.test(s)) return NaN;
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  return /^-?(\d+(\.\d+)?|\.\d+)$/.test(s) ? Number(s) : NaN;
};

/** Tarih alanı: sunucudan ISO metni, formlardan YYYY-AA-GG metni ya da Date gelir. */
export type TarihGirdisi = string | number | Date | null | undefined;

// 05.01.2026; `bos` değer yoksa gösterilecek metin (varsayılan '-', Excel çıktısında '')
export const tarihYaz = (d: TarihGirdisi, bos = '-'): string => (d ? new Date(d).toLocaleDateString('tr-TR') : bos);
