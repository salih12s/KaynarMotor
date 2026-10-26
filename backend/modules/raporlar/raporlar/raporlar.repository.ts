/* Rapor sorguları (yalnızca okuma). İş kuralı/toplam hesabı yok: toplamlar raporlar.hesap.ts'te. */
import { orderByText } from '../../../core/veritabani/sqlText';
import type { Veritabani } from '../../../core/tipler';

// Eski (aktarılmış) motor kayıtları 2026'dan önceki tamamlama tarihleriyle rapora girmez; yeni kayıtlar her zaman girer.
const MOTOR_RAPORA_GIRER = `durum = 'tamamlandi' AND tamamlama_tarihi IS NOT NULL AND (eski_kayit IS NOT TRUE OR DATE(tamamlama_tarihi) >= '2026-01-01')`;

// ============ GÜNLÜK ============

export const gunlukIsEmirleri = async (db: Veritabani, tarih: string) =>
  (await db.query(`SELECT * FROM is_emirleri WHERE durum = 'tamamlandi' AND DATE(tamamlama_tarihi) = $1`, [tarih])).rows;

export const gunlukAksesuarlar = async (db: Veritabani, tarih: string) =>
  (await db.query(`SELECT * FROM aksesuarlar WHERE durum = 'tamamlandi' AND DATE(tamamlama_tarihi) = $1`, [tarih])).rows;

export const gunlukMotorlar = async (db: Veritabani, tarih: string) =>
  (await db.query(`SELECT * FROM ikinci_el_motorlar WHERE ${MOTOR_RAPORA_GIRER} AND DATE(tamamlama_tarihi) = $1 ORDER BY tamamlama_tarihi DESC`, [tarih])).rows;

export const gunlukEticaret = async (db: Veritabani, tarih: string) =>
  (
    await db.query(
      `SELECT es.*, ep.platform_adi FROM eticaret_satislar es
     LEFT JOIN eticaret_platformlar ep ON es.platform_id = ep.id
     WHERE DATE(es.tarih) = $1`,
      [tarih],
    )
  ).rows;

// ============ ARALIK ============

export const aralikIsEmirleri = async (db: Veritabani, baslangic: string, bitis: string) =>
  (
    await db.query(
      `SELECT ie.*
     FROM is_emirleri ie WHERE ie.durum = 'tamamlandi' AND DATE(COALESCE(ie.tamamlama_tarihi, ie.created_at)) BETWEEN $1 AND $2 ORDER BY ie.created_at DESC`,
      [baslangic, bitis],
    )
  ).rows;

export const aralikAksesuarlar = async (db: Veritabani, baslangic: string, bitis: string) =>
  (
    await db.query(
      `SELECT a.*
     FROM aksesuarlar a
     WHERE a.durum = 'tamamlandi' AND DATE(COALESCE(a.tamamlama_tarihi, a.created_at)) BETWEEN $1 AND $2
     ORDER BY a.created_at DESC`,
      [baslangic, bitis],
    )
  ).rows;

export const aralikMotorlar = async (db: Veritabani, baslangic: string, bitis: string) =>
  (
    await db.query(
      `SELECT * FROM ikinci_el_motorlar WHERE ${MOTOR_RAPORA_GIRER} AND DATE(COALESCE(satis_tarihi, tamamlama_tarihi)) BETWEEN $1 AND $2 ORDER BY COALESCE(satis_tarihi, tamamlama_tarihi) DESC`,
      [baslangic, bitis],
    )
  ).rows;

export const aralikEticaret = async (db: Veritabani, baslangic: string, bitis: string) =>
  (
    await db.query(
      `SELECT es.*, ep.platform_adi FROM eticaret_satislar es
     LEFT JOIN eticaret_platformlar ep ON es.platform_id = ep.id
     WHERE DATE(es.tarih) BETWEEN $1 AND $2 ORDER BY es.tarih DESC`,
      [baslangic, bitis],
    )
  ).rows;

export const aralikYedekParcalar = async (db: Veritabani, baslangic: string, bitis: string) =>
  (await db.query(`SELECT * FROM yedek_parcalar WHERE DATE(created_at) BETWEEN $1 AND $2 ORDER BY ${orderByText('urun_adi')}`, [baslangic, bitis])).rows;

