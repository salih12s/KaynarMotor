/* Müşteri URL'leri: yol → middleware → controller. */
import { Router } from 'express';
import { idParam } from '../middleware/idDogrula';
import { isAdmin } from '../middleware/auth';
import { modulYetkisi, MUSTERI_ARAYANLAR } from '../middleware/yetki';
import * as kontrolcu from '../controllers/musteriler.controller';

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
