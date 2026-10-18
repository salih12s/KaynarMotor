/*
 * Express 4, async işleyicide fırlatılan hatayı (reddedilen Promise) yakalamaz: istek yanıtsız kalır.
 * Örnek: `const client = await pool.connect()` try dışında ve veritabanı kopmuşsa, ya da catch içindeki
 * `ROLLBACK` hata verirse istemci yanıt alamaz ve süreç yalnızca "unhandledRejection" yazar.
 *
 * Bu yama, bir işleyicinin döndürdüğü Promise reddedilirse hatayı next(err)'e iletir; böylece hata
 * server.js'teki merkezi hata işleyicisine düşer ve istemci 500 alır (express-async-errors ile aynı yaklaşım).
 * Express 4'e özgüdür; Express 5'e geçilirse gerekmez (o sürüm bunu kendisi yapar).
 */
import type { NextFunction, Request, Response } from 'express';
import Layer from 'express/lib/router/layer';

Layer.prototype.handle_request = function handleRequest(this: { handle: (...a: unknown[]) => unknown }, req: Request, res: Response, next: NextFunction) {
  const fn = this.handle as (...a: unknown[]) => unknown;
  if (fn.length > 3) return next(); // hata işleyicisi: normal akışta çağrılmaz
  try {
    const sonuc = fn(req, res, next);
    if (sonuc && typeof (sonuc as Promise<unknown>).catch === 'function') (sonuc as Promise<unknown>).catch(next);
  } catch (hata) {
    next(hata);
  }
};
