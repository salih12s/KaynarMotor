/* Müşteri modülünün genel arayüzü: yollar ve diğer modüllerin kullandığı müşteri kaydı (upsertMusteri). Başka modül ve server.ts bu modüle YALNIZCA buradan erişir (iç dosyalara doğrudan import yasak: tests/unit/mimari.test.js). */
export { default as musteriRoutes } from './musteriler.routes';
export { upsertMusteri } from './musteriler.service';
