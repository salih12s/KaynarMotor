/*
 * Vitrin (site ilanları) URL'leri. Okuma herkese açık (yalnızca yayındaki ilanlar); yazma admin veya vitrin yetkilisine
 * (kategori kuralı service'te). Üç özellik tek yol altında birleşir; SIRA ÖNEMLİDİR: sabit yollar ('/segmentler',
 * '/iletisim', '/gorsel/:id', ...) en genel yol olan '/:id'den ÖNCE tanımlanır.
 *
 * Büyük (base64 görsel/video) gövde ayrıştırıcısı ve kimlik doğrulama server.js'tedir: yetkisiz biri sunucu belleğini
 * şişiremesin diye gövde ancak yetki doğrulandıktan SONRA okunur.
 */
import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { idParam } from '../../../core/middleware/idDogrula';
import { authenticateToken, isAdmin } from '../../../core/middleware/auth';
import { vitrinYetkili } from '../../../core/middleware/yetki';
import * as kontrolcu from './ilanlar.controller';
import vitrinIletisimRoutes from '../iletisim/iletisim.routes';
import vitrinMedyaRoutes from '../medya/medya.routes';

const ilanlar = Router();
ilanlar.param('id', idParam);

const admin = [authenticateToken, isAdmin];
// Vitrin yazma yetkisi: admin VEYA motor/aksesuar vitrin yetkisi olan personel (core/middleware/yetki)
const vitrinYazma = [authenticateToken, vitrinYetkili];

// hepsi=1 (yayından kaldırılmış/arşiv ilanlar dahil) yalnızca giriş yapmış vitrin yetkililerine açıktır
const hepsiKapisi = (req: Request, res: Response, next: NextFunction) => {
  if (!req.query.hepsi) return next();
  authenticateToken(req, res, () => vitrinYetkili(req, res, next));
};

// ---------- PUBLIC ----------
ilanlar.get('/yukleme-siniri', ...vitrinYazma, kontrolcu.yuklemeSiniri); // yönetim ekranı için (dosya seçilir seçilmez uyarı)
ilanlar.get('/', hepsiKapisi, kontrolcu.ilanlariListele);
ilanlar.get('/markalar', kontrolcu.markalariListele);
ilanlar.get('/:id', kontrolcu.ilanDetay);

// ---------- ADMIN / VİTRİN YETKİLİSİ ----------
ilanlar.put('/sirala', ...vitrinYazma, kontrolcu.sirala);
ilanlar.patch('/:id/yayin', ...admin, kontrolcu.yayinDurumuAyarla);
ilanlar.patch('/:id/sira', ...admin, kontrolcu.siraAyarla);
ilanlar.post('/', ...vitrinYazma, kontrolcu.ilanOlustur);
ilanlar.put('/:id', ...vitrinYazma, kontrolcu.ilanGuncelle);
ilanlar.delete('/:id', ...vitrinYazma, kontrolcu.ilanSil);

const router = Router();
router.use(vitrinMedyaRoutes);     // /gorsel/:id, /video/:id, /iletisim-gorsel/:kategori
router.use(vitrinIletisimRoutes);  // /segmentler, /iletisim, PUT /iletisim/:kategori
router.use(ilanlar);               // geri kalan her şey (en genel yol '/:id' en sonda)

export default router;
