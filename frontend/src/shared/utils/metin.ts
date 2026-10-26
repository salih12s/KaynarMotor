// Türkçe harfe duyarlı metin karşılaştırma. JavaScript'in `toLowerCase()` işlevi büyük "I" harfini noktalı "i"ye çevirir
// ("YILMAZ" -> "yilmaz"), oysa ekrandaki ad "Yılmaz" diye kayıtlıdır: düz karşılaştırma bu iki yazımı eşleştirmez.

/** Küçük harfe çevirir; Türkçe I/İ/ı/i farkını yok sayar. Eşitlik denetimi için (ör. kayıttaki ad ile müşteri adı). */
export const kucukHarf = (s: unknown): string =>
  String(s ?? '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i');

/** Aramada kullanılır: kucukHarf + aksanlı harf farkı da yok ("Küçük" = "kucuk" = "KÜÇÜK", "Ayşe" = "ayse"). */
export const aramaMetni = (s: unknown): string => kucukHarf(s).normalize('NFD').replace(/\p{M}/gu, '');

/** `metin`, `aranan`ı içeriyor mu? (Türkçe harf ve aksan farkı yok sayılır; boş aranan her şeyi içerir.) */
export const metinIcerir = (metin: unknown, aranan: unknown): boolean => aramaMetni(metin).includes(aramaMetni(aranan));
