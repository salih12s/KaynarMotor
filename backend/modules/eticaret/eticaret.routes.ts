/* E-ticaret URL'leri. E-ticaret yetkisi server.js'te modül düzeyinde uygulanır; platform yönetimi admin'e kısıtlıdır (service). */
import { Router } from 'express';
import { idParam } from '../../core/middleware/idDogrula';
import * as kontrolcu from './eticaret.controller';

const router = Router();
router.param('id', idParam);

// Platformlar
router.get('/platformlar', kontrolcu.platformlariListele);
router.post('/platformlar', kontrolcu.platformEkle);
router.put('/platformlar/:id', kontrolcu.platformGuncelle);
router.delete('/platformlar/:id', kontrolcu.platformSil);

// Satışlar
router.get('/stats', kontrolcu.istatistik);
router.get('/', kontrolcu.satislariListele);
router.get('/:id', kontrolcu.satisDetay);
router.post('/', kontrolcu.satisOlustur);
router.put('/:id', kontrolcu.satisGuncelle);
router.delete('/:id', kontrolcu.satisSil);

export default router;
