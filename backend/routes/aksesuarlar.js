const express = require('express');
const router = express.Router();
router.param('id', require('../middleware/idDogrula').idParam);
const { pool } = require('../config/db');
const { logAktivite, ISLEM_TIPLERI } = require('../config/activityLogger');
const { upsertMusteri } = require('../config/musteriHelper');
const { parcalariEkle } = require('../config/altKayitlar');

const emptyToZero = (v) => { if (v === '' || v === undefined || v === null) return 0; const n = Number(v); return isNaN(n) ? 0 : n; };

// Aksesuar stoğunu ürün adına göre ayarlar (yon: 1 stoktan düş, -1 geri ekle).
//
// Stok, ürün ADIYLA eşlenir; aksesuar satış akışı baştan sona ad üzerinden çalıştığı ve
// aksesuar_parcalar tablosunda stok id'si tutulmadığı için bu bağ korunmuştur.
// stok_adi UNIQUE olmadığından, aynı adlı birden fazla kayıt varsa eskiden UPDATE
// hepsini birden güncelliyordu; alt sorgu ile artık tek ve deterministik satır güncellenir.
// mevcut/cikan_miktar GREATEST ile 0'ın altına düşürülmez.
// MariaDB SET atamalarını soldan sağa, GÜNCELLENMİŞ değerlerle çalıştırır (PostgreSQL hepsini
// eski değerle hesaplar): envanter_degeri, mevcut'tan ÖNCE yazılmalıdır. IFNULL: PostgreSQL'in
// GREATEST'i NULL'ı yok sayar, MariaDB'inki NULL döner.
const aksesuarStokAyarla = async (client, urunAdi, adet, yon) => {
  const ad = String(urunAdi || '').trim();
  const miktar = (emptyToZero(adet) || 1) * yon;
  if (!ad || !miktar) return;
  const sonuc = await client.query(
    `UPDATE aksesuar_stok SET
       cikan_miktar = GREATEST(IFNULL(cikan_miktar + $1, 0), 0),
       envanter_degeri = GREATEST(IFNULL(mevcut - $1, 0), 0) * satis_fiyati,
       mevcut = GREATEST(IFNULL(mevcut - $1, 0), 0),
       updated_at = CURRENT_TIMESTAMP
     WHERE id = (SELECT id FROM aksesuar_stok WHERE stok_adi = $2 ORDER BY id LIMIT 1)`,
    [miktar, ad]
  );
  // Serbest metinle girilmiş ürünler stokta bulunmayabilir; bu beklenen bir durumdur,
  // ancak sessiz kalmak yerine iz bırakılır.
  if (sonuc.rowCount === 0) {
    console.warn(`Aksesuar stok eşleşmedi, stok güncellenmedi: "${ad}"`);
  }
};

