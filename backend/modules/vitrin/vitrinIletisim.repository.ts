/* Vitrin segmentleri ve hizmet sayfası iletişim kayıtları için SQL. İş kuralı yok: yalnızca sorgular. */
import { orderByText } from '../../core/sqlText';
import type { Veritabani } from '../../core/tipler';

export const segmentleriListele = async (db: Veritabani) =>
  (await db.query(`SELECT id, ad FROM vitrin_segmentler ORDER BY sira ASC, ${orderByText('ad')}`)).rows;

export const sonrakiSegmentSirasi = async (db: Veritabani): Promise<number> =>
  (await db.query<{ s: number }>('SELECT COALESCE(MAX(sira),0)+1 AS s FROM vitrin_segmentler')).rows[0]!.s;

export const segmentEkleYoksa = async (db: Veritabani, ad: string, sira: number) => {
  await db.query('INSERT IGNORE INTO vitrin_segmentler (ad, sira) VALUES ($1,$2)', [ad, sira]);
};

export const segmentBul = async (db: Veritabani, ad: string) =>
  (await db.query('SELECT id, ad FROM vitrin_segmentler WHERE ad = $1', [ad])).rows[0];

/** Görsel base64'ü HARİÇ: yalnızca var/yok bilgisi (liste hafif kalsın). */
export const iletisimleriListele = async (db: Veritabani) =>
  (await db.query(
    `SELECT kategori, personel_adi, telefon, personel_adi_2, telefon_2, aciklama, baslik,
            (gorsel IS NOT NULL) AS gorsel_var, updated_at
     FROM vitrin_kategori_iletisim`
  )).rows;

export interface IletisimAlanlari {
  personel_adi: unknown; telefon: unknown; aciklama: unknown; baslik: unknown; personel_adi_2: unknown; telefon_2: unknown;
}

export const iletisimKaydet = async (db: Veritabani, kategori: string, a: IletisimAlanlari) => {
  await db.query(
    `INSERT INTO vitrin_kategori_iletisim (kategori, personel_adi, telefon, aciklama, baslik, personel_adi_2, telefon_2, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       personel_adi=VALUES(personel_adi), telefon=VALUES(telefon),
       personel_adi_2=VALUES(personel_adi_2), telefon_2=VALUES(telefon_2),
       aciklama=VALUES(aciklama), baslik=VALUES(baslik), updated_at=CURRENT_TIMESTAMP`,
    [kategori, a.personel_adi, a.telefon, a.aciklama, a.baslik, a.personel_adi_2, a.telefon_2]
  );
};

export const iletisimGorseliYaz = async (db: Veritabani, kategori: string, gorsel: string) => {
  await db.query('UPDATE vitrin_kategori_iletisim SET gorsel=$1 WHERE kategori=$2', [gorsel, kategori]);
};

export const iletisimGorseliniSil = async (db: Veritabani, kategori: string) => {
  await db.query('UPDATE vitrin_kategori_iletisim SET gorsel=NULL WHERE kategori=$1', [kategori]);
};
