const express = require('express');
const router = express.Router();
router.param('id', require('../../core/middleware/idDogrula').idParam);
const { pool } = require('../../core/db');
const { logAktivite, ISLEM_TIPLERI } = require('../../core/activityLogger');
const { upsertMusteri } = require('../musteriler/musteriler.service');
const { parcalariEkle } = require('../../shared/altKayitlar');
const { adetCoz, hataYanitla } = require('../../core/dogrula');
const { stokAyarla } = require('../../shared/stok');

const emptyToZero = (v) => { if (v === '' || v === undefined || v === null) return 0; const n = Number(v); return isNaN(n) ? 0 : n; };

// Aksesuar satış satırı mümkünse stok kaydına ID ile bağlanır (aksesuar_parcalar.stok_id): stok yeniden adlandırılsa ya da
// aynı adlı birden fazla kayıt olsa da iade doğru stoğa gider. ID'si olmayan eski satırlar ve serbest metin için ada göre
// eşleşme sürer (aynı adlı birden fazla kayıt varsa deterministik olarak en düşük id).
const stokIdCoz = async (client, stokId, urunAdi) => {
  const id = Number(stokId);
  if (Number.isInteger(id) && id > 0) {
    const varMi = await client.query('SELECT id FROM aksesuar_stok WHERE id = $1', [id]);
    if (varMi.rows.length > 0) return id;
  }
  const ad = String(urunAdi || '').trim();
  if (!ad) return null;
  const adla = await client.query('SELECT id FROM aksesuar_stok WHERE stok_adi = $1 ORDER BY id LIMIT 1', [ad]);
  return adla.rows.length > 0 ? adla.rows[0].id : null;
};

// yon: 1 stoktan düş, -1 geri ekle. Stok eksiye düşebilir (shared/stok.js).
const aksesuarStokAyarla = async (client, { stokId, urunAdi }, adet, yon) => {
  const miktar = (emptyToZero(adet) || 1) * yon;
  if (!miktar) return;
  const hedef = stokId ? Number(stokId) : await stokIdCoz(client, null, urunAdi); // ID yoksa (eski satır): ada göre
  if (!hedef) {
    if (urunAdi) console.warn(`Aksesuar stok eşleşmedi, stok güncellenmedi: "${urunAdi}"`);
    return;
  }
  await stokAyarla(client, 'aksesuar_stok', 'id = $2', hedef, miktar);
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
      ['id', 'stok_id', 'urun_adi', 'adet', 'maliyet', 'satis_fiyati', 'created_at'], ['maliyet', 'satis_fiyati'], { anahtariTut: true }));
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

    // Adet doğrulaması + tutarlılık: toplamlar, kaydedilen satır ve stok düşümü AYNI adedi kullanır
    // (eskiden boş adet toplamda 0, kayıtta 1 sayılıyordu)
    const satirlar = (Array.isArray(parcalar) ? parcalar : []).map((p) => ({ ...p, adet: adetCoz(p.adet) }));
    let toplamMaliyet = 0, brutSatis = 0;
    for (const p of satirlar) {
      toplamMaliyet += p.adet * emptyToZero(p.maliyet);
      brutSatis += p.adet * emptyToZero(p.satis_fiyati);
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

    for (const p of satirlar) {
      const stokId = await stokIdCoz(client, p.stok_id, p.urun_adi);
      await client.query(
        'INSERT INTO aksesuar_parcalar (aksesuar_id, stok_id, urun_adi, adet, maliyet, satis_fiyati) VALUES ($1,$2,$3,$4,$5,$6)',
        [aksesuarId, stokId, p.urun_adi, p.adet, emptyToZero(p.maliyet), emptyToZero(p.satis_fiyati)]
      );
      // Tamamlandıysa stoktan düş
      if (durum === 'tamamlandi') await aksesuarStokAyarla(client, { stokId, urunAdi: p.urun_adi }, p.adet, 1);
    }

    await client.query('COMMIT');

    // Müşteri auto-collect
    if (ad_soyad) await upsertMusteri(ad_soyad, telefon, null);

    await logAktivite({ kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.AKSESUAR_OLUSTUR, islem_detay: `Aksesuar satış #${aksesuarId}`, hedef_tablo: 'aksesuarlar', hedef_id: aksesuarId });

    const full = await pool.query('SELECT * FROM aksesuarlar WHERE id = $1', [aksesuarId]);
    const parcalarResult = await pool.query('SELECT * FROM aksesuar_parcalar WHERE aksesuar_id = $1 ORDER BY id', [aksesuarId]);
    res.status(201).json({ ...full.rows[0], parcalar: parcalarResult.rows });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    hataYanitla(res, error, 'Aksesuar oluşturma hatası:');
  } finally {
    client.release();
  }
});

