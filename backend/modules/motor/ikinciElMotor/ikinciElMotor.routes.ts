/*
 * İkinci el motor URL'leri. Yazma yetkisi (admin / motor satış yetkilisi; yatırımcı ve muhasebeci salt okunur) ve kâr
 * gizleme server.js'te modül düzeyinde uygulanır; alan düzeyindeki görünürlük service/gorunum katmanındadır.
 */
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { idParam } from '../../../core/middleware/idDogrula';
import * as kontrolcu from './ikinciElMotor.controller';

const router = Router();
router.param('id', idParam);

// Muhasebeci, admin izin vermedikçe (Yetkilendirme > Motor Satış anahtarı) motor satış verisine erişemez:
// menüden gizlemek yetmez, asıl kapı burasıdır.
const muhasebeKapisi = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.rol === 'muhasebeci' && !req.user.motor_satis_gor) {
    return res.status(403).json({ message: 'Bu bölüme erişim yetkiniz yok' });
  }
  next();
};
router.use(muhasebeKapisi);

router.get('/stats/ozet', kontrolcu.ozet);
router.get('/', kontrolcu.listele);
router.get('/:id', kontrolcu.detay);
router.post('/', kontrolcu.olustur);
router.put('/:id', kontrolcu.guncelle);
router.delete('/:id', kontrolcu.sil);

export default router;
