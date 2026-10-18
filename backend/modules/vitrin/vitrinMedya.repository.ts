/* Vitrin medyası (görsel, video, hizmet sayfası görseli) için SQL. İş kuralı yok: yalnızca sorgular. */
import type { Veritabani } from '../../core/tipler';

/** base64 data URL metni (veya kayıt yoksa null). */
export const gorselVerisi = async (db: Veritabani, id: unknown): Promise<string | null> => {
  const r = await db.query<{ data: string }>('SELECT data FROM vitrin_gorseller WHERE id = $1', [id]);
  return r.rows[0] ? r.rows[0].data : null;
};

export const videoVerisi = async (db: Veritabani, id: unknown): Promise<string | null> => {
  const r = await db.query<{ data: string }>('SELECT data FROM vitrin_videolar WHERE id = $1', [id]);
  return r.rows[0] ? r.rows[0].data : null;
};

/** Hizmet sayfası görseli: kayıt yoksa ya da görsel boşsa null. */
export const iletisimGorseli = async (db: Veritabani, kategori: unknown): Promise<string | null> => {
  const r = await db.query<{ gorsel: string | null }>('SELECT gorsel FROM vitrin_kategori_iletisim WHERE kategori = $1', [kategori]);
  return r.rows[0] && r.rows[0].gorsel ? r.rows[0].gorsel : null;
};
