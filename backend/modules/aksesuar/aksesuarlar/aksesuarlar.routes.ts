/* Aksesuar satışı URL'leri. Yetki server.js'te modül düzeyinde uygulanır. */
import { Router } from 'express';
import { idParam } from '../../../core/middleware/idDogrula';
import * as kontrolcu from './aksesuarlar.controller';

const router = Router();
router.param('id', idParam);

router.get('/stats/genel', kontrolcu.istatistik);
router.get('/', kontrolcu.listele);
router.get('/:id', kontrolcu.detay);
router.post('/', kontrolcu.olustur);
router.put('/:id', kontrolcu.guncelle);
router.delete('/:id', kontrolcu.sil);

export default router;
