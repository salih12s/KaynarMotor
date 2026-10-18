/* Müşteri URL'leri: yol → middleware → controller. */
import { Router } from 'express';
import { idParam } from '../../core/middleware/idDogrula';
import { isAdmin } from '../../core/middleware/auth';
import { modulYetkisi, MUSTERI_ARAYANLAR } from '../../core/middleware/yetki';
import * as kontrolcu from './musteriler.controller';

const router = Router();
router.param('id', idParam);

// Müşteri dizini kişisel veri (ad, telefon, adres) içerir: yalnız müşteri seçen ekranların yetkilileri arayabilir
const musteriAra = modulYetkisi(...MUSTERI_ARAYANLAR);

router.get('/', isAdmin, kontrolcu.listele);
router.get('/ara/:query', musteriAra, kontrolcu.ara);
router.get('/telefon/:telefon', musteriAra, kontrolcu.telefonaGoreBul);
router.get('/:id', isAdmin, kontrolcu.detay);
router.post('/', isAdmin, kontrolcu.ekle);
router.put('/:id', isAdmin, kontrolcu.guncelle);
router.delete('/:id', isAdmin, kontrolcu.sil);

export default router;
