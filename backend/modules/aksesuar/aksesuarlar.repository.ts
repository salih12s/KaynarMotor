/* Aksesuar satışları ve satış satırları için SQL. İş kuralı yok: yalnızca sorgular. */
import type { Veritabani } from '../../core/tipler';

export interface YeniSatis {
  ad_soyad: unknown; telefon: unknown; odeme_sekli: unknown; aciklama: unknown;
  durum: string; odeme_detaylari: unknown; satis_tarihi: unknown;
  toplam_maliyet: number; toplam_satis: number; kar: number; tamamlama_tarihi: Date | null;
  olusturan_kisi: string | null; kalan_odeme: number; indirim: number;
}

export interface SatisGuncelleme {
  ad_soyad: unknown; telefon: unknown; odeme_sekli: unknown; aciklama: unknown;
  durum: unknown; odeme_detaylari: unknown; satis_tarihi: unknown;
  toplam_maliyet: number; toplam_satis: number; kar: number; tamamlama_tarihi: Date | null;
  kalan_odeme: number; indirim: number;
}

export interface YeniParca {
  stok_id: number | null; urun_adi: unknown; adet: number; maliyet: number; satis_fiyati: number;
}

export const istatistik = async (db: Veritabani) =>
  (await db.query(`
      SELECT
        COUNT(*) as toplam_satis,
        COALESCE(SUM(toplam_satis), 0) as toplam_gelir,
        COALESCE(SUM(toplam_maliyet), 0) as toplam_maliyet,
        COALESCE(SUM(kar), 0) as toplam_kar,
        COUNT(CASE WHEN durum = 'beklemede' THEN 1 END) as bekleyen,
        COUNT(CASE WHEN durum = 'tamamlandi' THEN 1 END) as tamamlanan
      FROM aksesuarlar
    `)).rows[0];

export const hepsiniListele = async (db: Veritabani) =>
  (await db.query('SELECT * FROM aksesuarlar ORDER BY created_at DESC')).rows;

export const idyeGoreBul = async (db: Veritabani, id: number) =>
  (await db.query('SELECT * FROM aksesuarlar WHERE id = $1', [id])).rows[0] ?? null;

export const parcalariListele = async (db: Veritabani, aksesuarId: number) =>
  (await db.query('SELECT * FROM aksesuar_parcalar WHERE aksesuar_id = $1 ORDER BY id', [aksesuarId])).rows;

/** Parça kayıtları bu sırayla okunur (iade için; sıra önemsiz). */
export const parcalariOku = async (db: Veritabani, aksesuarId: number) =>
  (await db.query('SELECT * FROM aksesuar_parcalar WHERE aksesuar_id = $1', [aksesuarId])).rows;

export const stokIdVarMi = async (db: Veritabani, id: number): Promise<boolean> =>
  (await db.query('SELECT id FROM aksesuar_stok WHERE id = $1', [id])).rows.length > 0;

/** Aynı adlı birden fazla kayıt varsa deterministik olarak en düşük id. */
export const stokIdAdaGore = async (db: Veritabani, ad: string): Promise<number | null> =>
  (await db.query<{ id: number }>('SELECT id FROM aksesuar_stok WHERE stok_adi = $1 ORDER BY id LIMIT 1', [ad])).rows[0]?.id ?? null;

export const ekle = async (db: Veritabani, s: YeniSatis) =>
  (await db.query(
    `INSERT INTO aksesuarlar (ad_soyad, telefon, odeme_sekli, aciklama, durum, odeme_detaylari, satis_tarihi, toplam_maliyet, toplam_satis, kar, tamamlama_tarihi, olusturan_kisi, kalan_odeme, indirim)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [s.ad_soyad, s.telefon, s.odeme_sekli, s.aciklama, s.durum, s.odeme_detaylari, s.satis_tarihi, s.toplam_maliyet, s.toplam_satis, s.kar,
     s.tamamlama_tarihi, s.olusturan_kisi, s.kalan_odeme, s.indirim]
  )).rows[0];

export const parcaEkle = async (db: Veritabani, aksesuarId: number, p: YeniParca) => {
  await db.query(
    'INSERT INTO aksesuar_parcalar (aksesuar_id, stok_id, urun_adi, adet, maliyet, satis_fiyati) VALUES ($1,$2,$3,$4,$5,$6)',
    [aksesuarId, p.stok_id, p.urun_adi, p.adet, p.maliyet, p.satis_fiyati]
  );
};

/** FOR UPDATE: eşzamanlı düzenleme/silme sıraya girer (kilitsiz okuma eski anlık görüntüyle çalışır). */
export const kilitleyerekOku = async (db: Veritabani, id: number) =>
  (await db.query('SELECT * FROM aksesuarlar WHERE id = $1 FOR UPDATE', [id])).rows[0] ?? null;

export const durumunuKilitleyerekOku = async (db: Veritabani, id: number): Promise<string | null> => {
  const sonuc = await db.query<{ durum: string }>('SELECT durum FROM aksesuarlar WHERE id = $1 FOR UPDATE', [id]);
  return sonuc.rows[0] ? sonuc.rows[0].durum : null;
};

export const parcalariSil = async (db: Veritabani, aksesuarId: number) => {
  await db.query('DELETE FROM aksesuar_parcalar WHERE aksesuar_id = $1', [aksesuarId]);
};

export const guncelle = async (db: Veritabani, id: number, s: SatisGuncelleme) => {
  await db.query(
    `UPDATE aksesuarlar SET ad_soyad=$1, telefon=$2, odeme_sekli=$3, aciklama=$4, durum=$5,
     odeme_detaylari=$6, satis_tarihi=$7, toplam_maliyet=$8, toplam_satis=$9, kar=$10,
     tamamlama_tarihi=COALESCE($11, tamamlama_tarihi), kalan_odeme=$13, indirim=$14, updated_at=CURRENT_TIMESTAMP WHERE id=$12`,
    [s.ad_soyad, s.telefon, s.odeme_sekli, s.aciklama, s.durum, s.odeme_detaylari, s.satis_tarihi, s.toplam_maliyet, s.toplam_satis, s.kar,
     s.tamamlama_tarihi, id, s.kalan_odeme, s.indirim]
  );
};

export const sil = async (db: Veritabani, id: number) => {
  await db.query('DELETE FROM aksesuarlar WHERE id = $1', [id]);
};
