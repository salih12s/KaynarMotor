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
export interface SonIstek {
  <T>(vaat: Promise<T>): Promise<T | null>;
  iptal: () => void;
}

export const sonIstek = (): SonIstek => {
  let sayac = 0;
  const koru = <T>(vaat: Promise<T>): Promise<T | null> => {
    const kimlik = ++sayac;
    return vaat.then(
      (deger) => (kimlik === sayac ? deger : null),
      (hata: unknown) => {
        if (kimlik === sayac) throw hata;
        return null;
      },
    );
  };
  return Object.assign(koru, {
    iptal: () => {
      sayac++;
    },
  });
};
