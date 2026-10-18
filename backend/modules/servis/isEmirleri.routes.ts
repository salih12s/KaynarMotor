/* İş emri URL'leri. Servis yetkisi server.js'te modül düzeyinde uygulanır. */
import { Router } from 'express';
import { idParam } from '../../core/middleware/idDogrula';
import * as kontrolcu from './isEmirleri.controller';

const router = Router();
router.param('id', idParam);

router.get('/next-fis-no/preview', kontrolcu.sonrakiFisNo);
router.get('/', kontrolcu.listele);
router.get('/:id', kontrolcu.detay);
router.post('/', kontrolcu.olustur);
router.put('/:id', kontrolcu.guncelle);
router.post('/qr-token', kontrolcu.qrToken);
router.delete('/:id', kontrolcu.sil);

export default router;
