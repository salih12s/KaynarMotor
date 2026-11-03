/* Vitrin segment ve iletişim URL'leri. Okuma herkese açık; yazma admin veya vitrin yetkilisine (kategori kuralı service'te). */
import { Router } from 'express';
import { authenticateToken } from '../../platform/middleware/auth';
import { vitrinYetkili } from '../../platform/middleware/yetki';
import * as kontrolcu from './iletisim.controller';

const router = Router();
const vitrinYazma = [authenticateToken, vitrinYetkili];

router.get('/segmentler', kontrolcu.segmentleriListele);
router.get('/iletisim', kontrolcu.iletisimleriListele);
router.post('/segmentler', ...vitrinYazma, kontrolcu.segmentEkle);
router.put('/iletisim/:kategori', ...vitrinYazma, kontrolcu.iletisimKaydet);

export default router;
