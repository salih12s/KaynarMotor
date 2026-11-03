/*
 * Rapor URL'leri. Modül düzeyinde (server.js) yalnızca admin ve yatırımcı girebilir ve kâr alanları kariGizle ile
 * admin dışından gizlenir; yatırımcı genel raporlara girmez (kendi raporu hariç).
 */
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import * as kontrolcu from './raporlar.controller';

const router = Router();

// Yatırımcıların genel raporlara erişimini engelle (sadece kendi raporlarını görebilir)
const engelleYatirimci = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.rol === 'yatirimci') {
    return res.status(403).json({ message: 'Bu rapora erişim yetkiniz yok' });
  }
  next();
};

router.get('/gunluk', engelleYatirimci, kontrolcu.gunluk);
router.get('/aralik', engelleYatirimci, kontrolcu.aralik);
router.get('/genel', engelleYatirimci, kontrolcu.genel);
router.get('/fis-kar', engelleYatirimci, kontrolcu.fisKar);
router.get('/personeller', engelleYatirimci, kontrolcu.personeller);
router.get('/yatirimci-rapor', kontrolcu.yatirimciRaporu); // kural service'te: yatırımcı kendi, admin istediği, diğerleri 403
router.get('/yatirimci-ozet', engelleYatirimci, kontrolcu.yatirimciOzet);

export default router;
