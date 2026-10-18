/* Yedek parça satış URL'leri. Yetki server.js'te modül düzeyinde uygulanır. */
import { Router } from 'express';
import { idParam } from '../../../core/middleware/idDogrula';
import * as kontrolcu from './yedekParcalar.controller';

const router = Router();
router.param('id', idParam);

router.get('/', kontrolcu.listele);
router.get('/:id', kontrolcu.detay);
router.post('/', kontrolcu.ekle);
router.put('/:id', kontrolcu.guncelle);
router.delete('/:id', kontrolcu.sil);

export default router;
