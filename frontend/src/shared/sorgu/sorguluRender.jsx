import React from 'react';
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { sorguIstemcisiOlustur } from './sorguIstemcisi';

/*
 * Yalnızca testler için: ekranı kendi QueryClient'ı ile render eder (uygulamayla aynı varsayılanlar).
 *
 * Her çağrı YENİ bir istemci kurar: önbellek testler arasında paylaşılsaydı bir testin verisi diğerine sızardı (isolation).
 * retry kapalı (hata senaryosu beklemeden düşsün); gcTime sonsuz (test bitince bekleyen çöp toplama zamanlayıcısı kalmasın).
 * `istemci` verilirse o önbellek kullanılır: "sayfa kapatılıp yeniden açılınca" senaryosu için.
 */
export const sorguluRender = (ui, { istemci = sorguIstemcisiOlustur({ retry: false, gcTime: Infinity }), ...secenekler } = {}) => {
  const sonuc = render(<QueryClientProvider client={istemci}>{ui}</QueryClientProvider>, secenekler);
  return { ...sonuc, istemci };
};
