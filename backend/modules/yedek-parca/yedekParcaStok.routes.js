const express = require('express');
const router = express.Router();
router.param('id', require('../../core/middleware/idDogrula').idParam);
const { pool, isUniqueViolation } = require('../../core/db');
const { orderByText } = require('../../core/sqlText');

// Yedek parça barkodları aksesuardan ayırt edilebilsin diye 9 ile başlar (13 hane)
const ILK_KOD = '9000000000001';

// GET /next-stok-kodu - Sonraki otomatik stok kodu
router.get('/next-stok-kodu', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT stok_kodu FROM yedek_parca_stok WHERE stok_kodu REGEXP '^9[0-9]{12}$' ORDER BY stok_kodu DESC LIMIT 1`
    );
    let nextCode = ILK_KOD;
    if (result.rows.length > 0) {
      const lastNum = parseInt(result.rows[0].stok_kodu, 10);
      nextCode = String(lastNum + 1);
    }
    res.json({ nextStokKodu: nextCode });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET / - Tüm stok kayıtları
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM yedek_parca_stok ORDER BY ${orderByText('stok_adi')}`);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /ara?q=... - Stok ara
router.get('/ara', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);
    const searchQuery = `%${q}%`;
    const result = await pool.query(
      `SELECT * FROM yedek_parca_stok WHERE LOWER(stok_kodu) LIKE LOWER($1) OR LOWER(stok_adi) LIKE LOWER($1) OR LOWER(marka) LIKE LOWER($1)
       ORDER BY ${orderByText('stok_adi')} LIMIT 20`,
      [searchQuery]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /barkod/:kod - Barkod (stok kodu) ile tek ürün getir
router.get('/barkod/:kod', async (req, res) => {
  try {
    const kod = (req.params.kod || '').trim();
    if (!kod) return res.status(400).json({ message: 'Barkod gerekli' });
    const result = await pool.query(
      'SELECT * FROM yedek_parca_stok WHERE stok_kodu = $1 LIMIT 1',
      [kod]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Bu barkoda ait ürün bulunamadı' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST / - Stok ekle
router.post('/', async (req, res) => {
  try {
    const { stok_kodu, stok_adi, marka, giren_miktar, birimi, alis_fiyati, satis_fiyati } = req.body;
    if (!String(stok_kodu || '').trim() || !String(stok_adi || '').trim()) return res.status(400).json({ message: 'Stok kodu ve stok adı zorunludur' });
    const mevcut = parseInt(giren_miktar) || 0;
    const envanter = mevcut * (parseFloat(satis_fiyati) || 0);

    const result = await pool.query(
      `INSERT INTO yedek_parca_stok (stok_kodu, stok_adi, marka, giren_miktar, mevcut, birimi, alis_fiyati, satis_fiyati, envanter_degeri)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [stok_kodu, stok_adi, marka || null, mevcut, mevcut, birimi || 'Adet', parseFloat(alis_fiyati) || 0, parseFloat(satis_fiyati) || 0, envanter]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) return res.status(400).json({ message: 'Bu stok kodu zaten mevcut' });
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PUT /:id - Stok güncelle
router.put('/:id', async (req, res) => {
  try {
    const { stok_kodu, stok_adi, marka, giren_miktar, birimi, alis_fiyati, satis_fiyati } = req.body;
    if (!String(stok_kodu || '').trim() || !String(stok_adi || '').trim()) return res.status(400).json({ message: 'Stok kodu ve stok adı zorunludur' });
    const giren = parseInt(giren_miktar) || 0;
    if (giren < 0) return res.status(400).json({ message: 'Giren miktar negatif olamaz' });

    // mevcut = giren − çıkan (bkz. aksesuarStok.js): düzenleme satışları stoğa geri döndürmez
    const result = await pool.query(
      `UPDATE yedek_parca_stok SET stok_kodu=$1, stok_adi=$2, marka=$3, giren_miktar=$4,
       envanter_degeri=GREATEST($4 - IFNULL(cikan_miktar, 0), 0) * $7,
       mevcut=$4 - IFNULL(cikan_miktar, 0),
       birimi=$5, alis_fiyati=$6, satis_fiyati=$7, updated_at=CURRENT_TIMESTAMP
       WHERE id=$8 RETURNING *`,
      [stok_kodu, stok_adi, marka || null, giren, birimi || 'Adet', parseFloat(alis_fiyati) || 0, parseFloat(satis_fiyati) || 0, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Stok bulunamadı' });
    res.json(result.rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) return res.status(400).json({ message: 'Bu stok kodu zaten mevcut' });
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// DELETE /:id - Stok sil
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM yedek_parca_stok WHERE id = $1', [req.params.id]);
    res.json({ message: 'Stok silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST /toplu - Toplu stok ekleme
router.post('/toplu', async (req, res) => {
  try {
    const { stoklar } = req.body;
    if (!stoklar || !Array.isArray(stoklar)) return res.status(400).json({ message: 'Stok listesi gerekli' });

    const gecersiz = stoklar.map((s, i) => (!String((s && s.stok_kodu) || '').trim() || !String((s && s.stok_adi) || '').trim() ? i + 1 : null)).filter(Boolean);
    if (gecersiz.length) return res.status(400).json({ message: `Stok kodu ve adı boş olamaz (satır: ${gecersiz.slice(0, 10).join(', ')})` });

    let eklenen = 0;
    for (const stok of stoklar) {
      const mevcut = parseInt(stok.giren_miktar) || 0;
      const envanter = mevcut * (parseFloat(stok.satis_fiyati) || 0);
      // Var olan koda tekrar aktarım: çıkan (satılan) miktar korunur → mevcut = giren − çıkan
      await pool.query(
        `INSERT INTO yedek_parca_stok (stok_kodu, stok_adi, marka, giren_miktar, mevcut, birimi, alis_fiyati, satis_fiyati, envanter_degeri)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON DUPLICATE KEY UPDATE
           stok_adi=VALUES(stok_adi), marka=COALESCE(VALUES(marka), marka), giren_miktar=VALUES(giren_miktar),
           mevcut=VALUES(giren_miktar) - IFNULL(cikan_miktar, 0),
           alis_fiyati=VALUES(alis_fiyati), satis_fiyati=VALUES(satis_fiyati),
           envanter_degeri=GREATEST(VALUES(giren_miktar) - IFNULL(cikan_miktar, 0), 0) * VALUES(satis_fiyati),
           updated_at=CURRENT_TIMESTAMP(6)`,
        [stok.stok_kodu, stok.stok_adi, stok.marka || null, mevcut, mevcut, stok.birimi || 'Adet',
         parseFloat(stok.alis_fiyati) || 0, parseFloat(stok.satis_fiyati) || 0, envanter]
      );
      eklenen++;
    }
    res.json({ message: `${eklenen} stok kaydı eklendi/güncellendi` });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
