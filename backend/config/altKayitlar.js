const { pool } = require('./db');
const { jsonSatir, pgJsonZaman, grupla } = require('./sqlText');

/**
 * PostgreSQL'deki `json_agg(...)` alt sorgularının karşılığı: alt kayıtlar (ör. iş emrinin
 * parçaları) ayrı sorguyla çekilip ana kayda `parcalar` olarak eklenir. DECIMAL kolonlar
 * PostgreSQL JSON'undaki gibi SAYI, `_at` ile biten zaman kolonları saat dilimsiz ISO metni
 * (mikrosaniyeli) olarak döner.
 *
 *   await parcalariEkle(isEmirleri, 'parcalar', 'is_emri_id',
 *     ['takilan_parca', 'adet', 'birim_fiyat'], ['birim_fiyat']);
 *
 * `anahtariTut`: json_agg(tablo.*) gibi tüm kolonları veren sorgularda bağlantı kolonu
 * (ör. aksesuar_id) da çıktıda kalır; json_build_object(...) ile seçilenlerde kalmaz.
 */
async function parcalariEkle(kayitlar, tablo, anahtar, kolonlar, sayiKolonlari = [], { anahtariTut = false } = {}) {
  if (kayitlar.length === 0) return kayitlar;
  const secilen = [anahtar, ...kolonlar.filter((k) => k !== anahtar)]
    .map((k) => (k.endsWith('_at') ? `CAST(${k} AS CHAR) AS ${k}` : k))
    .join(', ');
  const sonuc = await pool.query(
    `SELECT ${secilen} FROM ${tablo} WHERE ${anahtar} = ANY($1) ORDER BY id`,
    [kayitlar.map((r) => r.id)]
  );
  const harita = grupla(sonuc.rows, anahtar);
  return kayitlar.map((r) => ({
    ...r,
    parcalar: (harita.get(r.id) || []).map((p) => {
      const { [anahtar]: anahtarDegeri, ...geri } = p;
      for (const k of Object.keys(geri)) if (k.endsWith('_at')) geri[k] = pgJsonZaman(geri[k]);
      const satir = jsonSatir(geri, sayiKolonlari);
      return anahtariTut ? { [anahtar]: anahtarDegeri, ...satir } : satir;
    }),
  }));
}

module.exports = { parcalariEkle };
