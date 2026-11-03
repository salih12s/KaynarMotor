/* Aksesuar modülünün genel arayüzü: satış ve stok yolları. Başka modül ve server.ts bu modüle YALNIZCA buradan erişir (iç dosyalara doğrudan import yasak: tests/unit/mimari.test.js). */
export { default as aksesuarRoutes } from './aksesuarlar.routes';
export { default as aksesuarStokRoutes } from './aksesuarStok.routes';
