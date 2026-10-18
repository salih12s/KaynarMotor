/* İş emirleri ve parçaları için SQL. İş kuralı yok: yalnızca sorgular. */
import type { Veritabani } from '../../core/tipler';
import type { IsEmriFiltresi } from './isEmirleri.schemas';

export interface YeniIsEmri {
  fisNo: number;
  musteriId: number | null;
  musteri_ad_soyad: unknown; adres: unknown; telefon: unknown; km: number;
  model_tip: unknown; marka: unknown; aciklama: unknown; ariza_sikayetler: unknown;
  tahmini_teslim_tarihi: unknown; tahmini_toplam_ucret: number;
  durum: string; odeme_detaylari: unknown; kalan_odeme: number;
  olusturan_kullanici_id: number; olusturan_kisi: string; teslim_eden_teknisyen: string;
  plaka: unknown; tamamlama_tarihi: Date | null;
}

export interface IsEmriGuncelleme {
  musteri_ad_soyad: unknown; adres: unknown; telefon: unknown; km: number;
  model_tip: unknown; marka: unknown; aciklama: unknown; ariza_sikayetler: unknown;
  tahmini_teslim_tarihi: unknown; tahmini_toplam_ucret: number;
  durum: unknown; odeme_detaylari: unknown;
  teslim_alan_ad_soyad: unknown; teslim_eden_teknisyen: unknown; teslim_tarihi: unknown;
  tamamlama_tarihi: Date | null; kalan_odeme: number; plaka: unknown; musteriId: number | null;
}

export interface ParcaSatiri {
  parca_kodu: string | null;
  adet: number | null;
}

export const sonrakiFisNoOnizleme = async (db: Veritabani): Promise<number> => {
  const sonuc = await db.query('SELECT COALESCE(MAX(fis_no), 0) + 1 AS next_fis_no FROM is_emirleri');
  // MAX()+1 MariaDB'de BIGINT (metin) döner; PostgreSQL'de int4 (sayı) dönüyordu.
  return Number(sonuc.rows[0].next_fis_no);
};

export const listele = async (db: Veritabani, { baslangic, bitis, durum }: IsEmriFiltresi) => {
  let sorgu = 'SELECT * FROM is_emirleri WHERE 1=1';
  const params: unknown[] = [];
  if (baslangic) {
    params.push(baslangic);
    sorgu += ` AND created_at >= $${params.length}`;
  }
  if (bitis) {
    params.push(bitis);
    sorgu += ` AND created_at <= DATE_ADD(CAST($${params.length} AS DATE), INTERVAL 1 DAY)`;
  }
  if (durum) {
    params.push(durum);
    sorgu += ` AND durum = $${params.length}`;
  }
  sorgu += ' ORDER BY created_at DESC';
  return (await db.query(sorgu, params)).rows;
};

export const idyeGoreBul = async (db: Veritabani, id: number) =>
  (await db.query('SELECT * FROM is_emirleri WHERE id = $1', [id])).rows[0] ?? null;

export const parcalariListele = async (db: Veritabani, isEmriId: number) =>
  (await db.query('SELECT * FROM parcalar WHERE is_emri_id = $1 ORDER BY id', [isEmriId])).rows;

/**
 * Fiş numarası kilidi: iki iş emri aynı anda oluşturulduğunda ikisi de aynı MAX(fis_no) değerini okuyup aynı numarayı
 * üretiyordu (fis_no UNIQUE). Tek satırlık kilit tablosundaki satır kilidi numara üretimini serileştirir ve
 * COMMIT/ROLLBACK'te kendiliğinden bırakılır. Kilit MAX okumasından ÖNCE alınır.
 */
export const fisNoKilidiniAl = async (db: Veritabani) => {
  await db.query('SELECT id FROM fis_no_kilidi WHERE id = 1 FOR UPDATE');
};