// PUT /:id - Aksesuar güncelle
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // FOR UPDATE: eşzamanlı düzenleme/silme sıraya girer (kilitsiz okuma eski anlık görüntüyle çalışır)
    const existing = await client.query('SELECT * FROM aksesuarlar WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (existing.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Bulunamadı' }); }
    const eskiDurum = existing.rows[0].durum;

    const { ad_soyad, telefon, odeme_sekli, aciklama, durum, odeme_detaylari, kalan_odeme, satis_tarihi, parcalar, indirim } = req.body;
    const satirlar = (Array.isArray(parcalar) ? parcalar : []).map((p) => ({ ...p, adet: adetCoz(p.adet) })); // doğrulama, hiçbir şey değişmeden ÖNCE

    // Eski durum tamamlandi ise stokları geri ekle
    if (eskiDurum === 'tamamlandi') {
      const eskiParcalar = await client.query('SELECT * FROM aksesuar_parcalar WHERE aksesuar_id = $1', [req.params.id]);
      for (const p of eskiParcalar.rows) {
        await aksesuarStokAyarla(client, { stokId: p.stok_id, urunAdi: p.urun_adi }, p.adet, -1);
      }
    }

    // Parçaları yeniden oluştur
    await client.query('DELETE FROM aksesuar_parcalar WHERE aksesuar_id = $1', [req.params.id]);

    let toplamMaliyet = 0, brutSatis = 0;
    for (const p of satirlar) {
      toplamMaliyet += p.adet * emptyToZero(p.maliyet);
      brutSatis += p.adet * emptyToZero(p.satis_fiyati);
      const stokId = await stokIdCoz(client, p.stok_id, p.urun_adi);
      await client.query(
        'INSERT INTO aksesuar_parcalar (aksesuar_id, stok_id, urun_adi, adet, maliyet, satis_fiyati) VALUES ($1,$2,$3,$4,$5,$6)',
        [req.params.id, stokId, p.urun_adi, p.adet, emptyToZero(p.maliyet), emptyToZero(p.satis_fiyati)]
      );
      // Yeni durum tamamlandi ise stoktan düş
      if (durum === 'tamamlandi') await aksesuarStokAyarla(client, { stokId, urunAdi: p.urun_adi }, p.adet, 1);
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

    await logAktivite({ kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.AKSESUAR_GUNCELLE, islem_detay: `Aksesuar satış #${req.params.id} güncellendi`, hedef_tablo: 'aksesuarlar', hedef_id: parseInt(req.params.id) });

    const full = await pool.query('SELECT * FROM aksesuarlar WHERE id = $1', [req.params.id]);
    const parcalarResult = await pool.query('SELECT * FROM aksesuar_parcalar WHERE aksesuar_id = $1 ORDER BY id', [req.params.id]);
    res.json({ ...full.rows[0], parcalar: parcalarResult.rows });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    hataYanitla(res, error, 'Aksesuar güncelleme hatası:');
  } finally {
    client.release();
  }
});

// DELETE /:id - Aksesuar sil
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT durum FROM aksesuarlar WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (existing.rows.length > 0 && existing.rows[0].durum === 'tamamlandi') {
      const parcalar = await client.query('SELECT * FROM aksesuar_parcalar WHERE aksesuar_id = $1', [req.params.id]);
      for (const p of parcalar.rows) {
        await aksesuarStokAyarla(client, { stokId: p.stok_id, urunAdi: p.urun_adi }, p.adet, -1);
      }
    }
    await client.query('DELETE FROM aksesuarlar WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    // Para içeren bir satışın silinmesi iz bırakır (olmayan kayıt için günlük yazılmaz)
    if (existing.rows.length > 0) {
      await logAktivite({ kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.AKSESUAR_SIL, islem_detay: `Aksesuar satış #${req.params.id} silindi`, hedef_tablo: 'aksesuarlar', hedef_id: parseInt(req.params.id) });
    }
    res.json({ message: 'Aksesuar satışı silindi' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

module.exports = router;
