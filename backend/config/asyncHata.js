/*
 * Express 4, async işleyicide fırlatılan hatayı (reddedilen Promise) yakalamaz: istek yanıtsız kalır.
 * Örnek: `const client = await pool.connect()` try dışında ve veritabanı kopmuşsa, ya da catch içindeki
 * `ROLLBACK` hata verirse istemci yanıt alamaz ve süreç yalnızca "unhandledRejection" yazar.
 *
 * Bu yama, bir işleyicinin döndürdüğü Promise reddedilirse hatayı next(err)'e iletir; böylece hata
 * server.js'teki merkezi hata işleyicisine düşer ve istemci 500 alır (express-async-errors ile aynı yaklaşım).
 * Express 4'e özgüdür; Express 5'e geçilirse gerekmez (o sürüm bunu kendisi yapar).
 */
const Layer = require('express/lib/router/layer');

Layer.prototype.handle_request = function handleRequest(req, res, next) {
  const fn = this.handle;
  if (fn.length > 3) return next(); // hata işleyicisi: normal akışta çağrılmaz
  try {
    const sonuc = fn(req, res, next);
    if (sonuc && typeof sonuc.catch === 'function') sonuc.catch(next);
  } catch (hata) {
    next(hata);
  }
};
