/* Servis modülünün genel arayüzü: iş emirleri ve müşteri servis geçmişi yolları. Başka modül ve server.ts bu modüle YALNIZCA buradan erişir (iç dosyalara doğrudan import yasak: tests/unit/mimari.test.js). */
export { default as isEmriRoutes } from './isEmirleri.routes';
export { default as servisGecmisiRoutes } from './servisGecmisi.routes';
