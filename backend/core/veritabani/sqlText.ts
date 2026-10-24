/**
 * Metin sıralama yardımcıları.
 *
 * Kolonlar harfi harfine karşılaştırılsın diye utf8mb4_nopad_bin ile tanımlıdır; bu kuralla
 * sıralama "Z"yi "a"dan, "Ç"yi "Z"den sonraya koyar. Eski PostgreSQL kurulumu (en_US.utf8) ise
 * metinleri dil kurallarıyla sıralıyordu:
 *   1. önce yalnızca harf/rakamlara bakılır; boşluk ve noktalama YOK SAYILIR
 *      ("250nk" < "250 Sr", "+90 505" rakamlardan sonra gelir)
 *   2. sonra aksanlar, sonra büyük/küçük harf (KÜÇÜK HARF ÖNCE: "abc" < "ABC")
 *   3. hepsi eşitse özgün metnin ikili sırası
 * Bu ifade o sırayı taklit eder. Canlı veritabanının gerçek sırasına karşı ölçüldü
 * (2026-10-12): 78 metin sütununun 78'inde, 6.900'den fazla benzersiz değerde birebir aynı.
 *
 * Not: REGEXP_REPLACE sonucu üzerindeki COLLATE, ORDER BY içinde yok sayılır (MariaDB
 * 11.8.9); bu yüzden sıralama doğrudan WEIGHT_STRING (ağırlık dizisi) üzerinden yapılır.
 * PostgreSQL'de NULL'lar artan sırada SONA gider; MariaDB'de başa: ilk anahtar bunu düzeltir.
 * Birleşen işaretler (U+0300-U+036F) korunur: "İ" bazı kayıtlarda "I + nokta" olarak durur.
 */
export function orderByText(column: string): string {
  const harfRakam = `REGEXP_REPLACE(${column}, '(*UCP)[^[:alnum:]̀-ͯ]', '')`;
  return `(${column} IS NULL), ` + `WEIGHT_STRING(${harfRakam} COLLATE utf8mb4_uca1400_as_cs), ` + `${column} COLLATE utf8mb4_nopad_bin`;
}

/**
 * PostgreSQL'in `json_agg(...)` / `json_build_object(...)` çıktısının JS karşılığı.
 * MariaDB'de bu birleştirme SQL ile yapılamadığı için ilgili satırlar ayrı sorguyla
 * çekilip JS'te birleştirilir. PostgreSQL JSON'unda DECIMAL kolonlar SAYI, zaman
 * damgaları saat dilimsiz ISO metni olur; bu çevirme aynı biçimi üretir.
 */
export function jsonSatir(satir: Record<string, any>, sayiKolonlari: string[] = []): Record<string, any> {
  const cikti: Record<string, any> = {};
  for (const [kolon, deger] of Object.entries(satir)) {
    if (deger === null || deger === undefined) cikti[kolon] = null;
    else if (sayiKolonlari.includes(kolon)) cikti[kolon] = Number(deger);
    else if (deger instanceof Date) cikti[kolon] = deger.toISOString().slice(0, -1);
    else cikti[kolon] = deger;
  }
  return cikti;
}

/**
 * 'YYYY-MM-DD HH:MM:SS.ffffff' (DATETIME(6) metni) -> PostgreSQL JSON zaman damgası
 * ('YYYY-MM-DDTHH:MM:SS.ffffff'; sondaki sıfırlar ve boş kesir atılır).
 */
export function pgJsonZaman(metin: unknown): string | null {
  if (metin === null || metin === undefined) return null;
  return String(metin)
    .replace(' ', 'T')
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

/** Satırları `anahtar` kolonuna göre gruplar: Map(anahtar -> satır dizisi). */
export function grupla<T extends Record<string, any>>(satirlar: T[], anahtar: string): Map<any, T[]> {
  const harita = new Map<any, T[]>();
  for (const satir of satirlar) {
    const liste = harita.get(satir[anahtar]);
    if (liste) liste.push(satir);
    else harita.set(satir[anahtar], [satir]);
  }
  return harita;
}
