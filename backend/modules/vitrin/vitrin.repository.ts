/* Vitrin ilanları, görselleri ve videoları için SQL. İş kuralı yok: yalnızca sorgular. */
import { orderByText } from '../../core/sqlText';
import type { SqlSonuc, Veritabani } from '../../core/tipler';

/** INSERT/UPDATE için hazır (normalize edilmiş) ilan alanları. */
export interface IlanAlanlari {
  kategori: unknown; baslik: unknown; aciklama: unknown; fiyat: number; video_url: unknown;
  marka: unknown; model: unknown; yil: number | null; segment: unknown; motor_cc: number | null; km: number | null;
  yayinda: unknown; siralama: unknown; one_cikan: boolean; stok_motor_id: number | null; rubik_link: unknown;
  hasar_kaydi: unknown; motor_durumu: string | null;
}

export interface ListeFiltresi {
  /** Yayından kaldırılmış (arşiv) ilanlar dahil mi? (yalnızca vitrin yetkilisi) */
  hepsi: boolean;
  kategori?: string;
  segment?: string;
  durum?: string;
  marka?: string;
  cc_min?: string;
  cc_max?: string;
  km_max?: string;
  q?: string;
}

export const ilanlariListele = async (db: Veritabani, f: ListeFiltresi) => {
  let sorgu = `
        SELECT id, ilan_no, kategori, baslik, aciklama, fiyat, video_url, video_dosya_id, kapak_gorsel_id,
               marka, model, yil, segment, motor_cc, km, motor_durumu, yayinda, siralama, one_cikan, stok_motor_id, rubik_link, created_at
        FROM vitrin_urunleri WHERE 1=1`;
  const params: unknown[] = [];

  // Public istek: sadece yayında olanlar. (admin yönetim için hepsi=1 + token gönderilebilir)
  if (!f.hepsi) sorgu += ' AND yayinda = TRUE';

  if (f.kategori) { params.push(f.kategori); sorgu += ` AND kategori = $${params.length}`; }
  if (f.segment) { params.push(f.segment); sorgu += ` AND segment = $${params.length}`; }
  if (f.durum) { params.push(f.durum); sorgu += ` AND motor_durumu = $${params.length}`; }
  // Marka: sitede markalar listeden seçilir → birebir (büyük/küçük harf ve boşluk duyarsız) eşleşme
  if (f.marka) { params.push(String(f.marka).trim()); sorgu += ` AND UPPER(TRIM(marka)) = UPPER($${params.length})`; }
  if (f.cc_min) { params.push(Number(f.cc_min)); sorgu += ` AND motor_cc >= $${params.length}`; }
  if (f.cc_max) { params.push(Number(f.cc_max)); sorgu += ` AND motor_cc <= $${params.length}`; }
  if (f.km_max) { params.push(Number(f.km_max)); sorgu += ` AND km <= $${params.length}`; }
  if (f.q) {
    params.push(`%${f.q}%`);
    sorgu += ` AND (LOWER(baslik) LIKE LOWER($${params.length}) OR LOWER(aciklama) LIKE LOWER($${params.length}) OR LOWER(marka) LIKE LOWER($${params.length}) OR LOWER(model) LIKE LOWER($${params.length}))`;
  }

  // Yönetim ekranında belirlenen sıra her zaman önceliklidir. one_cikan sadece aynı sıra değerine sahip eski kayıtlarda
  // ikincil bir tercih olarak kalır.
  sorgu += ' ORDER BY siralama ASC, one_cikan DESC, created_at DESC';
  return (await db.query(sorgu, params)).rows;
};

/**
 * Yayındaki motor ilanlarının markaları (site marka filtresi). Aynı markanın büyük/küçük harf farklı yazımları tek satırda
 * toplanır (UPPER(TRIM(marka))); gösterilen yazım, sıralamada ilk gelendir (PostgreSQL'deki MIN karşılığı: küçük harf önce).
 * Önce her yazım ayrı sayılır, sonra pencere fonksiyonuyla toplanıp ilk yazım seçilir.
 */