export const ekle = async (db: Veritabani, e: YeniIsEmri) =>
  (await db.query(
    `INSERT INTO is_emirleri (fis_no, musteri_id, musteri_ad_soyad, adres, telefon, km, model_tip, marka,
      aciklama, ariza_sikayetler, tahmini_teslim_tarihi, tahmini_toplam_ucret, durum, odeme_detaylari, kalan_odeme,
      olusturan_kullanici_id, olusturan_kisi, teslim_eden_teknisyen, plaka, tamamlama_tarihi)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     RETURNING *`,
    [e.fisNo, e.musteriId, e.musteri_ad_soyad, e.adres, e.telefon, e.km, e.model_tip, e.marka,
     e.aciklama, e.ariza_sikayetler, e.tahmini_teslim_tarihi, e.tahmini_toplam_ucret,
     e.durum, e.odeme_detaylari, e.kalan_odeme, e.olusturan_kullanici_id, e.olusturan_kisi, e.teslim_eden_teknisyen,
     e.plaka, e.tamamlama_tarihi]
  )).rows[0];

export const parcaEkle = async (
  db: Veritabani, isEmriId: number,
  p: { parca_kodu: unknown; takilan_parca: unknown; adet: number; birim_fiyat: number; maliyet: number; toplam_fiyat: number }
) => {
  await db.query(
    `INSERT INTO parcalar (is_emri_id, parca_kodu, takilan_parca, adet, birim_fiyat, maliyet, toplam_fiyat)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [isEmriId, p.parca_kodu, p.takilan_parca, p.adet, p.birim_fiyat, p.maliyet, p.toplam_fiyat]
  );
};

export const toplamlariGuncelle = async (db: Veritabani, id: number, toplamFiyat: number, toplamMaliyet: number, kar: number) => {
  await db.query(
    'UPDATE is_emirleri SET gercek_toplam_ucret = $1, toplam_maliyet = $2, kar = $3 WHERE id = $4',
    [toplamFiyat, toplamMaliyet, kar, id]
  );
};

/** Satırı kilitleyerek mevcut durumu okur: eşzamanlı düzenleme/silme sıraya girer (kilitsiz okuma ER_CHECKREAD ile düşerdi). */
export const durumunuKilitleyerekOku = async (db: Veritabani, id: number): Promise<string | null> => {
  const sonuc = await db.query<{ durum: string }>('SELECT durum FROM is_emirleri WHERE id = $1 FOR UPDATE', [id]);
  return sonuc.rows[0] ? sonuc.rows[0].durum : null;
};

export const kilitle = async (db: Veritabani, id: number) => {
  await db.query('SELECT id FROM is_emirleri WHERE id = $1 FOR UPDATE', [id]);
};

export const guncelle = async (db: Veritabani, id: number, e: IsEmriGuncelleme) => {
  await db.query(
    `UPDATE is_emirleri SET
      musteri_ad_soyad=$1, adres=$2, telefon=$3, km=$4, model_tip=$5, marka=$6,
      aciklama=$7, ariza_sikayetler=$8, tahmini_teslim_tarihi=$9, tahmini_toplam_ucret=$10,
      durum=$11, odeme_detaylari=$12, teslim_alan_ad_soyad=$13, teslim_eden_teknisyen=$14,
      teslim_tarihi=$15, tamamlama_tarihi=COALESCE($16, tamamlama_tarihi), kalan_odeme=$18, plaka=$19, musteri_id=COALESCE($20, musteri_id),
      updated_at=CURRENT_TIMESTAMP WHERE id=$17`,
    [e.musteri_ad_soyad, e.adres, e.telefon, e.km, e.model_tip, e.marka,
     e.aciklama, e.ariza_sikayetler, e.tahmini_teslim_tarihi, e.tahmini_toplam_ucret,
     e.durum, e.odeme_detaylari, e.teslim_alan_ad_soyad, e.teslim_eden_teknisyen,
     e.teslim_tarihi, e.tamamlama_tarihi, id, e.kalan_odeme, e.plaka, e.musteriId]
  );
};

export const parcaKodlariniOku = async (db: Veritabani, isEmriId: number): Promise<ParcaSatiri[]> =>
  (await db.query<ParcaSatiri>('SELECT parca_kodu, adet FROM parcalar WHERE is_emri_id = $1', [isEmriId])).rows;

export const parcalariSil = async (db: Veritabani, isEmriId: number) => {
  await db.query('DELETE FROM parcalar WHERE is_emri_id = $1', [isEmriId]);
};

export const sil = async (db: Veritabani, id: number) => {
  await db.query('DELETE FROM is_emirleri WHERE id = $1', [id]);
};
