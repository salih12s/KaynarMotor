const express = require('express');
const router = express.Router();
router.param('id', require('../middleware/idDogrula').idParam);
const { pool } = require('../config/db');
const { logAktivite, ISLEM_TIPLERI } = require('../config/activityLogger');
const { upsertMusteri } = require('../config/musteriHelper');

const emptyToZero = (v) => { if (v === '' || v === undefined || v === null) return 0; const n = Number(v); return isNaN(n) ? 0 : n; };
// Parçalı ödeme dağılımını JSON string olarak normalize eder
const normalizeOdeme = (v) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return null; }
};

// Personelin görebileceği motor alanları (allowlist). Gruplar ilgili yetkiyle açılır.
const MOTOR_TEMEL = ['id', 'plaka', 'marka', 'model', 'yil', 'km', 'durum', 'stok_tipi', 'tarih', 'created_at', 'updated_at', 'fatura_kesildi',
  'vitrin_baslik', 'vitrin_aciklama', 'vitrin_segment', 'vitrin_cc', 'vitrin_hasar'];
const MOTOR_ALIS = ['alis_fiyati', 'noter_alis', 'masraflar'];
const MOTOR_SATIS = ['satis_fiyati', 'noter_satis', 'kalan_odeme', 'odeme_detaylari', 'odeme_sekli', 'satis_tarihi', 'tamamlama_tarihi', 'yevmiye_no', 'aciklama'];
const MOTOR_MUSTERI = ['alici_adi', 'alici_tc', 'alici_telefon', 'alici_adres', 'satici_adi', 'satici_tc',
  'komisyoncu_adi', 'komisyoncu_telefon', 'komisyoncu_tutari'];

// Bir motor kaydını kullanıcının yetkisine göre temizler (hassas alanları gizler)
const sanitizeMotor = (row, user) => {
  if (!row) return row;
  // Admin her şeyi görür
  if (user.rol === 'admin') return row;
  // Yatırımcı:
  //  - liste_fiyati_gor AÇIK ise "vitrin" modundadır: tüm satılık motorları SADECE liste fiyatıyla görür
  //  - kapalı ise kendi motorlarını tam detayıyla görür
  if (user.rol === 'yatirimci') {
    if (!user.liste_fiyati_gor) return row;
    return {
      id: row.id, plaka: row.plaka, marka: row.marka, model: row.model,
      yil: row.yil, km: row.km, durum: row.durum, stok_tipi: row.stok_tipi,
      tarih: row.tarih, liste_fiyati: row.liste_fiyati,
      // Hassas alanlar gizli
      alis_fiyati: null, noter_alis: null, satis_fiyati: null, noter_satis: null,
      masraflar: null, kar: null, yatirimci_id: null, yatirimci_kar: null, yatirimci_kar_orani: null,
      satici_adi: null, satici_tc: null, alici_adi: null, alici_tc: null,
      alici_telefon: null, alici_adres: null,
      komisyoncu_adi: null, komisyoncu_telefon: null, komisyoncu_tutari: null
    };
  }

  // Personel: ALLOWLIST. Listede olmayan (ör. ileride eklenecek) bir kolon varsayılan olarak GİZLİDİR.
  // Kâr ve yatırımcı alanları (kar, yatirimci_*) hiçbir yetkiyle personele açılmaz: yalnızca admin (ve kendi payı için yatırımcı).
  const ms = !!user.motor_satis_yetkisi; // Motor Satış yetkisi alış/satış fiyatı, müşteri ve satış geçmişini kapsar
  const izinli = [
    ...MOTOR_TEMEL,
    ...(user.alis_fiyati_gor || ms ? MOTOR_ALIS : []),
    ...(user.satis_fiyati_gor || ms ? MOTOR_SATIS : []),
    ...(user.musteri_gor || ms ? MOTOR_MUSTERI : []),
    ...(user.liste_fiyati_gor ? ['liste_fiyati'] : []),
  ];
  const m = {};
  for (const alan of izinli) if (alan in row) m[alan] = row[alan];
  return m;
};

