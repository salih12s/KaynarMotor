/*
 * Sıfır motor stoğu URL'leri. Görsel ucu herkese açıktır (ürün fotoğrafı; <img> başlık gönderemez). Geri kalanı
 * server.ts'te kimlik doğrulama + motor yazma yetkisinden (admin / motor satış yetkilisi) geçer. Okuma: yatırımcı
 * giremez (stok onun değil), muhasebeci yalnızca admin izin verdiyse (Motor Satış anahtarı) girer.
 */
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { idParam } from '../../../core/middleware/idDogrula';
import * as kontrolcu from './sifirMotor.controller';

/** Herkese açık görsel ucu. Kimlik doğrulamadan ÖNCE bağlanır. */
export const sifirMotorGorselRoutes = Router();
sifirMotorGorselRoutes.param('id', idParam);
sifirMotorGorselRoutes.get('/gorsel/:id', kontrolcu.gorsel);

const router = Router();
router.param('id', idParam);

const okumaKapisi = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.rol === 'yatirimci' || (req.user.rol === 'muhasebeci' && !req.user.motor_satis_gor)) {
    return res.status(403).json({ message: 'Bu bölüme erişim yetkiniz yok' });
  }
  next();
};
router.use(okumaKapisi);

router.get('/', kontrolcu.listele);
router.get('/:id', kontrolcu.detay);
router.post('/', kontrolcu.olustur);
router.put('/:id', kontrolcu.guncelle);
router.delete('/:id', kontrolcu.sil);

export default router;
