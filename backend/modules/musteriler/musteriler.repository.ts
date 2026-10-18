/* Müşteri tabloları için SQL. İş kuralı yok: yalnızca sorgular. `db` havuz ya da açık bir transaction bağlantısıdır. */
import { orderByText } from '../../core/veritabani/sqlText';
import type { Veritabani } from '../../core/tipler';

export interface MusteriSatiri {
  id: number;
  ad_soyad: string | null;
  telefon: string | null;
  adres: string | null;
  [alan: string]: any;
}

export const hepsiniListele = async (db: Veritabani) =>
  (await db.query<MusteriSatiri>('SELECT * FROM musteriler ORDER BY created_at DESC')).rows;

export const adVeyaTelefonaGoreAra = async (db: Veritabani, aranan: string) =>
  (await db.query<MusteriSatiri>(
    `SELECT * FROM musteriler WHERE LOWER(ad_soyad) LIKE LOWER($1) OR LOWER(telefon) LIKE LOWER($1)
     ORDER BY ${orderByText('ad_soyad')} LIMIT 20`,
    [aranan]
  )).rows;

/** Telefonun son haneleriyle eşleşen en güncel müşteri (yazım biçimi farklı olsa da aynı kişi bulunur). */
export const sonHanelereGoreBul = async (db: Veritabani, sonHaneler: string) =>
  (await db.query<MusteriSatiri>(
    `SELECT * FROM musteriler
     WHERE REGEXP_REPLACE(COALESCE(telefon,''), '[^0-9]', '') LIKE CONCAT('%', $1)
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 1`,
    [sonHaneler]
  )).rows[0] ?? null;

export const idyeGoreBul = async (db: Veritabani, id: number) =>
  (await db.query<MusteriSatiri>('SELECT * FROM musteriler WHERE id = $1', [id])).rows[0] ?? null;

export const adaGoreBul = async (db: Veritabani, ad: string) =>
  (await db.query<MusteriSatiri>('SELECT id, ad_soyad, telefon, adres FROM musteriler WHERE LOWER(ad_soyad) = LOWER($1) LIMIT 1', [ad])).rows[0] ?? null;

export const telefonaGoreBulOzet = async (db: Veritabani, sonHaneler: string) =>
  (await db.query<MusteriSatiri>(
    `SELECT id, ad_soyad, telefon, adres FROM musteriler
     WHERE REGEXP_REPLACE(COALESCE(telefon,''), '[^0-9]', '') LIKE CONCAT('%', $1)
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 1`,
    [sonHaneler]
  )).rows[0] ?? null;

// ---- Müşterinin işlem geçmişi (ad üzerinden eşleşir)
export const motorGecmisi = async (db: Veritabani, ad: string) =>
  (await db.query(
    `SELECT id, plaka, marka, model, yil, alis_fiyati, satis_fiyati, noter_satis, kar, durum, tarih, satis_tarihi, satici_adi, alici_adi, yevmiye_no
     FROM ikinci_el_motorlar WHERE LOWER(satici_adi) = LOWER($1) OR LOWER(alici_adi) = LOWER($1)
     ORDER BY COALESCE(satis_tarihi, tarih, created_at) DESC`,
    [ad]
  )).rows;

export const aksesuarGecmisi = async (db: Veritabani, ad: string) =>
  (await db.query(
    `SELECT id, ad_soyad, telefon, toplam_satis, kar, durum, satis_tarihi, olusturan_kisi
     FROM aksesuarlar WHERE LOWER(ad_soyad) = LOWER($1)
     ORDER BY COALESCE(satis_tarihi, created_at) DESC`,
    [ad]
  )).rows;

export const isEmriGecmisi = async (db: Veritabani, ad: string) =>
  (await db.query(
    `SELECT id, fis_no, musteri_ad_soyad, model_tip, marka, durum, gercek_toplam_ucret, created_at
     FROM is_emirleri WHERE LOWER(musteri_ad_soyad) = LOWER($1)
     ORDER BY created_at DESC`,
    [ad]
  )).rows;

// ---- Yazma
export const ekle = async (db: Veritabani, ad_soyad: unknown, adres: unknown, telefon: unknown) =>
  (await db.query<MusteriSatiri>(
    'INSERT INTO musteriler (ad_soyad, adres, telefon) VALUES ($1, $2, $3) RETURNING *',
    [ad_soyad, adres, telefon]
  )).rows[0];

/** Otomatik kayıt için: yalnızca id döner. */
export const otomatikEkle = async (db: Veritabani, ad: string, telefon: string | null, adres: string | null) =>
  (await db.query<{ id: number }>(
    'INSERT INTO musteriler (ad_soyad, telefon, adres) VALUES ($1, $2, $3) RETURNING id',
    [ad, telefon, adres]
  )).rows[0].id;

export const guncelle = async (db: Veritabani, id: number, ad_soyad: unknown, adres: unknown, telefon: unknown) =>
  (await db.query<MusteriSatiri>(
    'UPDATE musteriler SET ad_soyad = $1, adres = $2, telefon = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *',
    [ad_soyad, adres, telefon, id]
  )).rows[0] ?? null;

/** Yalnızca verilen (boş olan) alanları doldurur. */
export const alanlariDoldur = async (db: Veritabani, id: number, alanlar: Array<[kolon: 'ad_soyad' | 'telefon' | 'adres', deger: string]>) => {
  const set: string[] = [];
  const degerler: unknown[] = [];
  for (const [kolon, deger] of alanlar) {
    degerler.push(deger);
    set.push(`${kolon} = $${degerler.length}`);
  }
  degerler.push(id);
  await db.query(`UPDATE musteriler SET ${set.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${degerler.length}`, degerler);
};

export const isEmirleriniAyir = async (db: Veritabani, musteriId: number) => {
  await db.query('UPDATE is_emirleri SET musteri_id = NULL WHERE musteri_id = $1', [musteriId]);
};

export const sil = async (db: Veritabani, id: number) => {
  await db.query('DELETE FROM musteriler WHERE id = $1', [id]);
};
