/* Plaka QR token'ları ve müşteriye açık servis geçmişi için SQL. */
import type { Veritabani } from '../../../core/tipler';

export const plakayiBul = async (db: Veritabani, token: string): Promise<string | null> => {
  const sonuc = await db.query<{ plaka: string }>('SELECT plaka FROM servis_qr_tokenler WHERE token = $1', [token]);
  return sonuc.rows[0] ? sonuc.rows[0].plaka : null;
};

/** Plaka için token varsa dokunulmaz (eski token kalır), yoksa yenisi eklenir. */
export const tokenEkleYoksa = async (db: Veritabani, plaka: string, token: string) => {
  await db.query('INSERT IGNORE INTO servis_qr_tokenler (plaka, token) VALUES ($1, $2)', [plaka, token]);
};

export const tokenOku = async (db: Veritabani, plaka: string) =>
  (await db.query<{ plaka: string; token: string }>('SELECT plaka, token FROM servis_qr_tokenler WHERE plaka = $1', [plaka])).rows[0];

/** Plakayı normalize ederek eşleştirir (büyük/küçük harf ve boşluk farkları sorun olmasın). */
export const plakayaGoreServisler = async (db: Veritabani, plaka: string) =>
  (await db.query(
    `SELECT id, fis_no, plaka, marka, model_tip, km, durum, created_at, teslim_tarihi, tamamlama_tarihi, gercek_toplam_ucret
     FROM is_emirleri
     WHERE REGEXP_REPLACE(UPPER(COALESCE(plaka, '')), '[^A-Z0-9]', '') = $1
     ORDER BY created_at DESC`,
    [plaka]
  )).rows;

export const parcaIsimleri = async (db: Veritabani, isEmriIdleri: number[]) =>
  (await db.query(
    'SELECT is_emri_id, takilan_parca, adet FROM parcalar WHERE is_emri_id = ANY($1) ORDER BY id',
    [isEmriIdleri]
  )).rows;
