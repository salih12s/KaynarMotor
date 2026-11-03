/* Motor modülünün genel arayüzü: ikinci el, sıfır stok ve satış belgeleri yolları. Başka modül ve server.ts bu modüle YALNIZCA buradan erişir (iç dosyalara doğrudan import yasak: tests/unit/mimari.test.js). */
export { default as ikinciElMotorRoutes } from './ikinciElMotor/ikinciElMotor.routes';
export { default as satisBelgeRoutes } from './satisBelgeleri/satisBelgeleri.routes';
export { default as sifirMotorRoutes, sifirMotorGorselRoutes } from './sifirMotor/sifirMotor.routes';