export const markalariListele = async (db: Veritabani, durum?: string) => {
  const params: unknown[] = [];
  let sorgu = `SELECT marka, adet FROM (
                 SELECT TRIM(marka) AS marka,
                        SUM(COUNT(*)) OVER (PARTITION BY UPPER(TRIM(marka))) AS adet,
                        ROW_NUMBER() OVER (PARTITION BY UPPER(TRIM(marka)) ORDER BY ${orderByText('TRIM(marka)')}) AS sira
                 FROM vitrin_urunleri
                 WHERE kategori = 'motor' AND yayinda = TRUE AND COALESCE(TRIM(marka), '') <> ''`;
  if (durum) { params.push(durum); sorgu += ` AND motor_durumu = $1`; }
  sorgu += ` GROUP BY TRIM(marka)
               ) t WHERE sira = 1 ORDER BY ${orderByText('marka')}`;
  return (await db.query<{ marka: string; adet: string | number }>(sorgu, params)).rows;
};

export const ilanBul = async (db: Veritabani, id: number) =>
  (await db.query(
    `SELECT id, ilan_no, kategori, baslik, aciklama, fiyat, video_url, video_dosya_id, kapak_gorsel_id,
            marka, model, yil, segment, motor_cc, km, motor_durumu, hasar_kaydi, yayinda, siralama, one_cikan, stok_motor_id, rubik_link, created_at
     FROM vitrin_urunleri WHERE id = $1`, [id]
  )).rows[0] ?? null;

export const gorselIdleri = async (db: Veritabani, urunId: number): Promise<number[]> =>
  (await db.query<{ id: number }>('SELECT id FROM vitrin_gorseller WHERE urun_id = $1 ORDER BY sira ASC, id ASC', [urunId])).rows.map((r) => r.id);

/** Düzenleme öncesi kısa kayıt (kategori yetkisi, yayın durumu ve sıra için). */
export const kisaKayit = async (db: Veritabani, id: number) =>
  (await db.query('SELECT id, kategori, yayinda, siralama FROM vitrin_urunleri WHERE id = $1', [id])).rows[0] ?? null;

export const kategoriBul = async (db: Veritabani, id: number): Promise<string | null> =>
  (await db.query<{ kategori: string }>('SELECT kategori FROM vitrin_urunleri WHERE id = $1', [id])).rows[0]?.kategori ?? null;

// ---------- Sıralama ve yayın ----------

/**
 * İlanların vitrin sırasını topluca yazar: ids[i] -> siralama = i. (PostgreSQL'deki UPDATE ... FROM unnest(...) WITH
 * ORDINALITY karşılığı.) Aynı kategoriye ait olmayan id'ler güncellenmez; çağıran satır sayısını ids.length ile karşılaştırır.
 */
export const siralamaYaz = (db: Veritabani, ids: number[], kategori: string): Promise<SqlSonuc> => {
  const durumlar = ids.map((_, i) => `WHEN $${i + 2} THEN ${i}`).join(' ');
  const liste = ids.map((_, i) => `$${i + 2}`).join(', ');
  return db.query(
    `UPDATE vitrin_urunleri SET siralama = CASE id ${durumlar} END, updated_at = CURRENT_TIMESTAMP
     WHERE id IN (${liste}) AND kategori = $1`,
    [kategori, ...ids]
  );
};

/**
 * Arşivden yayına alınan ilan eski sırasını değil, yayındaki listenin sonunu alır (eski sıra numarası artık başka
 * ilanlarla çakışıyor olabilir). MariaDB SET atamalarını soldan sağa, GÜNCELLENMİŞ değerlerle çalıştırır: siralama,
 * yayinda'nın ESKİ değerine bakar; bu yüzden yayinda'dan ÖNCE yazılır. Etkilenen satır sayısı döner.
 */
export const yayinDurumunuYaz = async (db: Veritabani, id: number, yayinda: boolean): Promise<number> =>
  (await db.query(
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
  )).rowCount;

/** UPDATE ... RETURNING MariaDB'de yok: ayrı SELECT (aynı transaction'da). */
export const yayinDurumuOku = async (db: Veritabani, id: number) =>
  (await db.query<{ id: number; yayinda: boolean }>('SELECT id, yayinda FROM vitrin_urunleri WHERE id = $1', [id])).rows[0] ?? null;

export const siraBilgisi = async (db: Veritabani, id: number) =>
  (await db.query<{ id: number; kategori: string; yayinda: boolean }>(
    'SELECT id, kategori, COALESCE(yayinda, FALSE) AS yayinda FROM vitrin_urunleri WHERE id = $1', [id]
  )).rows[0] ?? null;

