const express = require('express');
const { pool, maxPaket, paketHatasi } = require('../config/db');
const { orderByText } = require('../config/sqlText');
const { opsiyonelKullanici } = require('../middleware/auth');
const { vitrinYetkili } = require('../middleware/yetki');

// Geçerli kategoriler
const KATEGORILER = ['motor', 'aksesuar', 'yedek_parca', 'bakim_servis', 'nakliye', 'sigorta'];
// Motor ilanı durumu: sitede "Sıfır" ve "İkinci El" ayrı listelenir
const MOTOR_DURUMLARI = ['sifir', 'ikinci_el'];
const motorDurumu = (kategori, v) => (kategori === 'motor' ? (MOTOR_DURUMLARI.includes(v) ? v : 'ikinci_el') : null);

const emptyToNull = (v) => (v === '' || v === undefined ? null : v);
const numOrNull = (v) => {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
};

// İlanların vitrin sırasını topluca yazar: ids[i] -> siralama = i. (PostgreSQL'deki
// UPDATE ... FROM unnest(...) WITH ORDINALITY karşılığı.) Etkilenen satır sayısını döndürür.
// Aynı kategoriye ait olmayan id'ler güncellenmez; çağıran satır sayısını ids.length ile karşılaştırır.
const siralamaYaz = async (client, ids, kategori) => {
  const durumlar = ids.map((_, i) => `WHEN $${i + 2} THEN ${i}`).join(' ');
  const liste = ids.map((_, i) => `$${i + 2}`).join(', ');
  return client.query(
    `UPDATE vitrin_urunleri SET siralama = CASE id ${durumlar} END, updated_at = CURRENT_TIMESTAMP
     WHERE id IN (${liste}) AND kategori = $1`,
    [kategori, ...ids]
  );
};

// Veritabanı sunucusunun tek pakette kabul ettiği boyutu aşan yükleme (görsel/video) önceden reddedilir.
// Aksi halde sorgu 'Sunucu hatası' ile (ve bağlantı koparak) düşerdi. Dönüş: sınır (bayt) ya da null.
const paketAsimi = async (...metinler) => {
  const sinir = (await maxPaket()) - 1024 * 1024; // sorgunun geri kalanı için pay
  return metinler.some((m) => typeof m === 'string' && Buffer.byteLength(m) > sinir) ? sinir : null;
};
// sinir base64 metnin bayt sınırıdır; kullanıcıya HAM dosya boyutunu söyle (base64 dosyayı ~%33 şişirir)
const hamMb = (sinir) => Math.max(1, Math.floor((sinir * 0.75) / 1048576));
const cokBuyukYanit = (res, sinir) =>
  res.status(413).json({ message: `Dosya çok büyük (en fazla ~${hamMb(sinir)} MB yüklenebilir)` });

// İzin verilen medya türleri. MIME istemciden geldiği için allowlist ŞARTTIR: aksi hâlde "text/html" gibi
// bir tür yüklenip aynı kaynaktan (origin) sunulur ve yönetici o bağlantıyı açınca betik çalışır (XSS).
const IZINLI_GORSEL = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const IZINLI_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];

// Data URL'in MIME türünü base64'ü ÇÖZMEDEN okur (büyük video için ucuz doğrulama)
const dataUrlMime = (data) => {
  const m = typeof data === 'string' ? /^data:([^;,]+);base64,/.exec(data) : null;
  return m ? m[1].toLowerCase() : null;
};
const medyaGecerli = (data, izinli) => izinli.includes(dataUrlMime(data));

// Ödeme linki ve video linki yalnızca http(s) olabilir: "javascript:", "data:", "ftp:" gibi şemalar ya da şemasız metin reddedilir
const HTTP_URL = /^https?:\/\/\S+$/i;
const baglantiHatasi = (rubik, video) => {
  for (const [ad, deger] of [['Ödeme linki', rubik], ['Video linki', video]]) {
    if (deger === undefined || deger === null || deger === '') continue;
    if (typeof deger !== 'string' || (deger.trim() && !HTTP_URL.test(deger.trim()))) return `${ad} http:// veya https:// ile başlamalıdır`;
  }
  return null;
};

