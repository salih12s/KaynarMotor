/*
 * Görüntü biçimleyicileri (sayı, para, tarih). Saf fonksiyonlar: durumları yok.
 *
 * Kodun farklı yerlerinde yazılı olan `toLocaleString('tr-TR', ...)` ifadelerinin çıktısını birebir korur
 * (bkz. bicim.test.js). Para birimi simgesi (₺) bilerek burada değil: ekranlarda önde (₺1.500) ve
 * sonda (1.500 ₺) iki ayrı kullanım var, çağıran yer seçer.
 */
const sayiyaCevir = (v) => parseFloat(v || 0);

// 1.234,568 (en çok 3 ondalık); boş/geçersiz değer 0 görünür
export const sayiYaz = (v) => sayiyaCevir(v).toLocaleString('tr-TR');

// 1.500,00 (en az 2 ondalık)
export const paraYaz = (v) => sayiyaCevir(v).toLocaleString('tr-TR', { minimumFractionDigits: 2 });

// 05.01.2026; `bos` değer yoksa gösterilecek metin (varsayılan '-', Excel çıktısında '')
export const tarihYaz = (d, bos = '-') => (d ? new Date(d).toLocaleDateString('tr-TR') : bos);