/** Aynı gruptaki (yayındakiler kendi arasında, arşivdekiler kendi arasında) ilanlar, kilitli, vitrin sırasıyla. */
export const grupIdleriniKilitle = async (db: Veritabani, kategori: string, yayinda: boolean): Promise<number[]> =>
  (await db.query<{ id: number | string }>(
    `SELECT id FROM vitrin_urunleri
     WHERE kategori = $1 AND COALESCE(yayinda, FALSE) = $2
     ORDER BY siralama ASC, one_cikan DESC, created_at DESC, id DESC
     FOR UPDATE`,
    [kategori, yayinda]
  )).rows.map((r) => Number(r.id));

// ---------- Yazma ----------

export const ilanEkle = async (db: Veritabani, a: IlanAlanlari): Promise<{ id: number; ilan_no: number }> =>
  (await db.query<{ id: number; ilan_no: number }>(
    `INSERT INTO vitrin_urunleri
      (kategori, baslik, aciklama, fiyat, video_url, marka, model, yil, segment, motor_cc, km, yayinda, siralama, one_cikan, stok_motor_id, rubik_link, hasar_kaydi, motor_durumu)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id, ilan_no`,
    [a.kategori, a.baslik, a.aciklama, a.fiyat, a.video_url, a.marka, a.model, a.yil, a.segment, a.motor_cc, a.km,
     a.yayinda, a.siralama, a.one_cikan, a.stok_motor_id, a.rubik_link, a.hasar_kaydi, a.motor_durumu]
  )).rows[0]!;

export const ilanGuncelle = async (db: Veritabani, id: number, a: IlanAlanlari) => {
  await db.query(
    `UPDATE vitrin_urunleri SET
      kategori=$1, baslik=$2, aciklama=$3, fiyat=$4, video_url=$5,
      marka=$6, model=$7, yil=$8, segment=$9, motor_cc=$10, km=$11,
      yayinda=$12, siralama=$13, one_cikan=$14, stok_motor_id=$15, rubik_link=$16, hasar_kaydi=$18, motor_durumu=$19, updated_at=CURRENT_TIMESTAMP
     WHERE id=$17`,
    [a.kategori, a.baslik, a.aciklama, a.fiyat, a.video_url, a.marka, a.model, a.yil, a.segment, a.motor_cc, a.km,
     a.yayinda, a.siralama, a.one_cikan, a.stok_motor_id, a.rubik_link, id, a.hasar_kaydi, a.motor_durumu]
  );
};

export const gorselEkle = async (db: Veritabani, urunId: number, data: string, sira: number): Promise<number> =>
  (await db.query<{ id: number }>('INSERT INTO vitrin_gorseller (urun_id, data, sira) VALUES ($1,$2,$3) RETURNING id', [urunId, data, sira])).rows[0]!.id;

export const gorselleriSil = async (db: Veritabani, urunId: number) => {
  await db.query('DELETE FROM vitrin_gorseller WHERE urun_id = $1', [urunId]);
};

export const kapakAyarla = async (db: Veritabani, urunId: number, kapakId: number | null) => {
  await db.query('UPDATE vitrin_urunleri SET kapak_gorsel_id = $1 WHERE id = $2', [kapakId, urunId]);
};

/** Ürünün videosunu değiştirir: eskiyi siler, yenisini ekler, ilana bağlar. */
export const videoDegistir = async (db: Veritabani, urunId: number, data: string, mime: string) => {
  await db.query('DELETE FROM vitrin_videolar WHERE urun_id = $1', [urunId]);
  const v = await db.query<{ id: number }>('INSERT INTO vitrin_videolar (urun_id, data, mime) VALUES ($1,$2,$3) RETURNING id', [urunId, data, mime]);
  await db.query('UPDATE vitrin_urunleri SET video_dosya_id = $1 WHERE id = $2', [v.rows[0]!.id, urunId]);
};

export const videoyuKaldir = async (db: Veritabani, urunId: number) => {
  await db.query('DELETE FROM vitrin_videolar WHERE urun_id = $1', [urunId]);
  await db.query('UPDATE vitrin_urunleri SET video_dosya_id = NULL WHERE id = $1', [urunId]);
};

/** Görseller ve videolar cascade silinir. */
export const ilanSil = async (db: Veritabani, id: number) => {
  await db.query('DELETE FROM vitrin_urunleri WHERE id = $1', [id]);
};
