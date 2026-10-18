/* Vitrin medyası URL'leri (herkese açık, giriş gerektirmez). */
import { Router } from 'express';
import { idParam } from '../../core/middleware/idDogrula';
import * as kontrolcu from './vitrinMedya.controller';

const router = Router();
router.param('id', idParam);

router.get('/iletisim-gorsel/:kategori', kontrolcu.iletisimGorseli);
router.get('/gorsel/:id', kontrolcu.gorsel);
router.get('/video/:id', kontrolcu.video);

export default router;
