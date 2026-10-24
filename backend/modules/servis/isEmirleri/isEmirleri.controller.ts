/* İş emri HTTP katmanı: isteği okur, servisi çağırır, yanıtı yazar. İş kuralı service'te. */
import { ISLEM_TIPLERI, logAktivite } from '../../../core/gunluk/activityLogger';
import { pool } from '../../../core/veritabani/db';
import { dogrula } from '../../../core/dogrulama/dogrula';
import { sarmala } from '../../../core/http/kontrolcu';
import { isEmriGuncelleGovdesi, isEmriOlusturGovdesi } from './isEmirleri.schemas';
import * as servis from './isEmirleri.service';
import * as gecmisServisi from '../servisGecmisi/servisGecmisi.service';

const metinSorgu = (deger: unknown): string | undefined => (typeof deger === 'string' && deger !== '' ? deger : undefined);

export const sonrakiFisNo = sarmala('Fiş numarası hatası:', async (_req, res) => {
  res.json(await servis.sonrakiFisNo(pool));
});

export const listele = sarmala('İş emri listeleme hatası:', async (req, res) => {
  res.json(
    await servis.listele(pool, {
      baslangic: metinSorgu(req.query.baslangic),
      bitis: metinSorgu(req.query.bitis),
      durum: metinSorgu(req.query.durum),
    }),
  );
});

export const detay = sarmala('İş emri detay hatası:', async (req, res) => {
  res.json(await servis.detay(pool, Number(req.params.id)));
});

export const olustur = sarmala('İş emri oluşturma hatası:', async (req, res) => {
  const govde = dogrula(isEmriOlusturGovdesi, req.body);
  const kayit = await servis.olustur(pool, govde, req.user);
  await logAktivite({
    kullanici_id: req.user.id,
    kullanici_adi: req.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.IS_EMRI_OLUSTUR,
    islem_detay: `Fiş No: ${kayit.fis_no} - ${govde.musteri_ad_soyad}`,
    hedef_tablo: 'is_emirleri',
    hedef_id: kayit.id,
  });
  res.status(201).json(kayit);
});

export const guncelle = sarmala('İş emri güncelleme hatası:', async (req, res) => {
  const id = Number(req.params.id);
  const kayit = await servis.guncelle(pool, id, dogrula(isEmriGuncelleGovdesi, req.body), req.user);
  await logAktivite({
    kullanici_id: req.user.id,
    kullanici_adi: req.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.IS_EMRI_GUNCELLE,
    islem_detay: `İş emri #${id} güncellendi`,
    hedef_tablo: 'is_emirleri',
    hedef_id: id,
  });
  res.json(kayit);
});

export const qrToken = sarmala('QR token hatası:', async (req, res) => {
  res.json(await gecmisServisi.qrTokenAl(pool, req.body?.plaka));
});

export const sil = sarmala('İş emri silme hatası:', async (req, res) => {
  const id = Number(req.params.id);
  await servis.sil(pool, id, req.user);
  await logAktivite({
    kullanici_id: req.user.id,
    kullanici_adi: req.user.kullanici_adi,
    islem_tipi: ISLEM_TIPLERI.IS_EMRI_SIL,
    islem_detay: `İş emri #${id} silindi`,
    hedef_tablo: 'is_emirleri',
    hedef_id: id,
  });
  res.json({ message: 'İş emri silindi' });
});
