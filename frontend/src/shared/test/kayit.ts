/*
 * Test yardımcısı (fixture): testler bir kaydın yalnızca ilgilendikleri alanlarını yazar, gerisi bilerek eksik kalır
 * (ör. "boş kalan ödeme", "tarih yok", sunucunun yetkiye göre sildiği alanlar). Bu fonksiyon, kısmi nesneyi tam kayıt
 * tipine çevirir; böylece test verisi tip denetiminden geçerken üretim kodunun tipleri gevşetilmez.
 */
export const kayit = <T>(kismi: object): T => kismi as unknown as T;

/** Kısmi kayıt listesi. */
export const kayitlar = <T>(liste: object[]): T[] => liste as unknown as T[];