// GET /stats/genel - İstatistikler
router.get('/stats/genel', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as toplam_satis,
        COALESCE(SUM(toplam_satis), 0) as toplam_gelir,
        COALESCE(SUM(toplam_maliyet), 0) as toplam_maliyet,
        COALESCE(SUM(kar), 0) as toplam_kar,
        COUNT(CASE WHEN durum = 'beklemede' THEN 1 END) as bekleyen,
        COUNT(CASE WHEN durum = 'tamamlandi' THEN 1 END) as tamamlanan
      FROM aksesuarlar
    `);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET / - Tüm aksesuar satışları
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM aksesuarlar ORDER BY created_at DESC');
    // Parçalar ayrı sorguyla çekilip birleştirilir (PostgreSQL'deki json_agg karşılığı).
    // json_agg(ap.*) tüm parça kolonlarını verir.
    res.json(await parcalariEkle(result.rows, 'aksesuar_parcalar', 'aksesuar_id',
      ['id', 'urun_adi', 'adet', 'maliyet', 'satis_fiyati', 'created_at'], ['maliyet', 'satis_fiyati'], { anahtariTut: true }));
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /:id - Tek aksesuar
router.get('/:id', async (req, res) => {
  try {
    const aksesuar = await pool.query('SELECT * FROM aksesuarlar WHERE id = $1', [req.params.id]);
    if (aksesuar.rows.length === 0) return res.status(404).json({ message: 'Aksesuar bulunamadı' });
    const parcalar = await pool.query('SELECT * FROM aksesuar_parcalar WHERE aksesuar_id = $1 ORDER BY id', [req.params.id]);
    res.json({ ...aksesuar.rows[0], parcalar: parcalar.rows });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST / - Aksesuar satışı oluştur
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { ad_soyad, telefon, odeme_sekli, aciklama, durum, odeme_detaylari, kalan_odeme, satis_tarihi, parcalar, indirim } = req.body;
    const olusturan_kisi = req.user?.ad_soyad || req.user?.kullanici_adi || null;

    let toplamMaliyet = 0, brutSatis = 0;
    if (parcalar && parcalar.length > 0) {
      for (const p of parcalar) {
        toplamMaliyet += emptyToZero(p.adet) * emptyToZero(p.maliyet);
        brutSatis += emptyToZero(p.adet) * emptyToZero(p.satis_fiyati);
      }
    }
    // İndirim: ürün toplamından (ve dolayısıyla kârdan) düşülür. toplam_satis NET (indirim sonrası) saklanır.
    const indirimTutar = Math.min(emptyToZero(indirim), brutSatis);
    const toplamSatis = brutSatis - indirimTutar;
    const kar = toplamSatis - toplamMaliyet;
    const tamamlamaTarihi = durum === 'tamamlandi' ? new Date() : null;

    const result = await client.query(
      `INSERT INTO aksesuarlar (ad_soyad, telefon, odeme_sekli, aciklama, durum, odeme_detaylari, satis_tarihi, toplam_maliyet, toplam_satis, kar, tamamlama_tarihi, olusturan_kisi, kalan_odeme, indirim)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [ad_soyad, telefon, odeme_sekli, aciklama, durum || 'beklemede', odeme_detaylari, satis_tarihi || new Date(), toplamMaliyet, toplamSatis, kar, tamamlamaTarihi, olusturan_kisi, emptyToZero(kalan_odeme), indirimTutar]
    );
    const aksesuarId = result.rows[0].id;

    if (parcalar && parcalar.length > 0) {
      for (const p of parcalar) {
        await client.query(
          'INSERT INTO aksesuar_parcalar (aksesuar_id, urun_adi, adet, maliyet, satis_fiyati) VALUES ($1,$2,$3,$4,$5)',
          [aksesuarId, p.urun_adi, emptyToZero(p.adet) || 1, emptyToZero(p.maliyet), emptyToZero(p.satis_fiyati)]
        );
        // Tamamlandıysa stoktan düş
        if (durum === 'tamamlandi' && p.urun_adi) {
          await aksesuarStokAyarla(client, p.urun_adi, p.adet, 1);
        }
      }
    }

    await client.query('COMMIT');

    // Müşteri auto-collect
    if (ad_soyad) await upsertMusteri(ad_soyad, telefon, null);

    await logAktivite({ kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.AKSESUAR_OLUSTUR, islem_detay: `Aksesuar satış #${aksesuarId}`, hedef_tablo: 'aksesuarlar', hedef_id: aksesuarId });

    const full = await pool.query('SELECT * FROM aksesuarlar WHERE id = $1', [aksesuarId]);
    const parcalarResult = await pool.query('SELECT * FROM aksesuar_parcalar WHERE aksesuar_id = $1 ORDER BY id', [aksesuarId]);
    res.status(201).json({ ...full.rows[0], parcalar: parcalarResult.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Aksesuar oluşturma hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// PUT /:id - Aksesuar güncelle
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT * FROM aksesuarlar WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Bulunamadı' }); }
    const eskiDurum = existing.rows[0].durum;

    const { ad_soyad, telefon, odeme_sekli, aciklama, durum, odeme_detaylari, kalan_odeme, satis_tarihi, parcalar, indirim } = req.body;

    // Eski durum tamamlandi ise stokları geri ekle
    if (eskiDurum === 'tamamlandi') {
      const eskiParcalar = await client.query('SELECT * FROM aksesuar_parcalar WHERE aksesuar_id = $1', [req.params.id]);
      for (const p of eskiParcalar.rows) {
        if (p.urun_adi) {
          await aksesuarStokAyarla(client, p.urun_adi, p.adet, -1);
        }
      }
    }

    // Parçaları yeniden oluştur
    await client.query('DELETE FROM aksesuar_parcalar WHERE aksesuar_id = $1', [req.params.id]);

    let toplamMaliyet = 0, brutSatis = 0;
    if (parcalar && parcalar.length > 0) {
      for (const p of parcalar) {
        const adet = emptyToZero(p.adet) || 1;
        toplamMaliyet += adet * emptyToZero(p.maliyet);
        brutSatis += adet * emptyToZero(p.satis_fiyati);
        await client.query(
          'INSERT INTO aksesuar_parcalar (aksesuar_id, urun_adi, adet, maliyet, satis_fiyati) VALUES ($1,$2,$3,$4,$5)',
          [req.params.id, p.urun_adi, adet, emptyToZero(p.maliyet), emptyToZero(p.satis_fiyati)]
        );
        // Yeni durum tamamlandi ise stoktan düş
        if (durum === 'tamamlandi' && p.urun_adi) {
          await aksesuarStokAyarla(client, p.urun_adi, adet, 1);
        }
      }
    }

    // İndirim: ürün toplamından (ve kârdan) düşülür. toplam_satis NET saklanır.
    const indirimTutar = Math.min(emptyToZero(indirim), brutSatis);
    const toplamSatis = brutSatis - indirimTutar;
    const kar = toplamSatis - toplamMaliyet;
    const tamamlamaTarihi = (durum === 'tamamlandi' && eskiDurum !== 'tamamlandi') ? new Date() : null;

    await client.query(
      `UPDATE aksesuarlar SET ad_soyad=$1, telefon=$2, odeme_sekli=$3, aciklama=$4, durum=$5,
       odeme_detaylari=$6, satis_tarihi=$7, toplam_maliyet=$8, toplam_satis=$9, kar=$10,
       tamamlama_tarihi=COALESCE($11, tamamlama_tarihi), kalan_odeme=$13, indirim=$14, updated_at=CURRENT_TIMESTAMP WHERE id=$12`,
      [ad_soyad, telefon, odeme_sekli, aciklama, durum, odeme_detaylari, satis_tarihi, toplamMaliyet, toplamSatis, kar, tamamlamaTarihi, req.params.id, emptyToZero(kalan_odeme), indirimTutar]
    );

    await client.query('COMMIT');

    // Müşteri auto-collect
    if (ad_soyad) await upsertMusteri(ad_soyad, telefon, null);

    const full = await pool.query('SELECT * FROM aksesuarlar WHERE id = $1', [req.params.id]);
    const parcalarResult = await pool.query('SELECT * FROM aksesuar_parcalar WHERE aksesuar_id = $1 ORDER BY id', [req.params.id]);
    res.json({ ...full.rows[0], parcalar: parcalarResult.rows });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Aksesuar güncelleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

// DELETE /:id - Aksesuar sil
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT durum FROM aksesuarlar WHERE id = $1', [req.params.id]);
    if (existing.rows.length > 0 && existing.rows[0].durum === 'tamamlandi') {
      const parcalar = await client.query('SELECT * FROM aksesuar_parcalar WHERE aksesuar_id = $1', [req.params.id]);
      for (const p of parcalar.rows) {
        if (p.urun_adi) {
          await aksesuarStokAyarla(client, p.urun_adi, p.adet, -1);
        }
      }
    }
    await client.query('DELETE FROM aksesuarlar WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Aksesuar satışı silindi' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

module.exports = router;
