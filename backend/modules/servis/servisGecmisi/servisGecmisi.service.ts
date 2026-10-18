/*
 * Müşteriye açık servis geçmişi: QR token ile erişilir, giriş gerektirmez. Yalnızca o plakaya ait servis kayıtları döner:
 * tarih, yapılan işlemler ve toplam tutar. Maliyet, kâr, müşteri iletişim bilgileri gibi alanlar ASLA dönülmez.
 */
import crypto from 'node:crypto';
import { BulunamadiHatasi, GecersizIstek } from '../../../core/dogrulama/dogrula';
import type { Veritabani } from '../../../core/tipler';
import * as repo from './servisGecmisi.repository';

/** Plakaya bağlı QR token'ı (yoksa oluşturur). Plaka büyük harfe ve A-Z0-9'a indirgenir. */
export const qrTokenAl = async (db: Veritabani, hamPlaka: unknown) => {
  const plaka = String(hamPlaka || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!plaka) throw new GecersizIstek('Plaka gerekli');
  await repo.tokenEkleYoksa(db, plaka, crypto.randomBytes(8).toString('hex'));
  return repo.tokenOku(db, plaka);
};

export const gecmisiGetir = async (db: Veritabani, hamToken: unknown) => {
  const token = String(hamToken || '').trim();
  if (!token) throw new GecersizIstek('Geçersiz bağlantı');

  const plaka = await repo.plakayiBul(db, token);
  if (plaka === null) throw new BulunamadiHatasi('Geçersiz veya süresi dolmuş bağlantı');

  const servisler = await repo.plakayaGoreServisler(db, plaka);
  const ids = servisler.map((s: any) => s.id);
  const parcalar = ids.length > 0 ? await repo.parcaIsimleri(db, ids) : [];

  return {
    plaka,
    servisler: servisler.map((s: any) => ({
      fis_no: s.fis_no,
      plaka: s.plaka,
      marka: s.marka,
      model_tip: s.model_tip,
      km: s.km,
      durum: s.durum,
      tarih: s.created_at,
      teslim_tarihi: s.teslim_tarihi,
      tamamlama_tarihi: s.tamamlama_tarihi,
      toplam_tutar: s.gercek_toplam_ucret,
      islemler: parcalar
        .filter((p: any) => p.is_emri_id === s.id)
        .map((p: any) => ({ islem: p.takilan_parca, adet: p.adet })),
    })),
  };
};
