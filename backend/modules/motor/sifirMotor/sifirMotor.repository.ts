/* Sıfır motor (model) stoğu, görselleri ve bağlı vitrin ilanı için SQL. İş kuralı yok: yalnızca sorgular. */
import type { Veritabani } from '../../../core/tipler';

export type SifirMotorSatiri = Record<string, any>;

/** INSERT/UPDATE için hazır (normalize edilmiş) değerler. */
export interface SifirMotorAlanlari {
  marka: string;
  model: string | null;
  yil: number | null;
  motor_cc: number | null;
  segment: string | null;
  alis_fiyati: number;
  liste_fiyati: number;
  aciklama: string | null;
}

// Satılan adet: bu modele bağlı tamamlanmış satışlar (model stoktan düşmez; sayaç yalnızca bilgi içindir)
const LISTE_SORGUSU = `
  SELECT s.*,
         (SELECT COUNT(*) FROM sifir_motor_gorseller g WHERE g.sifir_motor_id = s.id) AS gorsel_sayisi,
         (SELECT COUNT(*) FROM ikinci_el_motorlar m WHERE m.sifir_motor_id = s.id AND m.durum = 'tamamlandi') AS satilan_adet
  FROM sifir_motorlar s`;

export const listele = async (db: Veritabani): Promise<SifirMotorSatiri[]> =>
  (await db.query(`${LISTE_SORGUSU} ORDER BY s.marka ASC, s.model ASC, s.id DESC`)).rows;

export const idyeGoreBul = async (db: Veritabani, id: number): Promise<SifirMotorSatiri | null> =>
  (await db.query(`${LISTE_SORGUSU} WHERE s.id = $1`, [id])).rows[0] ?? null;

/** FOR UPDATE: eşzamanlı güncellemeler sıraya girer. */
export const kilitleyerekOku = async (db: Veritabani, id: number): Promise<SifirMotorSatiri | null> =>
  (await db.query('SELECT * FROM sifir_motorlar WHERE id = $1 FOR UPDATE', [id])).rows[0] ?? null;

export const gorselIdleri = async (db: Veritabani, id: number): Promise<number[]> =>
  (await db.query<{ id: number }>('SELECT id FROM sifir_motor_gorseller WHERE sifir_motor_id = $1 ORDER BY sira ASC, id ASC', [id])).rows.map((r) => r.id);

export const ekle = async (db: Veritabani, a: SifirMotorAlanlari): Promise<SifirMotorSatiri> =>
  (
    await db.query(
      `INSERT INTO sifir_motorlar (marka, model, yil, motor_cc, segment, alis_fiyati, liste_fiyati, aciklama)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [a.marka, a.model, a.yil, a.motor_cc, a.segment, a.alis_fiyati, a.liste_fiyati, a.aciklama],
    )
  ).rows[0];

export const guncelle = async (db: Veritabani, id: number, a: SifirMotorAlanlari) => {
  await db.query(
    `UPDATE sifir_motorlar SET marka=$1, model=$2, yil=$3, motor_cc=$4, segment=$5, alis_fiyati=$6, liste_fiyati=$7, aciklama=$8,
       updated_at=CURRENT_TIMESTAMP WHERE id=$9`,
    [a.marka, a.model, a.yil, a.motor_cc, a.segment, a.alis_fiyati, a.liste_fiyati, a.aciklama, id],
  );
};

export const gorselEkle = async (db: Veritabani, sifirMotorId: number, data: string, sira: number): Promise<number> =>
  (await db.query<{ id: number }>('INSERT INTO sifir_motor_gorseller (sifir_motor_id, data, sira) VALUES ($1,$2,$3) RETURNING id', [sifirMotorId, data, sira]))
    .rows[0]!.id;

export const gorselleriSil = async (db: Veritabani, sifirMotorId: number) => {
  await db.query('DELETE FROM sifir_motor_gorseller WHERE sifir_motor_id = $1', [sifirMotorId]);
};

export const kapakAyarla = async (db: Veritabani, sifirMotorId: number, kapakId: number | null) => {
  await db.query('UPDATE sifir_motorlar SET kapak_gorsel_id = $1 WHERE id = $2', [kapakId, sifirMotorId]);
};

export const gorselVerisi = async (db: Veritabani, id: string): Promise<string | null> =>
  (await db.query<{ data: string }>('SELECT data FROM sifir_motor_gorseller WHERE id = $1', [id])).rows[0]?.data ?? null;

/** Model fiyatı = site fiyatı: liste fiyatı değişince bağlı vitrin ilanının fiyatı da güncellenir. */
export const vitrinFiyatiniGuncelle = async (db: Veritabani, sifirMotorId: number, fiyat: number) => {
  await db.query('UPDATE vitrin_urunleri SET fiyat = $1, updated_at = CURRENT_TIMESTAMP WHERE sifir_motor_id = $2', [fiyat, sifirMotorId]);
};

/** Silinen modelin ilanı yetim kalmasın: yayından kaldırılır ve bağlantı koparılır (vitrin tarafında FK yok). */
export const vitrinBaglantisiniKopar = async (db: Veritabani, sifirMotorId: number) => {
  await db.query('UPDATE vitrin_urunleri SET sifir_motor_id = NULL, yayinda = FALSE, updated_at = CURRENT_TIMESTAMP WHERE sifir_motor_id = $1', [sifirMotorId]);
};

/** Görseller cascade silinir; bu modele bağlı satışların bağlantısı NULL olur (satış "sıfır" olarak kalır). */
export const sil = async (db: Veritabani, id: number): Promise<number> => (await db.query('DELETE FROM sifir_motorlar WHERE id = $1', [id])).rowCount;
