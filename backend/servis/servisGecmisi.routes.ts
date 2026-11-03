/* Müşteriye açık servis geçmişi URL'si (QR ile erişilir, giriş gerektirmez). */
import { Router } from 'express';
import * as kontrolcu from './servisGecmisi.controller';

const router = Router();

router.get('/:token', kontrolcu.gecmisiGetir);

export default router;
