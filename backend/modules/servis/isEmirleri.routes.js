const express = require('express');
const crypto = require('crypto');
const router = express.Router();
router.param('id', require('../../core/middleware/idDogrula').idParam);
const { pool } = require('../../core/db');
const { logAktivite, ISLEM_TIPLERI } = require('../../core/activityLogger');
const { upsertMusteri } = require('../musteriler/musteriHelper');
const { adetCoz, hataYanitla } = require('../../core/dogrula');
const { stokAyarla } = require('../../shared/stok');

const emptyToNull = (value) => (value === '' || value === undefined) ? null : value;
const emptyToZero = (value) => {
  if (value === '' || value === undefined || value === null) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

// İş emri parçalarından yedek parça stoğuna bağlı olanları ayarla (yon: 1 stoktan düş, -1 geri ekle).
// parca_kodu yedek_parca_stok'ta yoksa (ör. aksesuar stok kodu veya serbest metin) sorgu hiçbir satırı etkilemez.
// Stok eksiye düşebilir, iade tam geri verir (shared/stok.js).
const yedekParcaStokAyarla = async (client, parcalar, yon) => {
  for (const parca of parcalar || []) {
    const kod = String(parca.parca_kodu || '').trim();
    if (!kod) continue;
    await stokAyarla(client, 'yedek_parca_stok', 'stok_kodu = $2', kod, (emptyToZero(parca.adet) || 1) * yon);
  }
};

// GET /next-fis-no/preview
router.get('/next-fis-no/preview', async (req, res) => {
  try {
    const result = await pool.query('SELECT COALESCE(MAX(fis_no), 0) + 1 AS next_fis_no FROM is_emirleri');
    // MAX()+1 MariaDB'de BIGINT (metin) döner; PostgreSQL'de int4 (sayı) dönüyordu.
    res.json({ nextFisNo: Number(result.rows[0].next_fis_no) });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET / - Tüm iş emirleri
router.get('/', async (req, res) => {
  try {
    const { baslangic, bitis, durum } = req.query;
    let query = 'SELECT * FROM is_emirleri WHERE 1=1';
    const params = [];

    if (baslangic) {
      params.push(baslangic);
      query += ` AND created_at >= $${params.length}`;
    }
    if (bitis) {
      params.push(bitis);
      query += ` AND created_at <= DATE_ADD(CAST($${params.length} AS DATE), INTERVAL 1 DAY)`;
    }
    if (durum) {
      params.push(durum);
      query += ` AND durum = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('İş emri listeleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /:id - Tek iş emri + parçalar
router.get('/:id', async (req, res) => {
  try {
    const isEmri = await pool.query('SELECT * FROM is_emirleri WHERE id = $1', [req.params.id]);
    if (isEmri.rows.length === 0) return res.status(404).json({ message: 'İş emri bulunamadı' });

    const parcalar = await pool.query('SELECT * FROM parcalar WHERE is_emri_id = $1 ORDER BY id', [req.params.id]);

    res.json({ ...isEmri.rows[0], parcalar: parcalar.rows });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST / - İş emri oluştur
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      musteri_ad_soyad, adres, telefon, km, model_tip, marka, plaka,
      aciklama, ariza_sikayetler, tahmini_teslim_tarihi, tahmini_toplam_ucret,
      durum, odeme_detaylari, kalan_odeme, parcalar
    } = req.body;

    // Fiş numarası.
    // İki iş emri aynı anda oluşturulduğunda ikisi de aynı MAX(fis_no) değerini okuyup
    // aynı numarayı üretiyordu; fis_no UNIQUE olduğu için biri "Sunucu hatası" alıyordu.
    // Tek satırlık kilit tablosundaki satır kilidi numara üretimini serileştirir ve COMMIT/ROLLBACK'te
    // kendiliğinden bırakılır (PostgreSQL'deki advisory lock karşılığı). Kilit, MAX okumasından ÖNCE
    // alınır; böylece sıradaki istek, öncekinin yazdığı numarayı görür.
    // Numaralama mantığı (MAX+1) bilinçli olarak korunmuştur.
    await client.query('SELECT id FROM fis_no_kilidi WHERE id = 1 FOR UPDATE');
    const fisNoResult = await client.query('SELECT COALESCE(MAX(fis_no), 0) + 1 AS next_fis_no FROM is_emirleri');
    const fisNo = Number(fisNoResult.rows[0].next_fis_no);

    // Müşteriyi bul/oluştur (mevcut kayıt ezilmez, yalnızca boş alanlar dolar; aynı transaction'da)
    const musteriId = telefon ? await upsertMusteri(musteri_ad_soyad, telefon, adres, client) : null;

    // İş emri INSERT
    const isEmriResult = await client.query(
      `INSERT INTO is_emirleri (fis_no, musteri_id, musteri_ad_soyad, adres, telefon, km, model_tip, marka,
        aciklama, ariza_sikayetler, tahmini_teslim_tarihi, tahmini_toplam_ucret, durum, odeme_detaylari, kalan_odeme,
        olusturan_kullanici_id, olusturan_kisi, teslim_eden_teknisyen, plaka, tamamlama_tarihi)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [fisNo, musteriId, musteri_ad_soyad, adres, telefon, emptyToZero(km), model_tip, marka,
       aciklama, ariza_sikayetler, emptyToNull(tahmini_teslim_tarihi), emptyToZero(tahmini_toplam_ucret),
       durum || 'beklemede', odeme_detaylari, emptyToZero(kalan_odeme), req.user.id, req.user.ad_soyad, req.user.ad_soyad,
       emptyToNull(plaka),
       // Doğrudan "tamamlandı" açılan iş emri de tamamlama tarihi almalı (PUT ve aksesuar POST'u gibi); aksi halde
       // günlük rapor ve fiş-kâr raporu (DATE(tamamlama_tarihi)) bu kaydı hiç görmez
       durum === 'tamamlandi' ? new Date() : null]
    );

    const isEmriId = isEmriResult.rows[0].id;

    // Parçalar ekle
    let toplamFiyat = 0;
    let toplamMaliyet = 0;
    if (parcalar && parcalar.length > 0) {
      for (const parca of parcalar) {
        const adet = adetCoz(parca.adet);
        const birimFiyat = emptyToZero(parca.birim_fiyat);
        const maliyet = emptyToZero(parca.maliyet);
        const parcaToplamFiyat = adet * birimFiyat;

        await client.query(
          `INSERT INTO parcalar (is_emri_id, parca_kodu, takilan_parca, adet, birim_fiyat, maliyet, toplam_fiyat)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [isEmriId, parca.parca_kodu, parca.takilan_parca, adet, birimFiyat, maliyet, parcaToplamFiyat]
        );
        toplamFiyat += parcaToplamFiyat;
        toplamMaliyet += adet * maliyet;
      }
    }

    // Toplamları güncelle
    const kar = toplamFiyat - toplamMaliyet;
    await client.query(
      'UPDATE is_emirleri SET gercek_toplam_ucret = $1, toplam_maliyet = $2, kar = $3 WHERE id = $4',
      [toplamFiyat, toplamMaliyet, kar, isEmriId]
    );

    // Yedek parça stoğundan seçilen parçaları stoktan düş
    await yedekParcaStokAyarla(client, parcalar, 1);

    await client.query('COMMIT');

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.IS_EMRI_OLUSTUR,
      islem_detay: `Fiş No: ${fisNo} - ${musteri_ad_soyad}`,
      hedef_tablo: 'is_emirleri', hedef_id: isEmriId
    });

    const fullResult = await pool.query('SELECT * FROM is_emirleri WHERE id = $1', [isEmriId]);
    const parcalarResult = await pool.query('SELECT * FROM parcalar WHERE is_emri_id = $1 ORDER BY id', [isEmriId]);
    res.status(201).json({ ...fullResult.rows[0], parcalar: parcalarResult.rows });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    hataYanitla(res, error, 'İş emri oluşturma hatası:');
  } finally {
    client.release();
  }
});

// PUT /:id - İş emri güncelle
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tamamlanan iş emrini personel düzenleyemez.
    // FOR UPDATE: aynı kayda aynı anda gelen ikinci düzenleme birincinin commit'ini bekler ve onun sonucunu görür;
    // kilitsiz okuma eski anlık görüntüyle çalışır ve ER_CHECKREAD (500) ile düşerdi.
    const existing = await client.query('SELECT durum FROM is_emirleri WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'İş emri bulunamadı' });
    }
    if (existing.rows[0].durum === 'tamamlandi' && req.user.rol !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'Tamamlanan iş emrini düzenleme yetkiniz yok' });
    }

    const {
      musteri_ad_soyad, adres, telefon, km, model_tip, marka, plaka,
      aciklama, ariza_sikayetler, tahmini_teslim_tarihi, tahmini_toplam_ucret,
      durum, odeme_detaylari, kalan_odeme, teslim_alan_ad_soyad, teslim_eden_teknisyen,
      teslim_tarihi, parcalar
    } = req.body;

    // Tamamlama tarihi
    let tamamlamaTarihi = null;
    if (durum === 'tamamlandi' && existing.rows[0].durum !== 'tamamlandi') {
      tamamlamaTarihi = new Date();
    }

    // Müşteriyi bul/oluştur (mevcut kayıt ezilmez, yalnızca boş alanlar dolar)
    const musteriId = telefon ? await upsertMusteri(musteri_ad_soyad, telefon, adres, client) : null;

    await client.query(
      `UPDATE is_emirleri SET
        musteri_ad_soyad=$1, adres=$2, telefon=$3, km=$4, model_tip=$5, marka=$6,
        aciklama=$7, ariza_sikayetler=$8, tahmini_teslim_tarihi=$9, tahmini_toplam_ucret=$10,
        durum=$11, odeme_detaylari=$12, teslim_alan_ad_soyad=$13, teslim_eden_teknisyen=$14,
        teslim_tarihi=$15, tamamlama_tarihi=COALESCE($16, tamamlama_tarihi), kalan_odeme=$18, plaka=$19, musteri_id=COALESCE($20, musteri_id),
        updated_at=CURRENT_TIMESTAMP WHERE id=$17`,
      [musteri_ad_soyad, adres, telefon, emptyToZero(km), model_tip, marka,
       aciklama, ariza_sikayetler, emptyToNull(tahmini_teslim_tarihi), emptyToZero(tahmini_toplam_ucret),
       durum, odeme_detaylari, teslim_alan_ad_soyad, teslim_eden_teknisyen,
       emptyToNull(teslim_tarihi), tamamlamaTarihi, req.params.id, emptyToZero(kalan_odeme), emptyToNull(plaka), musteriId]
    );

    // Parçaları yeniden oluştur — önce eski parçaların yedek parça stok düşümünü geri al
    const eskiParcalar = await client.query('SELECT parca_kodu, adet FROM parcalar WHERE is_emri_id = $1', [req.params.id]);
    await yedekParcaStokAyarla(client, eskiParcalar.rows, -1);
    await client.query('DELETE FROM parcalar WHERE is_emri_id = $1', [req.params.id]);

    let toplamFiyat = 0;
    let toplamMaliyet = 0;
    if (parcalar && parcalar.length > 0) {
      for (const parca of parcalar) {
        const adet = adetCoz(parca.adet);
        const birimFiyat = emptyToZero(parca.birim_fiyat);
        const maliyet = emptyToZero(parca.maliyet);
        const parcaToplamFiyat = adet * birimFiyat;

        await client.query(
          `INSERT INTO parcalar (is_emri_id, parca_kodu, takilan_parca, adet, birim_fiyat, maliyet, toplam_fiyat)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [req.params.id, parca.parca_kodu, parca.takilan_parca, adet, birimFiyat, maliyet, parcaToplamFiyat]
        );
        toplamFiyat += parcaToplamFiyat;
        toplamMaliyet += adet * maliyet;
      }
    }

    const kar = toplamFiyat - toplamMaliyet;
    await client.query(
      'UPDATE is_emirleri SET gercek_toplam_ucret = $1, toplam_maliyet = $2, kar = $3 WHERE id = $4',
      [toplamFiyat, toplamMaliyet, kar, req.params.id]
    );

    // Yeni parçaların yedek parça stok düşümünü uygula
    await yedekParcaStokAyarla(client, parcalar, 1);

    await client.query('COMMIT');

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.IS_EMRI_GUNCELLE,
      islem_detay: `İş emri #${req.params.id} güncellendi`,
      hedef_tablo: 'is_emirleri', hedef_id: parseInt(req.params.id)
    });

    const fullResult = await pool.query('SELECT * FROM is_emirleri WHERE id = $1', [req.params.id]);
    const parcalarResult = await pool.query('SELECT * FROM parcalar WHERE is_emri_id = $1 ORDER BY id', [req.params.id]);
    res.json({ ...fullResult.rows[0], parcalar: parcalarResult.rows });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    hataYanitla(res, error, 'İş emri güncelleme hatası:');
  } finally {
    client.release();
  }
});

// POST /qr-token - Plakaya bağlı müşteri servis geçmişi QR token'ı (yoksa oluşturur)
router.post('/qr-token', async (req, res) => {
  try {
    const plaka = String(req.body.plaka || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!plaka) return res.status(400).json({ message: 'Plaka gerekli' });
    const token = crypto.randomBytes(8).toString('hex');
    // Plaka için token varsa dokunulmaz (eski token kalır), yoksa yenisi eklenir; sonra okunur.
    await pool.query('INSERT IGNORE INTO servis_qr_tokenler (plaka, token) VALUES ($1, $2)', [plaka, token]);
    const result = await pool.query('SELECT plaka, token FROM servis_qr_tokenler WHERE plaka = $1', [plaka]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('QR token hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// DELETE /:id - İş emri sil [ADMIN]
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.rol !== 'admin') return res.status(403).json({ message: 'Admin yetkisi gerekli' });
    await client.query('BEGIN');
    await client.query('SELECT id FROM is_emirleri WHERE id = $1 FOR UPDATE', [req.params.id]); // eşzamanlı silme/düzenleme sıraya girer
    // Silinen iş emrindeki yedek parça stok düşümlerini geri al
    const eskiParcalar = await client.query('SELECT parca_kodu, adet FROM parcalar WHERE is_emri_id = $1', [req.params.id]);
    await yedekParcaStokAyarla(client, eskiParcalar.rows, -1);
    await client.query('DELETE FROM is_emirleri WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.IS_EMRI_SIL,
      islem_detay: `İş emri #${req.params.id} silindi`,
      hedef_tablo: 'is_emirleri', hedef_id: parseInt(req.params.id)
    });
    res.json({ message: 'İş emri silindi' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Sunucu hatası' });
  } finally {
    client.release();
  }
});

module.exports = router;
