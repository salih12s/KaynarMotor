// Vitest her test dosyasından önce bu dosyayı çalıştırır (vite.config.mjs > test.setupFiles): toBeInTheDocument gibi DOM eşleştiricilerini ekler.
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// findBy*/waitFor varsayılan olarak 1 sn bekler; yük altında (paralel ağır testler, debounce'lu ekranlar) bu da flaky sonuç verir.
configure({ asyncUtilTimeout: 5000 });
