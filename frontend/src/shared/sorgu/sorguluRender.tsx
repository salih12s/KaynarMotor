import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { sorguIstemcisiOlustur } from './sorguIstemcisi';

/*
 * Yalnızca testler için: ekranı kendi QueryClient'ı ile render eder (uygulamayla aynı varsayılanlar).
 *
 * Her çağrı YENİ bir istemci kurar: önbellek testler arasında paylaşılsaydı bir testin verisi diğerine sızardı (isolation).
 * retry kapalı (hata senaryosu beklemeden düşsün); gcTime sonsuz (test bitince bekleyen çöp toplama zamanlayıcısı kalmasın).
 * `istemci` verilirse o önbellek kullanılır: "sayfa kapatılıp yeniden açılınca" senaryosu için.
 */
export const sorguluRender = (
  ui: ReactElement,
  { istemci = sorguIstemcisiOlustur({ retry: false, gcTime: Infinity }), ...secenekler }: { istemci?: QueryClient } & RenderOptions = {},
) => {
  const sonuc = render(<QueryClientProvider client={istemci}>{ui}</QueryClientProvider>, secenekler);
  return { ...sonuc, istemci };
};
