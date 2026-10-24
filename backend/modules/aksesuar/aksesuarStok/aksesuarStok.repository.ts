/* Aksesuar stok tablosu için SQL. İş kuralı yok: yalnızca sorgular. */
import { orderByText } from '../../../core/veritabani/sqlText';
import type { Veritabani } from '../../../core/tipler';

export interface StokGirdisi {
  stok_kodu: unknown;
  stok_adi: unknown;
  marka: unknown;
  giren_miktar: number;
  birimi: string;
  alis_fiyati: number;
  satis_fiyati: number;
  platform: unknown;
  beden: unknown;
  renk: unknown;
  kategori: unknown;
}

/** Toplu içe aktarmada yalnızca bu alanlar yazılır. */
export type TopluStokGirdisi = Pick<StokGirdisi, 'stok_kodu' | 'stok_adi' | 'marka' | 'giren_miktar' | 'birimi' | 'alis_fiyati' | 'satis_fiyati'>;

/**
 * Dahili kodlar 13 haneli ve 0 ile başlar. Gerçek ürün barkodları (EAN, 8690... gibi) metin sıralamasında bunların
 * üstüne çıkıp sıradaki kodu barkod+1'e zıplatıyordu; bu yüzden yalnızca dahili biçim sayılır.
 */
export const enBuyukDahiliKod = async (db: Veritabani): Promise<string | null> => {
  const sonuc = await db.query<{ stok_kodu: string }>(
    `SELECT stok_kodu FROM aksesuar_stok WHERE stok_kodu REGEXP '^0[0-9]{12}$' ORDER BY stok_kodu DESC LIMIT 1`,
  );
  return sonuc.rows[0]?.stok_kodu ?? null;
};

export const hepsiniListele = async (db: Veritabani) => (await db.query(`SELECT * FROM aksesuar_stok ORDER BY ${orderByText('stok_adi')}`)).rows;

export const ara = async (db: Veritabani, aranan: string) =>
  (
    await db.query(
      `SELECT * FROM aksesuar_stok WHERE LOWER(stok_kodu) LIKE LOWER($1) OR LOWER(stok_adi) LIKE LOWER($1) OR LOWER(marka) LIKE LOWER($1)
     ORDER BY ${orderByText('stok_adi')} LIMIT 20`,
      [aranan],
    )
  ).rows;

export const koduneGoreBul = async (db: Veritabani, kod: string) =>
  (await db.query('SELECT * FROM aksesuar_stok WHERE stok_kodu = $1 LIMIT 1', [kod])).rows[0] ?? null;

export const ekle = async (db: Veritabani, s: StokGirdisi, envanter: number) =>
  (
    await db.query(
      `INSERT INTO aksesuar_stok (stok_kodu, stok_adi, marka, giren_miktar, mevcut, birimi, alis_fiyati, satis_fiyati, envanter_degeri, platform, beden, renk, kategori)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        s.stok_kodu,
        s.stok_adi,
        s.marka || null,
        s.giren_miktar,
        s.giren_miktar,
        s.birimi,
        s.alis_fiyati,
        s.satis_fiyati,
        envanter,
        s.platform || null,
        s.beden || null,
        s.renk || null,
        s.kategori || null,
      ],
    )
  ).rows[0];

/**
 * mevcut = giren − çıkan. Eskiden mevcut = giren yazılıyordu: yalnızca fiyat düzeltince bile o ana kadarki satışlar
 * stoğa geri dönüyordu. Çıkan miktar satışlardan gelir ve bu uçta değiştirilmez.
 */
export const guncelle = async (db: Veritabani, id: number, s: StokGirdisi) =>
  (
    await db.query(
      `UPDATE aksesuar_stok SET stok_kodu=$1, stok_adi=$2, marka=$3, giren_miktar=$4,
     envanter_degeri=GREATEST($4 - IFNULL(cikan_miktar, 0), 0) * $7,
     mevcut=$4 - IFNULL(cikan_miktar, 0),
     birimi=$5, alis_fiyati=$6, satis_fiyati=$7, platform=$8, beden=$9, renk=$10, kategori=$11, updated_at=CURRENT_TIMESTAMP
     WHERE id=$12 RETURNING *`,
      [
        s.stok_kodu,
        s.stok_adi,
        s.marka || null,
        s.giren_miktar,
        s.birimi,
        s.alis_fiyati,
        s.satis_fiyati,
        s.platform || null,
        s.beden || null,
        s.renk || null,
        s.kategori || null,
        id,
      ],
    )
  ).rows[0] ?? null;

export const sil = async (db: Veritabani, id: number) => {
  await db.query('DELETE FROM aksesuar_stok WHERE id = $1', [id]);
};

/** Var olan koda tekrar aktarım: çıkan (satılan) miktar korunur → mevcut = giren − çıkan; boş marka mevcut markayı silmez. */
export const topluEkleVeyaGuncelle = async (db: Veritabani, s: TopluStokGirdisi, envanter: number) => {
  await db.query(
    `INSERT INTO aksesuar_stok (stok_kodu, stok_adi, marka, giren_miktar, mevcut, birimi, alis_fiyati, satis_fiyati, envanter_degeri)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON DUPLICATE KEY UPDATE
       stok_adi=VALUES(stok_adi), marka=COALESCE(VALUES(marka), marka), giren_miktar=VALUES(giren_miktar),
       mevcut=VALUES(giren_miktar) - IFNULL(cikan_miktar, 0),
       alis_fiyati=VALUES(alis_fiyati), satis_fiyati=VALUES(satis_fiyati),
       envanter_degeri=GREATEST(VALUES(giren_miktar) - IFNULL(cikan_miktar, 0), 0) * VALUES(satis_fiyati),
       updated_at=CURRENT_TIMESTAMP(6)`,
    [s.stok_kodu, s.stok_adi, s.marka || null, s.giren_miktar, s.giren_miktar, s.birimi, s.alis_fiyati, s.satis_fiyati, envanter],
  );
};
