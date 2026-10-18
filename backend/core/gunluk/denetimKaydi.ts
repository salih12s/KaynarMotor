import type { NextFunction, Request, Response } from 'express';
import { logAktivite, ISLEM_TIPLERI } from './activityLogger';

/*
 * Denetim kaydı ara katmanı: yazma isteği (POST/PUT/PATCH/DELETE) BAŞARIYLA bittiğinde aktivite günlüğüne
 * "kim, neyi, ne zaman" yazar. Müşteri, stok, yedek parça ve vitrin uçlarında tek tek günlük kodu olmadığı için
 * bu uçlardaki değişiklikler (ör. silinen stok, düşürülen fiyat) izlenemiyordu.
 *
 * Başarısız (4xx/5xx) istekler yazılmaz. `req.user` yönlendiriciden SONRA doldurulduğu için kayıt yanıt bitince alınır.
 * Günlük hatası ana işlemi etkilemez (logAktivite içeride yakalar). Gövde (kişisel veri/görsel) KAYDEDİLMEZ; yalnızca yol.
 */
const ISLEM: Record<string, string> = { POST: ISLEM_TIPLERI.CREATE, PUT: ISLEM_TIPLERI.UPDATE, PATCH: ISLEM_TIPLERI.UPDATE, DELETE: ISLEM_TIPLERI.DELETE };

export const denetimKaydi = (hedefTablo: string) => (req: Request, res: Response, next: NextFunction) => {
  const islemTipi = ISLEM[req.method];
  if (!islemTipi) return next();
  const yol = req.originalUrl.split('?')[0];
  // Hedef kaydı yoldan al (ör. /api/musteriler/12 → 12): req.params bu katmanda henüz dolmamıştır
  const sayisal = yol.split('/').find((p) => /^[0-9]+$/.test(p));
  let hedefId = sayisal ? parseInt(sayisal, 10) : null;
  // Oluşturmada (POST /koleksiyon) kimlik yolda yoktur: yanıtın id'sinden alınır (gövdenin kendisi kaydedilmez)
  const json = res.json.bind(res);
  res.json = (govde: any) => {
    if (hedefId === null && govde && Number.isInteger(govde.id)) hedefId = govde.id;
    return json(govde);
  };
  res.on('finish', () => {
    if (res.statusCode >= 400 || !req.user) return;
    logAktivite({
      kullanici_id: req.user.id,
      kullanici_adi: req.user.kullanici_adi,
      islem_tipi: islemTipi,
      islem_detay: `${req.method} ${yol}`,
      hedef_tablo: hedefTablo,
      hedef_id: hedefId,
      ip_adresi: req.ip,
    });
  });
  next();
};