/** Motor stok toplam değeri: stoktaki motorların alım fiyatları toplamı. */
export const motorStokToplami = async (db: Veritabani) =>
  (await db.query(`SELECT COALESCE(SUM(alis_fiyati), 0) as toplam_alis FROM ikinci_el_motorlar WHERE durum IN ('stokta', 'kapora', 'devir_bekliyor')`)).rows[0];

// ============ GENEL ============

export const genelIsEmirleri = async (db: Veritabani) =>
  (
    await db.query(`
      SELECT COUNT(*) as toplam, COUNT(CASE WHEN durum='tamamlandi' THEN 1 END) as tamamlanan,
      COALESCE(SUM(CASE WHEN durum='tamamlandi' THEN gercek_toplam_ucret END), 0) as gelir,
      COALESCE(SUM(CASE WHEN durum='tamamlandi' THEN kar END), 0) as kar FROM is_emirleri
    `)
  ).rows[0];

export const genelAksesuarlar = async (db: Veritabani) =>
  (
    await db.query(`
      SELECT COUNT(*) as toplam, COALESCE(SUM(toplam_satis), 0) as gelir, COALESCE(SUM(kar), 0) as kar FROM aksesuarlar WHERE durum='tamamlandi'
    `)
  ).rows[0];

export const genelMotorlar = async (db: Veritabani) =>
  (
    await db.query(`
      SELECT COUNT(*) as toplam, COALESCE(SUM(satis_fiyati), 0) as gelir,
             COALESCE(SUM(kar - COALESCE(yatirimci_kar,0)), 0) as kar,
             COALESCE(SUM(kar), 0) as kar_toplam,
             COALESCE(SUM(COALESCE(yatirimci_kar,0)), 0) as yatirimci_kar,
             COALESCE(SUM(COALESCE(komisyoncu_tutari,0)), 0) as komisyon,
             COUNT(CASE WHEN motor_durumu = 'sifir' THEN 1 END) as sifir_adet,
             COALESCE(SUM(CASE WHEN motor_durumu = 'sifir' THEN satis_fiyati END), 0) as sifir_gelir,
             COALESCE(SUM(CASE WHEN motor_durumu = 'sifir' THEN kar - COALESCE(yatirimci_kar,0) END), 0) as sifir_kar
      FROM ikinci_el_motorlar WHERE ${MOTOR_RAPORA_GIRER}
    `)
  ).rows[0];

export const genelEticaret = async (db: Veritabani) =>
  (
    await db.query(`
      SELECT COUNT(*) as toplam, COALESCE(SUM(satis_fiyati * adet), 0) as gelir, COALESCE(SUM(kar), 0) as kar FROM eticaret_satislar
    `)
  ).rows[0];

export const genelYedekParcalar = async (db: Veritabani) =>
  (
    await db.query(`
      SELECT COUNT(*) as toplam, COALESCE(SUM(satis_fiyati), 0) as toplam_deger, COALESCE(SUM(alis_fiyati), 0) as toplam_maliyet FROM yedek_parcalar
    `)
  ).rows[0];

// ============ FİŞ KÂR / PERSONEL ============

export const fisKar = async (db: Veritabani, baslangic?: string, bitis?: string) => {
  let sorgu = `SELECT fis_no, musteri_ad_soyad, gercek_toplam_ucret, toplam_maliyet, kar, durum, tamamlama_tarihi, created_at, marka, model_tip, telefon, olusturan_kisi
               FROM is_emirleri WHERE 1=1`;
  const params: unknown[] = [];
  if (baslangic) {
    params.push(baslangic);
    sorgu += ` AND DATE(tamamlama_tarihi) >= $${params.length}`;
  }
  if (bitis) {
    params.push(bitis);
    sorgu += ` AND DATE(tamamlama_tarihi) <= $${params.length}`;
  }
  sorgu += ' ORDER BY fis_no DESC';
  return (await db.query(sorgu, params)).rows;
};

/** DISTINCT ON (LOWER(personel)) karşılığı: her küçük harfli ad için sıralamada ilk yazım seçilir. */
export const personeller = async (db: Veritabani): Promise<string[]> =>
  (
    await db.query<{ personel: string }>(
      `SELECT personel FROM (
      SELECT personel,
             ROW_NUMBER() OVER (PARTITION BY LOWER(personel) ORDER BY ${orderByText('personel')}) AS sira
      FROM (
        SELECT DISTINCT COALESCE(NULLIF(teslim_eden_teknisyen, ''), olusturan_kisi) AS personel FROM is_emirleri
      ) t WHERE personel IS NOT NULL AND personel <> ''
    ) s WHERE sira = 1 ORDER BY ${orderByText('LOWER(personel)')}, ${orderByText('personel')}`,
    )
  ).rows.map((r) => r.personel);

