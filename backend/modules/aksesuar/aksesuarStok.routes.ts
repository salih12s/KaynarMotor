/* Aksesuar stok URL'leri. Yetki (okuma/yazma) server.js'te modül düzeyinde uygulanır. */
import { Router } from 'express';
import { idParam } from '../../core/middleware/idDogrula';
import * as kontrolcu from './aksesuarStok.controller';

const router = Router();
router.param('id', idParam);

router.get('/next-stok-kodu', kontrolcu.sonrakiStokKodu);
router.get('/', kontrolcu.listele);
router.get('/ara', kontrolcu.ara);
router.get('/barkod/:kod', kontrolcu.barkodlaBul);
router.post('/', kontrolcu.ekle);
router.put('/:id', kontrolcu.guncelle);
router.delete('/:id', kontrolcu.sil);
router.post('/toplu', kontrolcu.topluEkle);

export default router;
