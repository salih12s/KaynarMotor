/* Yedek parça modülünün genel arayüzü: satış ve stok yolları. Başka modül ve server.ts bu modüle YALNIZCA buradan erişir (iç dosyalara doğrudan import yasak: tests/unit/mimari.test.js). */
export { default as yedekParcaRoutes } from './yedekParcalar/yedekParcalar.routes';
export { default as yedekParcaStokRoutes } from './yedekParcaStok/yedekParcaStok.routes';
