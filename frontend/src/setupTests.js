// react-scripts testi başlatmadan önce bu dosyayı çalıştırır: toBeInTheDocument gibi DOM eşleştiricilerini ekler.
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// MUI diyalogları jsdom'da yavaştır; ağır bileşen testleri paralel çalışınca birbirini yavaşlatır. 5 sn'lik varsayılan sınır
// bu yüzden "bazen geçen bazen kalan" (flaky) sonuç verir: tek ortak, geniş sınır.
jest.setTimeout(60000);

// findBy*/waitFor varsayılan olarak 1 sn bekler; yük altında (paralel ağır testler, debounce'lu ekranlar) bu da flaky sonuç verir.
configure({ asyncUtilTimeout: 5000 });
