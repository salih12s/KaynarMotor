/*
 * "Son istek kazanır" koruması. Arama kutusunda hızlı yazınca birden fazla istek uçuşta olur; yanıtlar sırayla
 * gelmeyebilir ve ESKİ aramanın sonucu YENİSİNİN üzerine yazar (liste, yazılan metinle uyuşmaz).
 *
 *   const sonAra = sonIstek();                       // modül düzeyinde bir kez
 *   const res = await sonAra(servis.search(q));      // bu arada yeni bir sonAra çağrılırsa null döner
 *   if (res) setListe(res.data);
 *   sonAra.iptal();                                  // bekleyen yanıtları yok say (ör. arama kutusu temizlendi)
 *
 * Eski isteğin hatası sessizce yutulur; yalnızca güncel isteğin hatası çağırana ulaşır.
 */
export const sonIstek = () => {
  let sayac = 0;
  const koru = (vaat) => {
    const kimlik = ++sayac;
    return vaat.then(
      (deger) => (kimlik === sayac ? deger : null),
      (hata) => {
        if (kimlik === sayac) throw hata;
        return null;
      },
    );
  };
  koru.iptal = () => {
    sayac++;
  };
  return koru;
};
