/* Yedek parça satışları için SQL. İş kuralı yok: yalnızca sorgular. */
import { orderByText } from '../../core/sqlText';
import type { Veritabani } from '../../core/tipler';

export interface SatisGirdisi {
  urun_adi: unknown;
  alis_fiyati: number;
  satis_fiyati: number;
  musteri_adi: unknown;
  musteri_telefon: unknown;
  kalan_odeme: number;
  stok_id: unknown;
  adet: number;
}

export interface SatisKaydi { stok_id: number | null; adet: number | null }

export const hepsiniListele = async (db: Veritabani) =>
  (await db.query(`SELECT * FROM yedek_parcalar ORDER BY ${orderByText('urun_adi')}`)).rows;

export const idyeGoreBul = async (db: Veritabani, id: number) =>
  (await db.query('SELECT * FROM yedek_parcalar WHERE id = $1', [id])).rows[0] ?? null;

export const ekle = async (db: Veritabani, s: SatisGirdisi) =>
  (await db.query(
    'INSERT INTO yedek_parcalar (urun_adi, alis_fiyati, satis_fiyati, musteri_adi, musteri_telefon, kalan_odeme, stok_id, adet) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
    [s.urun_adi, s.alis_fiyati, s.satis_fiyati, s.musteri_adi || null, s.musteri_telefon || null, s.kalan_odeme, s.stok_id || null, s.adet]
  )).rows[0];

/** FOR UPDATE: eşzamanlı düzenleme/silme sıraya girer (kilitsiz okuma eski anlık görüntüyle çalışır). */
export const kilitleyerekOku = async (db: Veritabani, id: number): Promise<SatisKaydi | null> =>
  (await db.query<SatisKaydi>('SELECT stok_id, adet FROM yedek_parcalar WHERE id = $1 FOR UPDATE', [id])).rows[0] ?? null;

export const guncelle = async (db: Veritabani, id: number, s: SatisGirdisi) =>
  (await db.query(
    'UPDATE yedek_parcalar SET urun_adi=$1, alis_fiyati=$2, satis_fiyati=$3, musteri_adi=$4, musteri_telefon=$5, kalan_odeme=$7, stok_id=$8, adet=$9, updated_at=CURRENT_TIMESTAMP WHERE id=$6 RETURNING *',
    [s.urun_adi, s.alis_fiyati, s.satis_fiyati, s.musteri_adi || null, s.musteri_telefon || null, id, s.kalan_odeme, s.stok_id || null, s.adet]
  )).rows[0];

export const sil = async (db: Veritabani, id: number) => {
  await db.query('DELETE FROM yedek_parcalar WHERE id = $1', [id]);
};
