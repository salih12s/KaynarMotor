/* Yedek parça stok tablosu için SQL. İş kuralı yok: yalnızca sorgular. */
import { orderByText, aramaKolonu, aramaDeseni } from '../../../core/veritabani/sqlText';
import type { Veritabani } from '../../../core/tipler';

export interface StokGirdisi {
  stok_kodu: unknown;
  stok_adi: unknown;
  marka: unknown;
  giren_miktar: number;
  birimi: string;
  alis_fiyati: number;
  satis_fiyati: number;
}

export const enBuyukOtomatikKod = async (db: Veritabani): Promise<string | null> => {
  const sonuc = await db.query<{ stok_kodu: string }>(
    `SELECT stok_kodu FROM yedek_parca_stok WHERE stok_kodu REGEXP '^9[0-9]{12}$' ORDER BY stok_kodu DESC LIMIT 1`,
  );
  return sonuc.rows[0]?.stok_kodu ?? null;
};

export const hepsiniListele = async (db: Veritabani) => (await db.query(`SELECT * FROM yedek_parca_stok ORDER BY ${orderByText('stok_adi')}`)).rows;

export const ara = async (db: Veritabani, aranan: string) =>
  (
    await db.query(
      `SELECT * FROM yedek_parca_stok WHERE ${aramaKolonu('stok_kodu')} LIKE $1 OR ${aramaKolonu('stok_adi')} LIKE $1 OR ${aramaKolonu('marka')} LIKE $1
     ORDER BY ${orderByText('stok_adi')} LIMIT 20`,
      [aramaDeseni(aranan)],
    )
  ).rows;

export const koduneGoreBul = async (db: Veritabani, kod: string) =>
  (await db.query('SELECT * FROM yedek_parca_stok WHERE stok_kodu = $1 LIMIT 1', [kod])).rows[0] ?? null;

export const ekle = async (db: Veritabani, s: StokGirdisi, envanter: number) =>
  (
    await db.query(
      `INSERT INTO yedek_parca_stok (stok_kodu, stok_adi, marka, giren_miktar, mevcut, birimi, alis_fiyati, satis_fiyati, envanter_degeri)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [s.stok_kodu, s.stok_adi, s.marka || null, s.giren_miktar, s.giren_miktar, s.birimi, s.alis_fiyati, s.satis_fiyati, envanter],
    )
  ).rows[0];

/** Satırı kilitleyerek eski stok kodunu okur (kod değişimi iş emri parçalarına yansıtılacak). */
export const kodunuKilitleyerekOku = async (db: Veritabani, id: number): Promise<string | null> => {
  const sonuc = await db.query<{ stok_kodu: string }>('SELECT stok_kodu FROM yedek_parca_stok WHERE id = $1 FOR UPDATE', [id]);
  return sonuc.rows[0] ? sonuc.rows[0].stok_kodu : null;
};

/** mevcut = giren − çıkan: düzenleme satışları stoğa geri döndürmez. */
export const guncelle = async (db: Veritabani, id: number, s: StokGirdisi) =>
  (
    await db.query(
      `UPDATE yedek_parca_stok SET stok_kodu=$1, stok_adi=$2, marka=$3, giren_miktar=$4,
     envanter_degeri=GREATEST($4 - IFNULL(cikan_miktar, 0), 0) * $7,
     mevcut=$4 - IFNULL(cikan_miktar, 0),
     birimi=$5, alis_fiyati=$6, satis_fiyati=$7, updated_at=CURRENT_TIMESTAMP
     WHERE id=$8 RETURNING *`,
      [s.stok_kodu, s.stok_adi, s.marka || null, s.giren_miktar, s.birimi, s.alis_fiyati, s.satis_fiyati, id],
    )
  ).rows[0];

/** İş emri parçaları stoğa stok KODUYLA bağlıdır: kod değişince bağlantı yeni koda taşınır. */
export const parcaKodlariniTasi = async (db: Veritabani, yeniKod: unknown, eskiKod: string) => {
  await db.query('UPDATE parcalar SET parca_kodu = $1 WHERE parca_kodu = $2', [yeniKod, eskiKod]);
};

export const sil = async (db: Veritabani, id: number) => {
  await db.query('DELETE FROM yedek_parca_stok WHERE id = $1', [id]);
};

/** Var olan koda tekrar aktarım: çıkan (satılan) miktar korunur → mevcut = giren − çıkan. */
export const topluEkleVeyaGuncelle = async (db: Veritabani, s: StokGirdisi, envanter: number) => {
  await db.query(
    `INSERT INTO yedek_parca_stok (stok_kodu, stok_adi, marka, giren_miktar, mevcut, birimi, alis_fiyati, satis_fiyati, envanter_degeri)
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