// Özet istatistikleri kullanıcının yetkisine göre temizler.
// sanitizeMotor tek kayıtları filtreler; toplamlar da aynı kuralı izlemelidir,
// aksi hâlde kâr/alış bilgisi bu uç üzerinden sızar.
const sanitizeOzet = (row, user) => {
  if (user.rol === 'admin') return row;
  const o = { ...row };
  o.toplam_kar = null;
  if (!(user.alis_fiyati_gor || user.motor_satis_yetkisi)) o.toplam_alis = null;
  if (!(user.satis_fiyati_gor || user.motor_satis_yetkisi)) {
    o.toplam_satis = null;
    o.toplam_satis_tutari = null;
  }
  return o;
};

// GET /stats/ozet
router.get('/stats/ozet', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(CASE WHEN durum = 'tamamlandi' THEN 1 END) as toplam,
        COALESCE(SUM(CASE WHEN durum = 'tamamlandi' THEN satis_fiyati END), 0) as toplam_satis,
        COALESCE(SUM(CASE WHEN durum = 'tamamlandi' THEN alis_fiyati END), 0) as toplam_alis,
        COALESCE(SUM(CASE WHEN durum = 'tamamlandi' THEN kar END), 0) as toplam_kar,
        COALESCE(SUM(CASE WHEN durum = 'tamamlandi' THEN satis_fiyati END), 0) as toplam_satis_tutari,
        COUNT(CASE WHEN durum = 'beklemede' THEN 1 END) as bekleyen,
        COUNT(CASE WHEN durum = 'tamamlandi' THEN 1 END) as tamamlanan
      FROM ikinci_el_motorlar
    `);
    res.json(sanitizeOzet(result.rows[0], req.user));
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET / - Tüm motor satışları
router.get('/', async (req, res) => {
  try {
    const { baslangic, bitis, durum } = req.query;
    let query = 'SELECT * FROM ikinci_el_motorlar WHERE 1=1';
    const params = [];

    if (baslangic) { params.push(baslangic); query += ` AND tarih >= $${params.length}`; }
    if (bitis) { params.push(bitis); query += ` AND tarih <= $${params.length}`; }
    if (durum) { params.push(durum); query += ` AND durum = $${params.length}`; }

    // Yatırımcı:
    if (req.user.rol === 'yatirimci') {
      if (req.user.liste_fiyati_gor) {
        // Vitrin modu: satılan/perte hariç tüm satılık motorlar (sadece liste fiyatı görünür)
        query += ` AND durum NOT IN ('tamamlandi', 'perte')`;
      } else {
        // Kendi motorları
        params.push(req.user.id);
        query += ` AND yatirimci_id = $${params.length}`;
      }
    } else if (req.user.rol !== 'admin' && !req.user.satis_gecmisi_gor && !req.user.motor_satis_yetkisi) {
      // Satış geçmişi/motor satış yetkisi olmayan personel satılan motorları görmez
      query += ` AND durum <> 'tamamlandi'`;
    }

    query += ' ORDER BY COALESCE(tamamlama_tarihi, created_at) DESC';
    const result = await pool.query(query, params);
    res.json(result.rows.map(r => sanitizeMotor(r, req.user)));
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// GET /:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ikinci_el_motorlar WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Kayıt bulunamadı' });
    const row = result.rows[0];
    // Yatırımcı (vitrin modu hariç) başka birine ait motoru göremez
    if (req.user.rol === 'yatirimci' && !req.user.liste_fiyati_gor && row.yatirimci_id !== req.user.id) {
      return res.status(403).json({ message: 'Bu kayda erişim yetkiniz yok' });
    }
    // Satılmış motor: listeyle AYNI kural (eskiden liste gizliyor ama id ile erişim açıktı)
    if (req.user.rol !== 'admin' && req.user.rol !== 'yatirimci' && !req.user.satis_gecmisi_gor && !req.user.motor_satis_yetkisi && row.durum === 'tamamlandi') {
      return res.status(404).json({ message: 'Kayıt bulunamadı' });
    }
    res.json(sanitizeMotor(row, req.user));
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// POST / - Motor satışı ekle
router.post('/', async (req, res) => {
  try {
    const {
      tarih, plaka, marka, model, km,
      alis_fiyati, satis_fiyati, noter_alis, noter_satis, masraflar,
      alici_adi, alici_tc, alici_telefon, alici_adres,
      odeme_sekli, aciklama, durum, stok_tipi,
      yil, satici_adi, satici_tc, kalan_odeme, fatura_kesildi, yevmiye_no, satis_tarihi,
      komisyoncu_adi, komisyoncu_telefon, komisyoncu_tutari,
      yatirimci_id, yatirimci_kar_orani, yatirimci_kar, liste_fiyati, odeme_detaylari,
      vitrin_baslik, vitrin_aciklama, vitrin_segment, vitrin_cc, vitrin_hasar
    } = req.body;

    const alis = emptyToZero(alis_fiyati);
    const satis = emptyToZero(satis_fiyati);
    const nAlis = emptyToZero(noter_alis);
    const nSatis = emptyToZero(noter_satis);
    const masraf = emptyToZero(masraflar);
    const komisyonTutar = emptyToZero(komisyoncu_tutari);
    const kar = satis - alis - masraf - komisyonTutar;
    const odemeDetay = normalizeOdeme(odeme_detaylari);
    // Yatırımcı ataması ve yatırımcı kârı YALNIZCA admin tarafından yapılır (PUT'taki canKar kuralıyla aynı);
    // başkasının gönderdiği değer yok sayılır. Kâr satış esnasında elle (tutar olarak) girilir, işletme kârından düşer.
    const yatirimciId = req.user.rol === 'admin' && yatirimci_id ? parseInt(yatirimci_id) : null;
    const yatirimciOran = yatirimciId ? emptyToZero(yatirimci_kar_orani) : 0;
    const yatirimciKar = yatirimciId ? emptyToZero(yatirimci_kar) : 0;
    const listeFiyati = emptyToZero(liste_fiyati);
    const tamamlamaTarihi = durum === 'tamamlandi' ? new Date() : null;

    const result = await pool.query(
      `INSERT INTO ikinci_el_motorlar (tarih, plaka, marka, model, km, alis_fiyati, satis_fiyati, noter_alis, noter_satis, masraflar, kar,
        alici_adi, alici_tc, alici_telefon, alici_adres, odeme_sekli, aciklama, durum, tamamlama_tarihi, stok_tipi,
        yil, satici_adi, satici_tc, kalan_odeme, fatura_kesildi, yevmiye_no, satis_tarihi,
        komisyoncu_adi, komisyoncu_telefon, komisyoncu_tutari,
        yatirimci_id, yatirimci_kar_orani, yatirimci_kar, liste_fiyati, odeme_detaylari,
        vitrin_baslik, vitrin_aciklama, vitrin_segment, vitrin_cc, vitrin_hasar)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40) RETURNING *`,
      [tarih || new Date(), plaka, marka, model, emptyToZero(km), alis, satis, nAlis, nSatis, masraf, kar,
       alici_adi, alici_tc, alici_telefon, alici_adres, odeme_sekli || 'nakit', aciklama, durum || 'stokta', tamamlamaTarihi, stok_tipi || 'sahip',
       emptyToZero(yil) || null, satici_adi || null, satici_tc || null, emptyToZero(kalan_odeme), fatura_kesildi || false, yevmiye_no || null, satis_tarihi || null,
       komisyoncu_adi || null, komisyoncu_telefon || null, komisyonTutar,
       yatirimciId, yatirimciOran, yatirimciKar, listeFiyati, odemeDetay,
       vitrin_baslik || null, vitrin_aciklama || null, vitrin_segment || null, emptyToZero(vitrin_cc) || null, vitrin_hasar || null]
    );

    // Müşteri auto-collect
    if (satici_adi) await upsertMusteri(satici_adi, null, null);
    if (alici_adi) await upsertMusteri(alici_adi, alici_telefon, alici_adres);
    if (komisyoncu_adi) await upsertMusteri(komisyoncu_adi, komisyoncu_telefon, null);

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_OLUSTUR,
      islem_detay: `2. El Motor: ${plaka} - ${marka} ${model}`,
      hedef_tablo: 'ikinci_el_motorlar', hedef_id: result.rows[0].id
    });

    res.status(201).json(sanitizeMotor(result.rows[0], req.user));
  } catch (error) {
    console.error('Motor satış ekleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// PUT /:id - Güncelle
router.put('/:id', async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM ikinci_el_motorlar WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ message: 'Kayıt bulunamadı' });
    const mevcut = existing.rows[0];

    // Yatırımcı kendi motoru dışındakini güncelleyemez
    if (req.user.rol === 'yatirimci' && mevcut.yatirimci_id !== req.user.id) {
      return res.status(403).json({ message: 'Bu kayda erişim yetkiniz yok' });
    }

    const isAdmin = req.user.rol === 'admin';
    const ms = !!req.user.motor_satis_yetkisi;
    const canAlis = isAdmin || req.user.alis_fiyati_gor || ms;
    const canKar = isAdmin; // yatırımcı/kâr alanlarını yalnızca admin değiştirir
    const canListe = isAdmin || req.user.liste_fiyati_gor;
    // Motor Satış yetkisi satış fiyatı ve müşteri bilgisini düzenlemeyi kapsar
    const canSatis = isAdmin || req.user.satis_fiyati_gor || ms;
    const canMusteri = isAdmin || req.user.musteri_gor || ms;

    // KISMİ GÜNCELLEME: istek gövdesinde hiç gönderilmeyen alan (undefined) mevcut kayıttaki değeriyle korunur.
    // Formlar farklı alan kümeleri gönderir (ör. Motor Stok formunda satış alanları yoktur); eksik alanın
    // 0/NULL yazılıp satış verisini silmesi engellenir. Açıkça gönderilen değer (boş metin dahil) uygulanır.
    const govde = req.body || {};
    const al = (alan) => (govde[alan] !== undefined ? govde[alan] : mevcut[alan]);
    const {
      yatirimci_id, yatirimci_kar, eski_kayit, satis_tarihi,
      // yalnızca "müşteri otomatik kaydı" için: gövdede gelen değerler (gelmediyse kayıt açılmaz)
      satici_adi, alici_adi, alici_telefon, alici_adres, komisyoncu_adi, komisyoncu_telefon
    } = govde;
    // Ödeme dağılımı body'de yoksa mevcut değeri koru (kısmi güncellemeyi bozma)
    const odemeDetay = govde.odeme_detaylari !== undefined ? normalizeOdeme(govde.odeme_detaylari) : (mevcut.odeme_detaylari || null);
    const durum = al('durum');

    // Hassas alanlar: yetkisi olmayan kullanıcının gönderdiği (boş/null) değerle veriyi bozmamak için DB değerini koru
    const alis = canAlis ? emptyToZero(al('alis_fiyati')) : parseFloat(mevcut.alis_fiyati || 0);
    const nAlis = canSatis ? emptyToZero(al('noter_alis')) : parseFloat(mevcut.noter_alis || 0);
    const satis = canSatis ? emptyToZero(al('satis_fiyati')) : parseFloat(mevcut.satis_fiyati || 0);
    const nSatis = canSatis ? emptyToZero(al('noter_satis')) : parseFloat(mevcut.noter_satis || 0);
    // masraflar kâr hesabına girer; diğer maliyet alanlarıyla aynı yetkiye bağlıdır.
    // Yetkisi olmayan kullanıcının boş göndermesiyle kâr bozulmasın diye DB değeri korunur.
    const masraf = canAlis ? emptyToZero(al('masraflar')) : parseFloat(mevcut.masraflar || 0);
    // Müşteri/komisyon alanları: yetkisi olmayan personelin boş göndermesiyle veri bozulmasın
    const komisyonTutar = canMusteri ? emptyToZero(al('komisyoncu_tutari')) : parseFloat(mevcut.komisyoncu_tutari || 0);
    const aliciAdi = canMusteri ? al('alici_adi') : mevcut.alici_adi;
    const aliciTc = canMusteri ? al('alici_tc') : mevcut.alici_tc;
    const aliciTel = canMusteri ? al('alici_telefon') : mevcut.alici_telefon;
    const aliciAdres = canMusteri ? al('alici_adres') : mevcut.alici_adres;
    const saticiAdi = canMusteri ? (al('satici_adi') || null) : mevcut.satici_adi;
    const saticiTc = canMusteri ? (al('satici_tc') || null) : mevcut.satici_tc;
    const komAdi = canMusteri ? (al('komisyoncu_adi') || null) : mevcut.komisyoncu_adi;
    const komTel = canMusteri ? (al('komisyoncu_telefon') || null) : mevcut.komisyoncu_telefon;
    const kar = satis - alis - masraf - komisyonTutar;
    const yatirimciId = canKar ? (yatirimci_id ? parseInt(yatirimci_id) : (yatirimci_id === null ? null : (mevcut.yatirimci_id || null))) : (mevcut.yatirimci_id || null);
    const yatirimciOran = canKar ? (yatirimciId ? emptyToZero(al('yatirimci_kar_orani')) : 0) : parseFloat(mevcut.yatirimci_kar_orani || 0);
    // Yatırımcı kârı: satışta elle girilen tutar. Body'de yoksa (örn. stok düzenleme) mevcut değeri koru.
    const yatirimciKar = !yatirimciId ? 0
      : (canKar && yatirimci_kar !== undefined ? emptyToZero(yatirimci_kar) : parseFloat(mevcut.yatirimci_kar || 0));
    const listeFiyati = canListe ? emptyToZero(al('liste_fiyati')) : parseFloat(mevcut.liste_fiyati || 0);
    const tamamlamaTarihi = (durum === 'tamamlandi' && mevcut.durum !== 'tamamlandi') ? new Date() : null;

    const result = await pool.query(
      `UPDATE ikinci_el_motorlar SET
        tarih=$1, plaka=$2, marka=$3, model=$4, km=$5,
        alis_fiyati=$6, satis_fiyati=$7, noter_alis=$8, noter_satis=$9, masraflar=$10, kar=$11,
        alici_adi=$12, alici_tc=$13, alici_telefon=$14, alici_adres=$15,
        odeme_sekli=$16, aciklama=$17, durum=$18,
        tamamlama_tarihi=COALESCE($19, tamamlama_tarihi),
        stok_tipi=$20, yil=$21, satici_adi=$22, satici_tc=$23,
        kalan_odeme=$24, fatura_kesildi=$25, yevmiye_no=$26,
        eski_kayit=COALESCE($28, eski_kayit),
        satis_tarihi=COALESCE($29, satis_tarihi),
        komisyoncu_adi=$30, komisyoncu_telefon=$31, komisyoncu_tutari=$32,
        yatirimci_id=$33, yatirimci_kar_orani=$34, yatirimci_kar=$35, liste_fiyati=$36,
        odeme_detaylari=$37,
        vitrin_baslik=$38, vitrin_aciklama=$39, vitrin_segment=$40, vitrin_cc=$41, vitrin_hasar=$42,
        updated_at=CURRENT_TIMESTAMP WHERE id=$27 RETURNING *`,
      [al('tarih'), al('plaka'), al('marka'), al('model'), emptyToZero(al('km')), alis, satis, nAlis, nSatis, masraf, kar,
       aliciAdi, aliciTc, aliciTel, aliciAdres, al('odeme_sekli'), al('aciklama'), durum,
       tamamlamaTarihi, al('stok_tipi') || 'sahip', emptyToZero(al('yil')) || null, saticiAdi, saticiTc,
       emptyToZero(al('kalan_odeme')), al('fatura_kesildi') || false, al('yevmiye_no') || null, req.params.id,
       eski_kayit !== undefined ? eski_kayit : null, satis_tarihi || null,
       komAdi, komTel, komisyonTutar,
       yatirimciId, yatirimciOran, yatirimciKar, listeFiyati, odemeDetay,
       al('vitrin_baslik') || null,
       al('vitrin_aciklama') || null,
       al('vitrin_segment') || null,
       emptyToZero(al('vitrin_cc')) || null,
       al('vitrin_hasar') || null]
    );

    // Motor yeni satıldıysa, bağlı vitrin/site ilanını otomatik yayından kaldır
    if (durum === 'tamamlandi' && mevcut.durum !== 'tamamlandi') {
      try {
        await pool.query('UPDATE vitrin_urunleri SET yayinda = FALSE, updated_at = CURRENT_TIMESTAMP WHERE stok_motor_id = $1', [req.params.id]);
      } catch (e) { console.error('Vitrin ilanı yayından kaldırma hatası:', e.message); }
    }

    // İlan fiyatı değiştiyse bağlı site ilanının fiyatını da güncelle (ilan fiyatı = site fiyatı)
    if (canListe && listeFiyati > 0 && listeFiyati !== parseFloat(mevcut.liste_fiyati || 0)) {
      try {
        await pool.query('UPDATE vitrin_urunleri SET fiyat = $1, updated_at = CURRENT_TIMESTAMP WHERE stok_motor_id = $2', [listeFiyati, req.params.id]);
      } catch (e) { console.error('Vitrin ilan fiyatı güncelleme hatası:', e.message); }
    }

    // Müşteri auto-collect
    if (satici_adi) await upsertMusteri(satici_adi, null, null);
    if (alici_adi) await upsertMusteri(alici_adi, alici_telefon, alici_adres);
    if (komisyoncu_adi) await upsertMusteri(komisyoncu_adi, komisyoncu_telefon, null);

    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_GUNCELLE,
      islem_detay: `2. El Motor #${req.params.id} güncellendi`,
      hedef_tablo: 'ikinci_el_motorlar', hedef_id: parseInt(req.params.id)
    });

    res.json(sanitizeMotor(result.rows[0], req.user));
  } catch (error) {
    console.error('Motor satış güncelleme hatası:', error);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// DELETE /:id - Yalnızca admin silebilir
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.rol !== 'admin') {
      return res.status(403).json({ message: 'Silme yetkiniz yok' });
    }
    // Bağlı vitrin ilanı yetim kalmasın: yayından kaldır ve bağlantıyı kopar (stok_motor_id'nin FK'si yok)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE vitrin_urunleri SET stok_motor_id = NULL, yayinda = FALSE, updated_at = CURRENT_TIMESTAMP WHERE stok_motor_id = $1', [req.params.id]);
      await client.query('DELETE FROM ikinci_el_motorlar WHERE id = $1', [req.params.id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi,
      islem_tipi: ISLEM_TIPLERI.MOTOR_SATIS_SIL,
      islem_detay: `2. El Motor #${req.params.id} silindi`,
      hedef_tablo: 'ikinci_el_motorlar', hedef_id: parseInt(req.params.id)
    });
    res.json({ message: 'Motor satışı silindi' });
  } catch (error) {
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
