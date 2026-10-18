/* Satış belgeleri URL'leri ve erişim kapısı. Yükleme gövdesi ham ikilidir (express.raw). */
import express, { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import * as kontrolcu from './satisBelgeleri.controller';
import { MAX_BOYUT } from './satisBelgeleri.service';

const router = Router();

// Sözleşmelerde TC kimlik gibi kişisel veri olur: admin, Motor Satış yetkilisi ve Motor Vitrini (Site) yetkilisi
// görür/yükler/siler. Yatırımcı ve diğer personel erişemez.
// Muhasebeci yalnızca arşiv listesini görür ve dosya indirir (yükleme/silme yok).
const belgeKapisi = (req: Request, res: Response, next: NextFunction) => {
  const u: Partial<Request['user']> = req.user || {};
  if (u.rol === 'admin' || u.motor_satis_yetkisi || u.motor_vitrin_yetkisi) return next();
  if (u.rol === 'muhasebeci' && req.method === 'GET' && (req.path === '/arsiv' || /^\/\d+\/indir$/.test(req.path))) return next();
  return res.status(403).json({ message: 'Satış belgelerine erişim yetkiniz yok' });
};
router.use(belgeKapisi);

router.get('/arsiv', kontrolcu.arsiv);
router.get('/motor/:motorId', kontrolcu.motorBelgeleri);
router.post('/motor/:motorId', express.raw({ type: () => true, limit: MAX_BOYUT }), kontrolcu.yukle);
router.get('/:id/indir', kontrolcu.indir);
router.delete('/:id', kontrolcu.sil);

export default router;