// Yazma uçlarında: geçersiz medya varsa kullanıcıya gösterilecek hata, yoksa null
const medyaHatasi = (gorseller, video) => {
  if (Array.isArray(gorseller) && gorseller.some((g) => !medyaGecerli(g, IZINLI_GORSEL))) {
    return 'Görseller yalnızca JPEG, PNG, WebP veya GIF olabilir';
  }
  if (typeof video === 'string' && video && !medyaGecerli(video, IZINLI_VIDEO)) {
    return 'Video yalnızca MP4, WebM, OGG veya MOV olabilir';
  }
  return null;
};

// Sunulan medya betik çalıştıramasın: sniffing kapalı, sandbox'lı CSP
const medyaBasliklari = (res) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Security-Policy', "default-src 'none'; sandbox");
};

// base64 data URL'i { mime, buffer } olarak çözer. izinli verilirse MIME bu listede değilse null döner
// (veritabanında kalmış eski/kötü kayıtlar da sunulmaz).
const parseDataUrl = (data, izinli) => {
  if (!data || typeof data !== 'string') return null;
  const m = data.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  if (izinli && !izinli.includes(m[1].toLowerCase())) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], 'base64') };
};

module.exports = (authenticateToken, isAdmin) => {
  const router = express.Router();
  router.param('id', require('../middleware/idDogrula').idParam);
  const admin = [authenticateToken, isAdmin];

  // Vitrin yazma yetkisi: admin VEYA motor/aksesuar vitrin yetkisi olan personel (middleware/yetki.js)
  const vitrinWrite = [authenticateToken, vitrinYetkili];
  // Personel yalnızca izinli olduğu kategoriyi yönetebilir (admin hepsini)
  const kategoriYetkiliMi = (user, kategori) => {
    if (!user) return false;
    if (user.rol === 'admin') return true;
    if (kategori === 'motor') return !!user.motor_vitrin_yetkisi;
    if (kategori === 'aksesuar') return !!user.aksesuar_vitrin_yetkisi;
    return false; // diğer kategoriler yalnızca admin
  };

  // ---------- PUBLIC ----------

  // GET /yukleme-siniri - yönetim ekranı, dosya seçilir seçilmez (sunucuya göndermeden) uyarı verebilsin diye.
  // Sınır veritabanının max_allowed_packet değerine bağlıdır; değer HAM dosya boyutu (MB) olarak döner.
  router.get('/yukleme-siniri', ...vitrinWrite, async (req, res) => {
    const paket = (await maxPaket()) - 1024 * 1024;
    res.json({ video_mb: Math.max(1, Math.min(hamMb(paket), 85)) });
  });

  // GET /segmentler - dinamik segment listesi
  router.get('/segmentler', async (req, res) => {
    try {
      const result = await pool.query(`SELECT id, ad FROM vitrin_segmentler ORDER BY sira ASC, ${orderByText('ad')}`);
      res.json(result.rows);
    } catch (e) {
      console.error('Vitrin segment hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // Yeni segment yoksa ekler (auto-grow); admin ilan eklerken kullanılır
  const ensureSegment = async (ad) => {
    if (!ad) return;
    try {
      const max = await pool.query('SELECT COALESCE(MAX(sira),0)+1 AS s FROM vitrin_segmentler');
      await pool.query('INSERT IGNORE INTO vitrin_segmentler (ad, sira) VALUES ($1,$2)', [ad, max.rows[0].s]);
    } catch { /* sessiz */ }
  };

  // Ürünün videosunu değiştir (eskiyi sil, yenisini ekle) — transaction client ile çağrılır
  const setVideo = async (client, urunId, videoData) => {
    const parsed = parseDataUrl(videoData, IZINLI_VIDEO);
    if (!parsed) return;
    await client.query('DELETE FROM vitrin_videolar WHERE urun_id = $1', [urunId]);
    const v = await client.query(
      'INSERT INTO vitrin_videolar (urun_id, data, mime) VALUES ($1,$2,$3) RETURNING id',
      [urunId, videoData, parsed.mime]
    );
    await client.query('UPDATE vitrin_urunleri SET video_dosya_id = $1 WHERE id = $2', [v.rows[0].id, urunId]);
  };

  // Ürünün videosunu kaldır
  const clearVideo = async (client, urunId) => {
    await client.query('DELETE FROM vitrin_videolar WHERE urun_id = $1', [urunId]);
    await client.query('UPDATE vitrin_urunleri SET video_dosya_id = NULL WHERE id = $1', [urunId]);
  };

  // GET /iletisim - tüm kategori iletişim kayıtları (gorsel base64 hariç; sadece var/yok)
  router.get('/iletisim', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT kategori, personel_adi, telefon, personel_adi_2, telefon_2, aciklama, baslik,
                (gorsel IS NOT NULL) AS gorsel_var, updated_at
         FROM vitrin_kategori_iletisim`
      );
      // Boolean ifade MariaDB'de 1/0 döner; PostgreSQL true/false döndürüyordu.
      res.json(result.rows.map((r) => ({ ...r, gorsel_var: Number(r.gorsel_var) === 1 })));
    } catch (e) {
      console.error('Vitrin iletişim hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // GET /iletisim-gorsel/:kategori - hizmet sayfası görselini binary servis et
  router.get('/iletisim-gorsel/:kategori', async (req, res) => {
    try {
      const r = await pool.query('SELECT gorsel FROM vitrin_kategori_iletisim WHERE kategori = $1', [req.params.kategori]);
      if (!r.rows.length || !r.rows[0].gorsel) return res.status(404).send('Görsel bulunamadı');
      const parsed = parseDataUrl(r.rows[0].gorsel, IZINLI_GORSEL);
      if (!parsed) return res.status(404).send('Geçersiz görsel');
      medyaBasliklari(res);
      res.set('Content-Type', parsed.mime);
      res.set('Cache-Control', 'public, max-age=3600');
      res.send(parsed.buffer);
    } catch (e) {
      console.error('Vitrin iletişim görsel hatası:', e.message);
      res.status(500).send('Sunucu hatası');
    }
  });

  // GET /gorsel/:id - görseli binary olarak servis et (tarayıcı önbelleğe alır)
  router.get('/gorsel/:id', async (req, res) => {
    try {
      const etag = `"vitrin-gorsel-${req.params.id}"`;
      res.set({ 'Cache-Control': 'public, max-age=31536000, immutable', ETag: etag });
      if (req.headers['if-none-match'] === etag) return res.status(304).end();
      const result = await pool.query('SELECT data FROM vitrin_gorseller WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).send('Görsel bulunamadı');
      const parsed = parseDataUrl(result.rows[0].data, IZINLI_GORSEL);
      if (!parsed) return res.status(404).send('Geçersiz görsel');
      medyaBasliklari(res);
      res.set('Content-Type', parsed.mime);
      res.send(parsed.buffer);
    } catch (e) {
      console.error('Vitrin görsel hatası:', e.message);
      res.status(500).send('Sunucu hatası');
    }
  });

  // GET /video/:id - yüklenen videoyu HTTP Range destekli (akıcı) servis et
  router.get('/video/:id', async (req, res) => {
    try {
      const etag = `"vitrin-video-${req.params.id}"`;
      res.set({ 'Cache-Control': 'public, max-age=31536000, immutable', ETag: etag });
      if (!req.headers.range && req.headers['if-none-match'] === etag) return res.status(304).end();
      const result = await pool.query('SELECT data FROM vitrin_videolar WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).send('Video bulunamadı');
      const parsed = parseDataUrl(result.rows[0].data, IZINLI_VIDEO);
      if (!parsed) return res.status(404).send('Geçersiz video');
      medyaBasliklari(res);
      const total = parsed.buffer.length;
      const range = req.headers.range;

      // Tarayıcı parça (Range) istediyse 206 ile sadece o aralığı gönder → kasmaz, sarılabilir
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        let start = m && m[1] ? parseInt(m[1], 10) : 0;
        let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
        if (isNaN(start) || start < 0) start = 0;
        if (isNaN(end) || end >= total) end = total - 1;
        if (start > end) { start = 0; end = total - 1; }
        const chunk = parsed.buffer.subarray(start, end + 1);
        res.status(206).set({
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunk.length,
          'Content-Type': parsed.mime,
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        return res.end(chunk);
      }

      res.set({
        'Content-Type': parsed.mime,
        'Content-Length': total,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      res.end(parsed.buffer);
    } catch (e) {
      console.error('Vitrin video hatası:', e.message);
      res.status(500).send('Sunucu hatası');
    }
  });

  // hepsi=1 (yayından kaldırılmış/arşiv ilanlar dahil) yalnızca giriş yapmış vitrin yetkililerine açıktır
  const hepsiKapisi = (req, res, next) => {
    if (!req.query.hepsi) return next();
    authenticateToken(req, res, () => vitrinYetkili(req, res, next));
  };

  // GET / - yayında olan ürünler (metadata + kapak_gorsel_id; base64 YOK)
  router.get('/', hepsiKapisi, async (req, res) => {
    try {
      const { kategori, segment, cc_min, cc_max, km_max, marka, q, hepsi, durum } = req.query;
      let query = `
        SELECT id, ilan_no, kategori, baslik, aciklama, fiyat, video_url, video_dosya_id, kapak_gorsel_id,
               marka, model, yil, segment, motor_cc, km, motor_durumu, yayinda, siralama, one_cikan, stok_motor_id, rubik_link, created_at
        FROM vitrin_urunleri WHERE 1=1`;
      const params = [];

      // Public istek: sadece yayında olanlar. (admin yönetim için hepsi=1 + token gönderilebilir)
      if (!hepsi) query += ' AND yayinda = TRUE';

      if (kategori && KATEGORILER.includes(kategori)) { params.push(kategori); query += ` AND kategori = $${params.length}`; }
      if (segment) { params.push(segment); query += ` AND segment = $${params.length}`; }
      if (durum && MOTOR_DURUMLARI.includes(durum)) { params.push(durum); query += ` AND motor_durumu = $${params.length}`; }
      // Marka: sitede markalar listeden seçilir → birebir (büyük/küçük harf ve boşluk duyarsız) eşleşme
      if (marka) { params.push(String(marka).trim()); query += ` AND UPPER(TRIM(marka)) = UPPER($${params.length})`; }
      if (cc_min) { params.push(Number(cc_min)); query += ` AND motor_cc >= $${params.length}`; }
      if (cc_max) { params.push(Number(cc_max)); query += ` AND motor_cc <= $${params.length}`; }
      if (km_max) { params.push(Number(km_max)); query += ` AND km <= $${params.length}`; }
      if (q) { params.push(`%${q}%`); query += ` AND (LOWER(baslik) LIKE LOWER($${params.length}) OR LOWER(aciklama) LIKE LOWER($${params.length}) OR LOWER(marka) LIKE LOWER($${params.length}) OR LOWER(model) LIKE LOWER($${params.length}))`; }

      // Yönetim ekranında belirlenen sıra her zaman önceliklidir. one_cikan sadece
      // aynı sıra değerine sahip eski kayıtlarda ikincil bir tercih olarak kalır.
      query += ' ORDER BY siralama ASC, one_cikan DESC, created_at DESC';
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (e) {
      console.error('Vitrin liste hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // GET /markalar?durum=sifir|ikinci_el - yayındaki motor ilanlarının markaları (site marka filtresi)
  router.get('/markalar', async (req, res) => {
    try {
      const { durum } = req.query;
      const params = [];
      // Aynı markanın büyük/küçük harf farklı yazımları tek satırda toplanır (UPPER(TRIM(marka))); gösterilen
      // yazım, sıralamada ilk gelendir (PostgreSQL'deki MIN karşılığı: küçük harf önce). Önce her yazım
      // ayrı sayılır, sonra pencere fonksiyonuyla toplanıp ilk yazım seçilir.
      let query = `SELECT marka, adet FROM (
                     SELECT TRIM(marka) AS marka,
                            SUM(COUNT(*)) OVER (PARTITION BY UPPER(TRIM(marka))) AS adet,
                            ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(marka)) ORDER BY ${orderByText('TRIM(marka)')}) AS sira
                     FROM vitrin_urunleri
                     WHERE kategori = 'motor' AND yayinda = TRUE AND COALESCE(TRIM(marka), '') <> ''`;
      if (durum && MOTOR_DURUMLARI.includes(durum)) { params.push(durum); query += ` AND motor_durumu = $1`; }
      query += ` GROUP BY TRIM(marka)
                   ) t WHERE sira = 1 ORDER BY ${orderByText('marka')}`;
      const result = await pool.query(query, params);
      // COUNT MariaDB'de metin döner; PostgreSQL'de COUNT(*)::int sayıydı.
      res.json(result.rows.map((r) => ({ marka: r.marka, adet: Number(r.adet) })));
    } catch (e) {
      console.error('Vitrin marka listesi hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // GET /:id - tek ürün + görsel id listesi
  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, ilan_no, kategori, baslik, aciklama, fiyat, video_url, video_dosya_id, kapak_gorsel_id,
                marka, model, yil, segment, motor_cc, km, motor_durumu, hasar_kaydi, yayinda, siralama, one_cikan, stok_motor_id, rubik_link, created_at
         FROM vitrin_urunleri WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Kayıt bulunamadı' });
      // Yayından kaldırılmış ilan herkese açık değildir: yalnızca vitrin yetkilisi (düzenleme ekranı) görebilir.
      if (!result.rows[0].yayinda) {
        const u = await opsiyonelKullanici(req);
        if (!u || !(u.rol === 'admin' || u.motor_vitrin_yetkisi || u.aksesuar_vitrin_yetkisi)) {
          return res.status(404).json({ message: 'Kayıt bulunamadı' });
        }
      }
      const gorseller = await pool.query(
        'SELECT id FROM vitrin_gorseller WHERE urun_id = $1 ORDER BY sira ASC, id ASC', [req.params.id]);
      res.json({ ...result.rows[0], gorsel_idler: gorseller.rows.map(r => r.id) });
    } catch (e) {
      console.error('Vitrin detay hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // ---------- ADMIN ----------

  // PUT /sirala - kategori içindeki ilanların vitrin sırasını topluca güncelle
  router.put('/sirala', ...vitrinWrite, async (req, res) => {
    const { kategori, urun_ids: urunIds } = req.body;
    if (!KATEGORILER.includes(kategori)) return res.status(400).json({ message: 'Geçersiz kategori' });
    if (!kategoriYetkiliMi(req.user, kategori)) return res.status(403).json({ message: 'Bu kategori için vitrin yetkiniz yok' });
    if (!Array.isArray(urunIds) || urunIds.length === 0 || urunIds.length > 1000) {
      return res.status(400).json({ message: 'Sıralanacak ilan listesi geçersiz' });
    }

    const ids = urunIds.map(Number);
    if (ids.some(id => !Number.isInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
      return res.status(400).json({ message: 'İlan listesinde geçersiz veya tekrar eden kayıt var' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await siralamaYaz(client, ids, kategori);
      if (result.rowCount !== ids.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Bazı ilanlar bu kategoriye ait değil' });
      }
      await client.query('COMMIT');
      res.json({ message: 'Vitrin sırası güncellendi' });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Vitrin sıralama hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    } finally {
      client.release();
    }
  });

  // PATCH /:id/yayin - yalnızca admin, ilanı hızlıca yayına al/kaldır
  router.patch('/:id/yayin', ...admin, async (req, res) => {
    const id = Number(req.params.id);
    const { yayinda } = req.body;
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Geçersiz ilan' });
    if (typeof yayinda !== 'boolean') return res.status(400).json({ message: 'Yayın durumu geçersiz' });

    try {
      // Arşivden yayına alınan ilan eski sırasını değil, yayındaki listenin sonunu alır
      // (eski sıra numarası artık başka ilanlarla çakışıyor olabilir).
      // MariaDB SET atamalarını soldan sağa, GÜNCELLENMİŞ değerlerle çalıştırır: siralama, yayinda'nın
      // ESKİ değerine bakar; bu yüzden yayinda'dan ÖNCE yazılır. RETURNING yerine ayrı SELECT
      // kullanılır (UPDATE ... RETURNING MariaDB'de yok); ikisi tek transaction'dadır.
      const client = await pool.connect();
      let sonuc;
      try {
        await client.query('BEGIN');
        const guncel = await client.query(
          `UPDATE vitrin_urunleri v
           SET siralama = CASE
                 WHEN $1 AND NOT COALESCE(v.yayinda, FALSE) THEN (
                   SELECT COALESCE(MAX(s.siralama), -1) + 1 FROM vitrin_urunleri s
                   WHERE s.kategori = v.kategori AND s.yayinda = TRUE AND s.id <> v.id)
                 ELSE v.siralama END,
               yayinda = $1,
               updated_at = CURRENT_TIMESTAMP
           WHERE v.id = $2`,
          [yayinda, id]
        );
        sonuc = guncel.rowCount === 0
          ? { rows: [] }
          : await client.query('SELECT id, yayinda FROM vitrin_urunleri WHERE id = $1', [id]);
        await client.query('COMMIT');
      } catch (hata) {
        await client.query('ROLLBACK');
        throw hata;
      } finally {
        client.release();
      }
      if (sonuc.rows.length === 0) return res.status(404).json({ message: 'Kayıt bulunamadı' });
      res.json(sonuc.rows[0]);
    } catch (e) {
      console.error('Vitrin yayın durumu hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // PATCH /:id/sira - yalnızca admin, ilanı doğrudan istenen sıraya taşı
  router.patch('/:id/sira', ...admin, async (req, res) => {
    const id = Number(req.params.id);
    const istenenSira = Number(req.body.sira);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Geçersiz ilan' });
    if (!Number.isInteger(istenenSira) || istenenSira < 1) {
      return res.status(400).json({ message: 'Sıra numarası 1 veya daha büyük olmalı' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const urun = await client.query(
        'SELECT id, kategori, COALESCE(yayinda, FALSE) AS yayinda FROM vitrin_urunleri WHERE id = $1',
        [id]
      );
      if (urun.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Kayıt bulunamadı' });
      }

      // Sıra, ilanın bulunduğu grup içinde hesaplanır: yayındakiler kendi arasında,
      // arşivdekiler kendi arasında (yönetim ekranı yayındaki listeyi 1..N numaralar).
      const kategori = urun.rows[0].kategori;
      const liste = await client.query(
        `SELECT id FROM vitrin_urunleri
         WHERE kategori = $1 AND COALESCE(yayinda, FALSE) = $2
         ORDER BY siralama ASC, one_cikan DESC, created_at DESC, id DESC
         FOR UPDATE`,
        [kategori, urun.rows[0].yayinda]
      );
      const ids = liste.rows.map(row => Number(row.id));
      const mevcutIndex = ids.indexOf(id);
      if (mevcutIndex === -1) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Kayıt bulunamadı' });
      }

      ids.splice(mevcutIndex, 1);
      const hedefIndex = Math.min(istenenSira, ids.length + 1) - 1;
      ids.splice(hedefIndex, 0, id);

      await siralamaYaz(client, ids, kategori);
      await client.query('COMMIT');
      res.json({ sira: hedefIndex + 1, urun_ids: ids });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Vitrin doğrudan sıralama hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    } finally {
      client.release();
    }
  });

  // POST / - ürün oluştur (gorseller: base64 data URL dizisi; ilki kapak)
  router.post('/', ...vitrinWrite, async (req, res) => {
    const client = await pool.connect();
    try {
      const {
        kategori, baslik, aciklama, fiyat, video_url,
        marka, model, yil, segment, motor_cc, km, yayinda, siralama, gorseller, video,
        one_cikan, stok_motor_id, rubik_link, hasar_kaydi, motor_durumu
      } = req.body;

      if (!KATEGORILER.includes(kategori)) return res.status(400).json({ message: 'Geçersiz kategori' });
      if (!kategoriYetkiliMi(req.user, kategori)) return res.status(403).json({ message: 'Bu kategori için vitrin yetkiniz yok' });
      if (!baslik) return res.status(400).json({ message: 'Başlık zorunlu' });
      if (kategori === 'motor' && !segment) return res.status(400).json({ message: 'Motor ilanı için segment zorunlu' });
      const medyaSorunu = medyaHatasi(gorseller, video) || baglantiHatasi(rubik_link, video_url);
      if (medyaSorunu) return res.status(400).json({ message: medyaSorunu });

      const asim = await paketAsimi(video, ...(Array.isArray(gorseller) ? gorseller : []));
      if (asim) return cokBuyukYanit(res, asim);

      if (segment) await ensureSegment(segment);
      await client.query('BEGIN');
      const ins = await client.query(
        `INSERT INTO vitrin_urunleri
          (kategori, baslik, aciklama, fiyat, video_url, marka, model, yil, segment, motor_cc, km, yayinda, siralama, one_cikan, stok_motor_id, rubik_link, hasar_kaydi, motor_durumu)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id, ilan_no`,
        [kategori, baslik, emptyToNull(aciklama), numOrNull(fiyat) || 0, emptyToNull(video_url),
         emptyToNull(marka), emptyToNull(model), numOrNull(yil), emptyToNull(segment),
         numOrNull(motor_cc), numOrNull(km), yayinda !== false, numOrNull(siralama) || 0,
         one_cikan === true, numOrNull(stok_motor_id), emptyToNull(rubik_link), emptyToNull(hasar_kaydi), motorDurumu(kategori, motor_durumu)]
      );
      const urunId = ins.rows[0].id;
      const ilanNo = ins.rows[0].ilan_no;

      let kapakId = null;
      if (Array.isArray(gorseller)) {
        for (let i = 0; i < gorseller.length; i++) {
          if (!parseDataUrl(gorseller[i])) continue;
          const g = await client.query(
            'INSERT INTO vitrin_gorseller (urun_id, data, sira) VALUES ($1,$2,$3) RETURNING id',
            [urunId, gorseller[i], i]
          );
          if (kapakId === null) kapakId = g.rows[0].id;
        }
      }
      if (kapakId !== null) {
        await client.query('UPDATE vitrin_urunleri SET kapak_gorsel_id = $1 WHERE id = $2', [kapakId, urunId]);
      }
      if (typeof video === 'string' && video) await setVideo(client, urunId, video);
      await client.query('COMMIT');
      res.status(201).json({ id: urunId, ilan_no: ilanNo, kapak_gorsel_id: kapakId });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Vitrin ekleme hatası:', e.message);
      if (paketHatasi(e)) return res.status(413).json({ message: 'Dosya çok büyük' });
      res.status(500).json({ message: 'Sunucu hatası' });
    } finally {
      client.release();
    }
  });

  // PUT /:id - güncelle (gorseller verilirse görseller tamamen yenilenir)
  router.put('/:id', ...vitrinWrite, async (req, res) => {
    const client = await pool.connect();
    try {
      const {
        kategori, baslik, aciklama, fiyat, video_url,
        marka, model, yil, segment, motor_cc, km, yayinda, siralama, gorseller, video, video_sil,
        one_cikan, stok_motor_id, rubik_link, hasar_kaydi, motor_durumu
      } = req.body;

      const adminMi = req.user.rol === 'admin';
      const mevcut = await client.query('SELECT id, kategori, yayinda, siralama FROM vitrin_urunleri WHERE id = $1', [req.params.id]);
      if (mevcut.rows.length === 0) return res.status(404).json({ message: 'Kayıt bulunamadı' });
      // Hem mevcut kaydın hem hedef kategorinin yetkisi olmalı (personel kapsam dışına çıkamaz)
      if (!kategoriYetkiliMi(req.user, mevcut.rows[0].kategori) || !kategoriYetkiliMi(req.user, kategori)) {
        return res.status(403).json({ message: 'Bu kategori için vitrin yetkiniz yok' });
      }
      if (kategori === 'motor' && !segment) return res.status(400).json({ message: 'Motor ilanı için segment zorunlu' });
      const medyaSorunu = medyaHatasi(gorseller, video) || baglantiHatasi(rubik_link, video_url);
      if (medyaSorunu) return res.status(400).json({ message: medyaSorunu });

      const asim = await paketAsimi(video, ...(Array.isArray(gorseller) ? gorseller : []));
      if (asim) return cokBuyukYanit(res, asim);

      if (segment) await ensureSegment(segment);
      await client.query('BEGIN');
      await client.query(
        `UPDATE vitrin_urunleri SET
          kategori=$1, baslik=$2, aciklama=$3, fiyat=$4, video_url=$5,
          marka=$6, model=$7, yil=$8, segment=$9, motor_cc=$10, km=$11,
          yayinda=$12, siralama=$13, one_cikan=$14, stok_motor_id=$15, rubik_link=$16, hasar_kaydi=$18, motor_durumu=$19, updated_at=CURRENT_TIMESTAMP
         WHERE id=$17`,
        [kategori, baslik, emptyToNull(aciklama), numOrNull(fiyat) || 0, emptyToNull(video_url),
         emptyToNull(marka), emptyToNull(model), numOrNull(yil), emptyToNull(segment),
         numOrNull(motor_cc), numOrNull(km),
         // Yayın durumu ve sıra yalnızca admin tarafından değişir (PATCH /yayin ve /sira uçlarıyla aynı kural)
         adminMi ? yayinda !== false : mevcut.rows[0].yayinda, adminMi ? (numOrNull(siralama) || 0) : mevcut.rows[0].siralama,
         one_cikan === true, numOrNull(stok_motor_id), emptyToNull(rubik_link), req.params.id, emptyToNull(hasar_kaydi), motorDurumu(kategori, motor_durumu)]
      );

      // gorseller alanı gönderildiyse görselleri tamamen yenile
      if (Array.isArray(gorseller)) {
        await client.query('DELETE FROM vitrin_gorseller WHERE urun_id = $1', [req.params.id]);
        let kapakId = null;
        for (let i = 0; i < gorseller.length; i++) {
          if (!parseDataUrl(gorseller[i])) continue;
          const g = await client.query(
            'INSERT INTO vitrin_gorseller (urun_id, data, sira) VALUES ($1,$2,$3) RETURNING id',
            [req.params.id, gorseller[i], i]
          );
          if (kapakId === null) kapakId = g.rows[0].id;
        }
        await client.query('UPDATE vitrin_urunleri SET kapak_gorsel_id = $1 WHERE id = $2', [kapakId, req.params.id]);
      }

      // Video: yeni dosya geldiyse değiştir; video_sil işaretliyse kaldır; aksi halde dokunma
      if (typeof video === 'string' && video) await setVideo(client, req.params.id, video);
      else if (video_sil) await clearVideo(client, req.params.id);

      await client.query('COMMIT');
      res.json({ message: 'Güncellendi' });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('Vitrin güncelleme hatası:', e.message);
      if (paketHatasi(e)) return res.status(413).json({ message: 'Dosya çok büyük' });
      res.status(500).json({ message: 'Sunucu hatası' });
    } finally {
      client.release();
    }
  });

  // DELETE /:id - sil (görseller cascade)
  router.delete('/:id', ...vitrinWrite, async (req, res) => {
    try {
      const rec = await pool.query('SELECT kategori FROM vitrin_urunleri WHERE id = $1', [req.params.id]);
      if (rec.rows.length && !kategoriYetkiliMi(req.user, rec.rows[0].kategori)) {
        return res.status(403).json({ message: 'Bu kategori için vitrin yetkiniz yok' });
      }
      await pool.query('DELETE FROM vitrin_urunleri WHERE id = $1', [req.params.id]);
      res.json({ message: 'Silindi' });
    } catch (e) {
      console.error('Vitrin silme hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // POST /segmentler - yeni segment ekle (admin veya vitrin yetkili)
  router.post('/segmentler', ...vitrinWrite, async (req, res) => {
    try {
      const ad = (req.body.ad || '').trim();
      if (!ad) return res.status(400).json({ message: 'Segment adı zorunlu' });
      await ensureSegment(ad);
      const result = await pool.query('SELECT id, ad FROM vitrin_segmentler WHERE ad = $1', [ad]);
      res.status(201).json(result.rows[0]);
    } catch (e) {
      console.error('Segment ekleme hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  // PUT /iletisim/:kategori - kategori iletişimi upsert
  router.put('/iletisim/:kategori', ...vitrinWrite, async (req, res) => {
    try {
      const { kategori } = req.params;
      if (!KATEGORILER.includes(kategori)) return res.status(400).json({ message: 'Geçersiz kategori' });
      if (!kategoriYetkiliMi(req.user, kategori)) return res.status(403).json({ message: 'Bu kategori için vitrin yetkiniz yok' });
      const { personel_adi, telefon, personel_adi_2, telefon_2, aciklama, baslik, gorsel, gorsel_sil } = req.body;
      if (typeof gorsel === 'string' && gorsel && !medyaGecerli(gorsel, IZINLI_GORSEL)) {
        return res.status(400).json({ message: 'Görsel yalnızca JPEG, PNG, WebP veya GIF olabilir' });
      }
      const asim = await paketAsimi(gorsel);
      if (asim) return cokBuyukYanit(res, asim);
      await pool.query(
        `INSERT INTO vitrin_kategori_iletisim (kategori, personel_adi, telefon, aciklama, baslik, personel_adi_2, telefon_2, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
           personel_adi=VALUES(personel_adi), telefon=VALUES(telefon),
           personel_adi_2=VALUES(personel_adi_2), telefon_2=VALUES(telefon_2),
           aciklama=VALUES(aciklama), baslik=VALUES(baslik), updated_at=CURRENT_TIMESTAMP`,
        [kategori, emptyToNull(personel_adi), emptyToNull(telefon), emptyToNull(aciklama), emptyToNull(baslik),
         emptyToNull(personel_adi_2), emptyToNull(telefon_2)]
      );
      // Görsel: yeni geldiyse değiştir, gorsel_sil işaretliyse kaldır, yoksa dokunma
      if (typeof gorsel === 'string' && gorsel) {
        await pool.query('UPDATE vitrin_kategori_iletisim SET gorsel=$1 WHERE kategori=$2', [gorsel, kategori]);
      } else if (gorsel_sil) {
        await pool.query('UPDATE vitrin_kategori_iletisim SET gorsel=NULL WHERE kategori=$1', [kategori]);
      }
      res.json({ message: 'Kaydedildi' });
    } catch (e) {
      console.error('Vitrin iletişim güncelleme hatası:', e.message);
      res.status(500).json({ message: 'Sunucu hatası' });
    }
  });

  return router;
};
