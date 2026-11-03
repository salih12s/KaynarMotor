/* Vitrin modülünün genel arayüzü (ilanlar, medya ve hizmet sayfası tek yolda toplanır). Başka modül ve server.ts bu modüle YALNIZCA buradan erişir (iç dosyalara doğrudan import yasak: tests/unit/mimari.test.js). */
export { default as vitrinRoutes } from './ilanlar/ilanlar.routes';
