const express = require('express');
const router = express.Router();
router.param('id', require('../../core/middleware/idDogrula').idParam);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../../core/db');
const { logAktivite, ISLEM_TIPLERI } = require('../../core/activityLogger');
const { authenticateToken, isAdmin, kullaniciOnbellegiTemizle } = require('../../core/middleware/auth');
const { sifreSorunu } = require('../../core/dogrula');
const { girisLimiti, kayitLimiti } = require('../../core/middleware/rateLimit');
const { orderByText } = require('../../core/sqlText');

// Kullanıcı yokken de bcrypt çalıştırmak için (yanıt süresinden kullanıcı adı sızmasın)
const SAHTE_OZET = bcrypt.hashSync('sahte-sifre-zaman-esitleme', 10);

// POST /register
router.post('/register', kayitLimiti, async (req, res) => {
  try {
    const { kullanici_adi, sifre, ad_soyad } = req.body || {};
    if (typeof kullanici_adi !== 'string' || typeof ad_soyad !== 'string' || !kullanici_adi.trim() || !ad_soyad.trim() || !sifre) {
      return res.status(400).json({ message: 'Tüm alanlar zorunludur' });
    }
    const sifreHatasi = sifreSorunu(sifre);
    if (sifreHatasi) return res.status(400).json({ message: sifreHatasi });

    const existing = await pool.query('SELECT id FROM kullanicilar WHERE kullanici_adi = $1', [kullanici_adi]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    const hashedPassword = await bcrypt.hash(sifre, 10);
    const result = await pool.query(
      `INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad)
       VALUES ($1, $2, $3) RETURNING id, kullanici_adi, ad_soyad, rol, onay_durumu`,
      [kullanici_adi, hashedPassword, ad_soyad]
    );

    await logAktivite({
      kullanici_id: result.rows[0].id,
      kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.REGISTER,
      islem_detay: `${ad_soyad} kayıt oldu`,
      ip_adresi: req.ip
    });

    res.status(201).json({ message: 'Kayıt başarılı. Admin onayı bekleniyor.', user: result.rows[0] });
  } catch (error) {
    console.error('Register hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /login
router.post('/login', girisLimiti, async (req, res) => {
  try {
    const { kullanici_adi, sifre } = req.body || {};
    // Tür denetimi: { $ne: 1 } gibi nesne/dizi gönderilirse sorguya ve bcrypt'e hiç girmez (eskiden 500 veriyordu)
    if (typeof kullanici_adi !== 'string' || typeof sifre !== 'string') {
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre' });
    }
    const result = await pool.query('SELECT * FROM kullanicilar WHERE kullanici_adi = $1', [kullanici_adi]);
    const user = result.rows[0];

    // Şifre HER ZAMAN doğrulanır (kullanıcı yoksa sahte özetle): yanıt ve süre, kullanıcı adının var olup olmadığını ve
    // hesabın onay durumunu şifreyi bilmeyen birine sızdırmaz. "Henüz onaylanmadı" yalnızca DOĞRU şifre için gösterilir.
    const isValid = await bcrypt.compare(sifre, user ? user.sifre : SAHTE_OZET);
    if (!user || !isValid) {
      await logAktivite({ kullanici_id: user ? user.id : undefined, kullanici_adi, islem_tipi: ISLEM_TIPLERI.LOGIN_FAILED, islem_detay: user ? 'Yanlış şifre' : 'Kullanıcı bulunamadı', ip_adresi: req.ip });
      return res.status(401).json({ message: 'Geçersiz kullanıcı adı veya şifre' });
    }
    if (user.onay_durumu !== 'onaylandi') {
      return res.status(403).json({ message: 'Hesabınız henüz onaylanmadı' });
    }

    // Token yalnızca kimliği taşır; rol ve yetkiler her istekte veritabanından okunur (core/middleware/auth.js)
    const token = jwt.sign({ id: user.id, kullanici_adi: user.kullanici_adi }, process.env.JWT_SECRET, { expiresIn: '24h', algorithm: 'HS256' });

    await logAktivite({ kullanici_id: user.id, kullanici_adi, islem_tipi: ISLEM_TIPLERI.LOGIN, islem_detay: 'Giriş yapıldı', ip_adresi: req.ip });

    res.json({
      token,
      user: {
        id: user.id, kullanici_adi: user.kullanici_adi, ad_soyad: user.ad_soyad, rol: user.rol,
        aksesuar_yetkisi: user.aksesuar_yetkisi, motor_satis_yetkisi: user.motor_satis_yetkisi,
        eticaret_yetkisi: user.eticaret_yetkisi, servis_yetkisi: user.servis_yetkisi,
        aksesuar_stok_yetkisi: user.aksesuar_stok_yetkisi, yedek_parca_yetkisi: user.yedek_parca_yetkisi,
        motor_vitrin_yetkisi: user.motor_vitrin_yetkisi, aksesuar_vitrin_yetkisi: user.aksesuar_vitrin_yetkisi,
        liste_fiyati_gor: user.liste_fiyati_gor, alis_fiyati_gor: user.alis_fiyati_gor,
        satis_fiyati_gor: user.satis_fiyati_gor, kar_gor: user.kar_gor,
        musteri_gor: user.musteri_gor, satis_gecmisi_gor: user.satis_gecmisi_gor
      }
    });
  } catch (error) {
    console.error('Login hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await logAktivite({ kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.LOGOUT, islem_detay: 'Çıkış yapıldı', ip_adresi: req.ip });
    res.json({ message: 'Çıkış başarılı' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /verify
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, kullanici_adi, ad_soyad, rol, aksesuar_yetkisi, motor_satis_yetkisi, eticaret_yetkisi, servis_yetkisi, aksesuar_stok_yetkisi, yedek_parca_yetkisi, motor_vitrin_yetkisi, aksesuar_vitrin_yetkisi, liste_fiyati_gor, alis_fiyati_gor, satis_fiyati_gor, kar_gor, musteri_gor, satis_gecmisi_gor FROM kullanicilar WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /personel-listesi (tüm onaylı kullanıcılar - herkes erişebilir)
router.get('/personel-listesi', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ad_soyad FROM kullanicilar WHERE onay_durumu = 'onaylandi' ORDER BY ${orderByText('ad_soyad')}`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /users [ADMIN]
router.get('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, kullanici_adi, ad_soyad, rol, onay_durumu, aksesuar_yetkisi, motor_satis_yetkisi, eticaret_yetkisi, servis_yetkisi, aksesuar_stok_yetkisi, yedek_parca_yetkisi, motor_vitrin_yetkisi, aksesuar_vitrin_yetkisi, liste_fiyati_gor, alis_fiyati_gor, satis_fiyati_gor, kar_gor, musteri_gor, satis_gecmisi_gor, created_at FROM kullanicilar ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PATCH /users/:id/approve [ADMIN]
router.patch('/users/:id/approve', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query("UPDATE kullanicilar SET onay_durumu = 'onaylandi' WHERE id = $1", [req.params.id]);
    kullaniciOnbellegiTemizle(req.params.id);
    await logAktivite({ kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.APPROVE, islem_detay: `Kullanıcı #${req.params.id} onaylandı`, hedef_tablo: 'kullanicilar', hedef_id: parseInt(req.params.id) });
    res.json({ message: 'Kullanıcı onaylandı' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PATCH /users/:id/reject [ADMIN]
router.patch('/users/:id/reject', authenticateToken, isAdmin, async (req, res) => {
  try {
    await pool.query("UPDATE kullanicilar SET onay_durumu = 'reddedildi' WHERE id = $1", [req.params.id]);
    kullaniciOnbellegiTemizle(req.params.id); // reddedilen kullanıcının açık oturumu hemen geçersiz olur
    await logAktivite({ kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.REJECT, islem_detay: `Kullanıcı #${req.params.id} reddedildi`, hedef_tablo: 'kullanicilar', hedef_id: parseInt(req.params.id) });
    res.json({ message: 'Kullanıcı reddedildi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// DELETE /users/:id [ADMIN]
router.delete('/users/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ message: 'Kendinizi silemezsiniz' });
    }
    // Kullanıcının oluşturduğu iş emirleri KORUNUR (oluşturan adı olusturan_kisi kolonunda durur); yalnızca
    // kullanıcıya bağlantı boşaltılır. Eskiden FK yüzünden "Sunucu hatası" veriyor ve kullanıcı silinemiyordu.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE is_emirleri SET olusturan_kullanici_id = NULL WHERE olusturan_kullanici_id = $1', [req.params.id]);
      await client.query('DELETE FROM kullanicilar WHERE id = $1', [req.params.id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
    kullaniciOnbellegiTemizle(req.params.id); // silinen kullanıcının token'ı hemen geçersiz olur
    res.json({ message: 'Kullanıcı silindi' });
  } catch (error) {
    console.error('Kullanıcı silme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// (Eski tek alanlı /users/:id/*-yetkisi uçları kaldırıldı: arayüz yalnızca PATCH /users/:id/yetkiler kullanıyor.)

// POST /users [ADMIN] - Kullanıcı / yatırımcı oluştur
router.post('/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { kullanici_adi, sifre, ad_soyad, rol } = req.body || {};
    if (typeof kullanici_adi !== 'string' || typeof ad_soyad !== 'string' || !kullanici_adi.trim() || !ad_soyad.trim() || !sifre) {
      return res.status(400).json({ message: 'Kullanıcı adı, şifre ve ad soyad zorunludur' });
    }
    const sifreHatasi = sifreSorunu(sifre);
    if (sifreHatasi) return res.status(400).json({ message: sifreHatasi });
    const gecerliRoller = ['personel', 'yatirimci', 'muhasebeci'];
    const yeniRol = gecerliRoller.includes(rol) ? rol : 'personel';

    const existing = await pool.query('SELECT id FROM kullanicilar WHERE kullanici_adi = $1', [kullanici_adi]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    const hashedPassword = await bcrypt.hash(sifre, 10);
    const result = await pool.query(
      `INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad, rol, onay_durumu)
       VALUES ($1, $2, $3, $4, 'onaylandi')
       RETURNING id, kullanici_adi, ad_soyad, rol, onay_durumu`,
      [kullanici_adi, hashedPassword, ad_soyad, yeniRol]
    );

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.REGISTER,
      islem_detay: `${{ yatirimci: 'Yatırımcı', muhasebeci: 'Muhasebeci' }[yeniRol] || 'Kullanıcı'} oluşturuldu: ${ad_soyad}`,
      hedef_tablo: 'kullanicilar', hedef_id: result.rows[0].id
    });

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Kullanıcı oluşturma hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PATCH /users/:id/sifre [ADMIN] - Şifre sıfırla. Şifreler artık düz metin SAKLANMAZ ve gösterilemez; unutan
// kullanıcıya yönetici yeni bir şifre belirler.
router.patch('/users/:id/sifre', authenticateToken, isAdmin, async (req, res) => {
  const { sifre } = req.body || {};
  const sorun = sifreSorunu(sifre);
  if (sorun) return res.status(400).json({ message: sorun });
  const hash = await bcrypt.hash(sifre, 10);
  const sonuc = await pool.query('UPDATE kullanicilar SET sifre = $1 WHERE id = $2', [hash, req.params.id]);
  if (sonuc.rowCount === 0) return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.UPDATE, islem_detay: `Kullanıcı #${req.params.id} şifresi sıfırlandı`,
    hedef_tablo: 'kullanicilar', hedef_id: parseInt(req.params.id)
  });
  res.json({ message: 'Şifre güncellendi' });
});

// GET /yatirimcilar - Yatırımcı listesi (motor stok ekranı için)
router.get('/yatirimcilar', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, ad_soyad, kullanici_adi FROM kullanicilar WHERE rol = 'yatirimci' AND onay_durumu = 'onaylandi' ORDER BY ${orderByText('ad_soyad')}`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PATCH /users/:id/yetkiler [ADMIN] - Alan bazlı görüntüleme yetkilerini güncelle
router.patch('/users/:id/yetkiler', authenticateToken, isAdmin, async (req, res) => {
  try {
    const izinliAlanlar = [
      'liste_fiyati_gor', 'alis_fiyati_gor', 'satis_fiyati_gor',
      'kar_gor', 'musteri_gor', 'satis_gecmisi_gor',
      'aksesuar_yetkisi', 'motor_satis_yetkisi', 'eticaret_yetkisi',
      'servis_yetkisi', 'aksesuar_stok_yetkisi', 'yedek_parca_yetkisi',
      'motor_vitrin_yetkisi', 'aksesuar_vitrin_yetkisi'
    ];
    const setParts = [];
    const params = [];
    for (const [key, value] of Object.entries(req.body || {})) {
      if (izinliAlanlar.includes(key)) {
        params.push(!!value);
        setParts.push(`${key} = $${params.length}`);
      }
    }
    if (setParts.length === 0) {
      return res.status(400).json({ message: 'Güncellenecek geçerli alan yok' });
    }
    params.push(req.params.id);
    await pool.query(`UPDATE kullanicilar SET ${setParts.join(', ')} WHERE id = $${params.length}`, params);
    kullaniciOnbellegiTemizle(req.params.id); // yetki değişikliği (alma ve verme) anında uygulanır

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.APPROVE,
      islem_detay: `Kullanıcı #${req.params.id} yetkileri güncellendi`,
      hedef_tablo: 'kullanicilar', hedef_id: parseInt(req.params.id)
    });

    res.json({ message: 'Yetkiler güncellendi' });
  } catch (error) {
    console.error('Yetki güncelleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /activity-logs [ADMIN]
router.get('/activity-logs', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM aktivite_log ORDER BY created_at DESC LIMIT 200');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /users/:id/activity-logs [ADMIN]
router.get('/users/:id/activity-logs', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM aktivite_log WHERE kullanici_id = $1 ORDER BY created_at DESC LIMIT 100', [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
