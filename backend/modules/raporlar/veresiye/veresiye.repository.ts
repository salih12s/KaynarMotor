/* Açık borç (kalan ödeme > 0) kayıtları için SQL. İş kuralı yok: yalnızca sorgular. */
import type { Veritabani } from '../../../core/tipler';

export const motorBorclari = async (db: Veritabani) =>
  (
    await db.query(`
      SELECT id, alici_adi AS musteri_adi, alici_telefon AS telefon,
             kalan_odeme, satis_fiyati AS toplam_tutar,
             COALESCE(satis_tarihi, tarih) AS tarih,
             plaka, marka, model, yil, km, odeme_sekli, alici_tc, alici_adres,
             alis_fiyati, noter_satis, fatura_kesildi, yevmiye_no, aciklama AS notlar,
             durum
      FROM ikinci_el_motorlar
      WHERE COALESCE(kalan_odeme, 0) > 0
      ORDER BY COALESCE(satis_tarihi, tarih) DESC
    `)
  ).rows;

export const servisBorclari = async (db: Veritabani) =>
  (
    await db.query(`
      SELECT ie.id, ie.fis_no, ie.musteri_ad_soyad AS musteri_adi, ie.telefon, ie.adres,
             ie.kalan_odeme, ie.gercek_toplam_ucret AS toplam_tutar,
             COALESCE(ie.tamamlama_tarihi, ie.created_at) AS tarih,
             ie.marka, ie.model_tip, ie.km, ie.ariza_sikayetler, ie.aciklama AS notlar,
             ie.odeme_detaylari, ie.durum, ie.tahmini_toplam_ucret
      FROM is_emirleri ie
      WHERE COALESCE(ie.kalan_odeme, 0) > 0
      ORDER BY COALESCE(ie.tamamlama_tarihi, ie.created_at) DESC
    `)
  ).rows;

export const aksesuarBorclari = async (db: Veritabani) =>
  (
    await db.query(`
      SELECT a.id, a.ad_soyad AS musteri_adi, a.telefon,
             a.kalan_odeme, a.toplam_satis AS toplam_tutar,
             COALESCE(a.satis_tarihi, a.created_at) AS tarih,
             a.aciklama AS notlar, a.odeme_sekli, a.odeme_detaylari, a.durum
      FROM aksesuarlar a
      WHERE COALESCE(a.kalan_odeme, 0) > 0
      ORDER BY COALESCE(a.satis_tarihi, a.created_at) DESC
    `)
  ).rows;

export const yedekParcaBorclari = async (db: Veritabani) =>
  (
    await db.query(`
      SELECT id, musteri_adi, musteri_telefon AS telefon,
             kalan_odeme, satis_fiyati AS toplam_tutar,
             alis_fiyati, created_at AS tarih, urun_adi
      FROM yedek_parcalar
      WHERE COALESCE(kalan_odeme, 0) > 0
      ORDER BY created_at DESC
    `)
  ).rows;
