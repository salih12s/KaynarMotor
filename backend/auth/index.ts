/* Kimlik doğrulama modülünün genel arayüzü. Başka modül ve server.ts bu modüle YALNIZCA buradan erişir (iç dosyalara doğrudan import yasak: tests/unit/mimari.test.js). */
export { default as authRoutes } from './auth.routes';
