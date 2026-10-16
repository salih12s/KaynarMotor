const { pool } = require('./db');

/*
 * Satış/servis kayıtlarından müşteri kaydını otomatik oluşturur ya da bulur.
 *
 * KURAL: mevcut müşteri kaydı asla EZİLMEZ. Aynı telefon (aile numarası) ya da aynı ad başka bir kişiye ait
 * olabilir; eskiden gelen yeni isim/adres mevcut kaydın üstüne yazılıyor ve başka bir müşterinin bilgisi
 * kayboluyordu. Şimdi yalnızca kaydın BOŞ alanları doldurulur. Bilgi düzeltmek için Müşteriler ekranı kullanılır.
 *
 * `db`: havuz (varsayılan) ya da açık bir transaction'ın bağlantısı (iş emri, kaydıyla birlikte geri alınsın diye).
 */
async function upsertMusteri(ad_soyad, telefon, adres, db = pool) {
  if (!ad_soyad || !String(ad_soyad).trim()) return null;

  const name = String(ad_soyad).trim();
  const tel = String(telefon || '').trim();
  const telDigits = tel.replace(/\D/g, '');
  const adresTemiz = String(adres || '').trim();

  try {
    let mevcut = null;

    // 1) Önce telefona göre bul (son 10 hane): yazım biçimi farklı olsa da aynı müşteri bulunur
    if (telDigits.length >= 7) {
      const tail = telDigits.slice(-10);
      const byPhone = await db.query(
        `SELECT id, ad_soyad, telefon, adres FROM musteriler
         WHERE REGEXP_REPLACE(COALESCE(telefon,''), '[^0-9]', '') LIKE CONCAT('%', $1)
         ORDER BY updated_at DESC, created_at DESC
         LIMIT 1`,
        [tail]
      );
      if (byPhone.rows.length > 0) mevcut = byPhone.rows[0];
    }

    // 2) Telefon verilmemişse ada göre bul (büyük/küçük harf duyarsız). Telefon VARSA ve eşleşmediyse ada
    //    bakılmaz: aynı adlı başka biri olabilir (ör. iki 'Ahmet Yılmaz'), birleştirmek yeni numarayı kaybettirirdi.
    if (!mevcut && telDigits.length < 7) {
      const byName = await db.query(
        'SELECT id, ad_soyad, telefon, adres FROM musteriler WHERE LOWER(ad_soyad) = LOWER($1) LIMIT 1',
        [name]
      );
      if (byName.rows.length > 0) mevcut = byName.rows[0];
    }

    if (mevcut) {
      // Yalnızca boş alanları doldur
      const set = [];
      const degerler = [];
      const ekle = (kolon, deger) => { degerler.push(deger); set.push(`${kolon} = $${degerler.length}`); };
      if (!String(mevcut.ad_soyad || '').trim()) ekle('ad_soyad', name);
      if (tel && !String(mevcut.telefon || '').trim()) ekle('telefon', tel);
      if (adresTemiz && !String(mevcut.adres || '').trim()) ekle('adres', adresTemiz);
      if (set.length > 0) {
        degerler.push(mevcut.id);
        await db.query(
          `UPDATE musteriler SET ${set.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${degerler.length}`,
          degerler
        );
      }
      return mevcut.id;
    }

    // Eşleşme yok: yeni müşteri
    const result = await db.query(
      'INSERT INTO musteriler (ad_soyad, telefon, adres) VALUES ($1, $2, $3) RETURNING id',
      [name, tel || null, adresTemiz || null]
    );
    return result.rows[0].id;
  } catch (err) {
    console.error('Müşteri upsert hatası:', err.message);
    return null;
  }
}

module.exports = { upsertMusteri };
