/* Raporlar modülünün genel arayüzü: raporlar ve veresiye yolları. Başka modül ve server.ts bu modüle YALNIZCA buradan erişir (iç dosyalara doğrudan import yasak: tests/unit/mimari.test.js). */
export { default as raporRoutes } from './raporlar/raporlar.routes';
export { default as veresiyeRoutes } from './veresiye/veresiye.routes';
