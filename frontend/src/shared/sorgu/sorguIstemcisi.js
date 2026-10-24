import { QueryClient } from '@tanstack/react-query';

/*
 * Sunucu verisinin önbelleği (TanStack Query).
 *
 * Varsayılanlar bugünkü davranışa yakın tutuldu: sekmeye dönünce kendiliğinden yeniden çekme yok, başarısız istek
 * bir kez yeniden denenir. Aynı veriyi 30 sn içinde isteyen ikinci ekran sunucuya gitmez, önbellekten okur.
 * `ek`: testlerin üzerine yazdığı ayarlar (aynı varsayılanlarla, gerçek davranışı ölçsünler diye).
 */
export const sorguIstemcisiOlustur = (ek = {}) =>
  new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30 * 1000, retry: 1, refetchOnWindowFocus: false, ...ek },
    },
  });