// ============ YATIRIMCI ============

// Yatırımcı raporunun taşıdığı alanlar: alıcı/satıcı kimliği (TC, adres, telefon), ödeme ayrıntıları ve komisyoncu bilgisi
// YOKTUR (KVKK). Rapor ekranı yalnızca bu alanları kullanır.
const YATIRIMCI_RAPOR_KOLONLARI =
  'id, plaka, marka, model, yil, km, durum, stok_tipi, tarih, created_at, alis_fiyati, liste_fiyati, satis_fiyati, satis_tarihi, tamamlama_tarihi, yatirimci_id, yatirimci_kar';

/** Satılmamış (stoktaki) motorlar. */
export const yatirimciStoktakiler = async (db: Veritabani, yatirimciId: number) =>
  (
    await db.query(
      `SELECT ${YATIRIMCI_RAPOR_KOLONLARI} FROM ikinci_el_motorlar
     WHERE yatirimci_id = $1 AND durum <> 'tamamlandi'
     ORDER BY created_at DESC`,
      [yatirimciId],
    )
  ).rows;

/** Satılan motorlar (tarih filtresi opsiyonel). */
export const yatirimciSatilanlar = async (db: Veritabani, yatirimciId: number, baslangic?: string, bitis?: string) => {
  let sorgu = `SELECT ${YATIRIMCI_RAPOR_KOLONLARI} FROM ikinci_el_motorlar
     WHERE yatirimci_id = $1 AND durum = 'tamamlandi'`;
  const params: unknown[] = [yatirimciId];
  if (baslangic) {
    params.push(baslangic);
    sorgu += ` AND DATE(COALESCE(satis_tarihi, tamamlama_tarihi)) >= $${params.length}`;
  }
  if (bitis) {
    params.push(bitis);
    sorgu += ` AND DATE(COALESCE(satis_tarihi, tamamlama_tarihi)) <= $${params.length}`;
  }
  sorgu += ` ORDER BY COALESCE(satis_tarihi, tamamlama_tarihi) DESC`;
  return (await db.query(sorgu, params)).rows;
};

/**
 * Yatırımcı bazlı özet liste. Satış tarihi filtresi (baslangic/bitis boş olabilir). PostgreSQL'deki $1::date dönüşümü ve
 * FILTER (WHERE ...) yerine CAST ve CASE WHEN kullanılır.
 */
export const yatirimciOzetleri = async (db: Veritabani, baslangic?: string, bitis?: string) => {
  const satisKosulu = `m.durum = 'tamamlandi'
          AND ($1 IS NULL OR DATE(COALESCE(m.satis_tarihi, m.tamamlama_tarihi)) >= CAST($1 AS DATE))
          AND ($2 IS NULL OR DATE(COALESCE(m.satis_tarihi, m.tamamlama_tarihi)) <= CAST($2 AS DATE))`;
  return (
    await db.query(
      `
      SELECT k.id, k.ad_soyad, k.kullanici_adi,
        COUNT(CASE WHEN m.durum <> 'tamamlandi' THEN 1 END) AS stok_adet,
        COUNT(CASE WHEN ${satisKosulu} THEN 1 END) AS satilan_adet,
        COALESCE(SUM(CASE WHEN m.durum <> 'tamamlandi' THEN m.alis_fiyati END), 0) AS stok_degeri,
        COALESCE(SUM(CASE WHEN ${satisKosulu} THEN m.satis_fiyati END), 0) AS toplam_satis,
        COALESCE(SUM(CASE WHEN ${satisKosulu} THEN m.yatirimci_kar END), 0) AS yatirimci_kar,
        COALESCE(SUM(CASE WHEN ${satisKosulu} THEN COALESCE(m.kar, 0) - COALESCE(m.yatirimci_kar, 0) END), 0) AS isletme_kar
      FROM kullanicilar k
      LEFT JOIN ikinci_el_motorlar m ON m.yatirimci_id = k.id
      WHERE k.rol = 'yatirimci'
      GROUP BY k.id, k.ad_soyad, k.kullanici_adi
      ORDER BY ${orderByText('k.ad_soyad')}
    `,
      [baslangic || null, bitis || null],
    )
  ).rows;
};
