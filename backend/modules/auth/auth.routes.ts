/*
 * Kimlik doğrulama URL'leri. Giriş/kayıt hız sınırlıdır; yönetim uçları authenticateToken + isAdmin kapısındadır.
 * (Eski tek alanlı /users/:id/*-yetkisi uçları kaldırıldı: arayüz yalnızca PATCH /users/:id/yetkiler kullanıyor.)
 */
import { Router } from 'express';
import { idParam } from '../../core/middleware/idDogrula';
import { authenticateToken, isAdmin } from '../../core/middleware/auth';
import { girisLimiti, kayitLimiti } from '../../core/middleware/rateLimit';
import * as kontrolcu from './auth.controller';

const router = Router();
router.param('id', idParam);

// Herkese açık
router.post('/register', kayitLimiti, kontrolcu.kayitOl);
router.post('/login', girisLimiti, kontrolcu.giris);

// Giriş yapmış herkes
router.post('/logout', authenticateToken, kontrolcu.cikis);
router.get('/verify', authenticateToken, kontrolcu.oturumDogrula);
router.get('/personel-listesi', authenticateToken, kontrolcu.personelListesi); // tüm onaylı kullanıcılar - herkes erişebilir

// Yalnızca admin
router.get('/users', authenticateToken, isAdmin, kontrolcu.kullanicilar);
router.patch('/users/:id/approve', authenticateToken, isAdmin, kontrolcu.onayla);
router.patch('/users/:id/reject', authenticateToken, isAdmin, kontrolcu.reddet);
router.delete('/users/:id', authenticateToken, isAdmin, kontrolcu.kullaniciSil);
router.post('/users', authenticateToken, isAdmin, kontrolcu.kullaniciOlustur);
router.patch('/users/:id/sifre', authenticateToken, isAdmin, kontrolcu.sifreSifirla);
router.get('/yatirimcilar', authenticateToken, isAdmin, kontrolcu.yatirimcilar);
router.patch('/users/:id/yetkiler', authenticateToken, isAdmin, kontrolcu.yetkileriGuncelle);
router.get('/activity-logs', authenticateToken, isAdmin, kontrolcu.sonAktiviteler);
router.get('/users/:id/activity-logs', authenticateToken, isAdmin, kontrolcu.kullaniciAktiviteleri);

export default router;
