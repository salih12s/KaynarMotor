/* E-ticaret platformları ve satışları için SQL. İş kuralı yok: yalnızca sorgular. */
import { orderByText } from '../../core/veritabani/sqlText';
import type { Veritabani } from '../../core/tipler';

export interface PlatformAlanlari {
  platform_adi: string;
  komisyon_orani: number;
  kdv_orani: number;
  kargo_ucreti: number;
}

export interface SatisAlanlari {
  stok_id: unknown; platform_id: unknown; urun_adi: unknown;
  alis_fiyati: number; satis_fiyati: number; komisyon_orani: number; komisyon_tutari: number;
  kdv_orani: number; kargo_ucreti: number; kar: number; adet: number; tarih: unknown;
}

// ============ PLATFORMLAR ============

export const platformlariListele = async (db: Veritabani) =>
  (await db.query(`SELECT * FROM eticaret_platformlar ORDER BY ${orderByText('platform_adi')}`)).rows;

export const platformEkle = async (db: Veritabani, p: PlatformAlanlari) =>
  (await db.query(
    'INSERT INTO eticaret_platformlar (platform_adi, komisyon_orani, kdv_orani, kargo_ucreti) VALUES ($1, $2, $3, $4) RETURNING *',
    [p.platform_adi, p.komisyon_orani, p.kdv_orani, p.kargo_ucreti]
  )).rows[0];

export const platformGuncelle = async (db: Veritabani, id: number, p: PlatformAlanlari) =>
  (await db.query(
    'UPDATE eticaret_platformlar SET platform_adi=$1, komisyon_orani=$2, kdv_orani=$3, kargo_ucreti=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *',
    [p.platform_adi, p.komisyon_orani, p.kdv_orani, p.kargo_ucreti, id]
  )).rows[0] ?? null;

/** Silinen satır sayısı (0: kayıt yoktu). */
export const platformSil = async (db: Veritabani, id: number): Promise<number> =>
  (await db.query('DELETE FROM eticaret_platformlar WHERE id = $1', [id])).rowCount;

export const platformAdi = async (db: Veritabani, id: unknown): Promise<string | null> => {
  const sonuc = await db.query<{ platform_adi: string }>('SELECT platform_adi FROM eticaret_platformlar WHERE id = $1', [id]);
  return sonuc.rows[0] ? sonuc.rows[0].platform_adi : null;
};

// ============ SATIŞLAR ============

export const istatistik = async (db: Veritabani) =>
  (await db.query(`
      SELECT
        COUNT(*) as toplam_satis,
        COALESCE(SUM(satis_fiyati * adet), 0) as toplam_gelir,
        COALESCE(SUM(komisyon_tutari), 0) as toplam_komisyon,
        COALESCE(SUM(kar), 0) as toplam_kar
      FROM eticaret_satislar
    `)).rows[0];

export const satislariListele = async (db: Veritabani) =>
  (await db.query(`
      SELECT es.*, ep.platform_adi, ep.komisyon_orani as platform_komisyon
      FROM eticaret_satislar es
      LEFT JOIN eticaret_platformlar ep ON es.platform_id = ep.id
      ORDER BY es.created_at DESC
    `)).rows;

export const satisBul = async (db: Veritabani, id: number) =>
  (await db.query(`
      SELECT es.*, ep.platform_adi
      FROM eticaret_satislar es
      LEFT JOIN eticaret_platformlar ep ON es.platform_id = ep.id
      WHERE es.id = $1
    `, [id])).rows[0] ?? null;

/** Platform adı da eklenmiş tam kayıt (oluşturma/güncelleme yanıtı). */
export const satisPlatformlaBul = async (db: Veritabani, id: number) =>
  (await db.query(`
      SELECT es.*, ep.platform_adi FROM eticaret_satislar es
      LEFT JOIN eticaret_platformlar ep ON es.platform_id = ep.id WHERE es.id = $1
    `, [id])).rows[0];

export const satisEkle = async (db: Veritabani, s: SatisAlanlari) =>
  (await db.query(
    `INSERT INTO eticaret_satislar (stok_id, platform_id, urun_adi, alis_fiyati, satis_fiyati, komisyon_orani, komisyon_tutari, kdv_orani, kargo_ucreti, kar, adet, tarih)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [s.stok_id, s.platform_id, s.urun_adi, s.alis_fiyati, s.satis_fiyati, s.komisyon_orani, s.komisyon_tutari, s.kdv_orani,
     s.kargo_ucreti, s.kar, s.adet, s.tarih]
  )).rows[0];

/** FOR UPDATE: eşzamanlı düzenleme/silme sıraya girer (kilitsiz okuma eski anlık görüntüyle çalışır). */
export const satisiKilitleyerekOku = async (db: Veritabani, id: number) =>
  (await db.query('SELECT * FROM eticaret_satislar WHERE id = $1 FOR UPDATE', [id])).rows[0] ?? null;

export const satisGuncelle = async (db: Veritabani, id: number, s: SatisAlanlari) => {
  await db.query(
    `UPDATE eticaret_satislar SET stok_id=$1, platform_id=$2, urun_adi=$3, alis_fiyati=$4,
     satis_fiyati=$5, komisyon_orani=$6, komisyon_tutari=$7, kdv_orani=$8, kargo_ucreti=$9,
     kar=$10, adet=$11, tarih=$12, updated_at=CURRENT_TIMESTAMP WHERE id=$13`,
    [s.stok_id, s.platform_id, s.urun_adi, s.alis_fiyati, s.satis_fiyati, s.komisyon_orani, s.komisyon_tutari, s.kdv_orani,
     s.kargo_ucreti, s.kar, s.adet, s.tarih, id]
  );
};

export const satisSil = async (db: Veritabani, id: number) => {
  await db.query('DELETE FROM eticaret_satislar WHERE id = $1', [id]);
};
