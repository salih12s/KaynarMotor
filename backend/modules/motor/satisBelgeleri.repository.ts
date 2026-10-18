/* Satış belgeleri (sözleşme vb. dosyalar) için SQL. İş kuralı yok: yalnızca sorgular. */
import type { Veritabani } from '../../core/tipler';

export interface ArsivSatiri {
  motor_id: number; plaka: string | null; marka: string | null; model: string | null; durum: string;
  alis_tarihi: string | null; satis_tarihi: string | null;
  id: number; dosya_adi: string; mime: string; boyut: number; created_at: Date;
}

/**
 * Belgesi olan tüm motorlar. Sıra: önce satılanlar, en son satış en üstte; ardından stoktakiler, en yeni kayıt önde.
 * Fiyat, alıcı adı, TC gibi alanlar dönülmez; yalnızca araç kimliği, tarihler ve dosya bilgisi.
 */
export const arsivSatirlari = async (db: Veritabani): Promise<ArsivSatiri[]> =>
  (await db.query<ArsivSatiri>(
    `SELECT m.id AS motor_id, m.plaka, m.marka, m.model, m.durum,
            DATE_FORMAT(m.tarih, '%Y-%m-%d') AS alis_tarihi,
            DATE_FORMAT(COALESCE(m.satis_tarihi, DATE(m.tamamlama_tarihi)), '%Y-%m-%d') AS satis_tarihi,
            b.id, b.dosya_adi, b.mime, b.boyut, b.created_at
     FROM satis_belgeleri b
     JOIN ikinci_el_motorlar m ON m.id = b.motor_id
     ORDER BY (m.durum = 'tamamlandi') DESC, m.tamamlama_tarihi DESC, m.created_at DESC, m.id DESC,
              b.created_at ASC, b.id ASC`
  )).rows;

/** Bir satışın belge listesi (dosya içeriği YOK, yalnızca bilgi). */
export const motorBelgeleri = async (db: Veritabani, motorId: number) =>
  (await db.query(
    `SELECT id, motor_id, dosya_adi, mime, boyut, yukleyen_adi, created_at
     FROM satis_belgeleri WHERE motor_id = $1 ORDER BY created_at ASC, id ASC`, [motorId]
  )).rows;

/** Motorun var olup olmadığı ve mevcut belge adedi. */
export const motorVeAdet = async (db: Veritabani, motorId: number): Promise<{ id: number; adet: string | number } | null> =>
  (await db.query<{ id: number; adet: string | number }>(
    `SELECT m.id, (SELECT COUNT(*) FROM satis_belgeleri b WHERE b.motor_id = m.id) AS adet
     FROM ikinci_el_motorlar m WHERE m.id = $1`, [motorId]
  )).rows[0] ?? null;

export const ekle = async (
  db: Veritabani,
  b: { motorId: number; dosyaAdi: string; mime: string; icerik: Buffer; yukleyenId: number | null; yukleyenAdi: string | null }
) =>
  (await db.query(
    `INSERT INTO satis_belgeleri (motor_id, dosya_adi, mime, boyut, icerik, yukleyen_id, yukleyen_adi)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, motor_id, dosya_adi, mime, boyut, yukleyen_adi, created_at`,
    [b.motorId, b.dosyaAdi, b.mime, b.icerik.length, b.icerik, b.yukleyenId, b.yukleyenAdi]
  )).rows[0];

export const icerikBul = async (db: Veritabani, id: number) =>
  (await db.query<{ dosya_adi: string; mime: string; icerik: Buffer }>(
    'SELECT dosya_adi, mime, icerik FROM satis_belgeleri WHERE id = $1', [id]
  )).rows[0] ?? null;

export const sil = async (db: Veritabani, id: number) =>
  (await db.query<{ motor_id: number; dosya_adi: string }>(
    'DELETE FROM satis_belgeleri WHERE id = $1 RETURNING motor_id, dosya_adi', [id]
  )).rows[0] ?? null;
