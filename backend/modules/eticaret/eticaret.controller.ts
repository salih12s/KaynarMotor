/* E-ticaret HTTP katmanı: isteği okur, servisi çağırır, denetim günlüğünü yazar, yanıtı verir. */
import { ISLEM_TIPLERI, logAktivite } from '../../core/activityLogger';
import { pool } from '../../core/db';
import { dogrula } from '../../core/dogrula';
import { sarmala } from '../../core/kontrolcu';
import { platformGovdesi, satisGovdesi } from './eticaret.schemas';
import * as servis from './eticaret.service';

// ============ PLATFORMLAR ============
// Platform oranları sonraki satışların kâr hesabını değiştirir: kim ekledi/değiştirdi/sildi kayıt altında olmalı.

export const platformlariListele = sarmala('Platform listeleme hatası:', async (_req, res) => {
  res.json(await servis.platformlariListele(pool));
});

export const platformEkle = sarmala('Platform işlemi hatası:', async (req, res) => {
  const platform = await servis.platformEkle(pool, dogrula(platformGovdesi, req.body), req.user);
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.CREATE,
    islem_detay: `E-ticaret platformu eklendi: ${platform.platform_adi}`, hedef_tablo: 'eticaret_platformlar', hedef_id: platform.id,
  });
  res.status(201).json(platform);
});

export const platformGuncelle = sarmala('Platform işlemi hatası:', async (req, res) => {
  const id = Number(req.params.id);
  const platform = await servis.platformGuncelle(pool, id, dogrula(platformGovdesi, req.body), req.user);
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.UPDATE,
    islem_detay: `E-ticaret platformu güncellendi: ${platform.platform_adi}`, hedef_tablo: 'eticaret_platformlar', hedef_id: id,
  });
  res.json(platform);
});

export const platformSil = sarmala('Platform silme hatası:', async (req, res) => {
  const id = Number(req.params.id);
  if (await servis.platformSil(pool, id, req.user)) {
    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.DELETE,
      islem_detay: `E-ticaret platformu #${id} silindi`, hedef_tablo: 'eticaret_platformlar', hedef_id: id,
    });
  }
  res.json({ message: 'Platform silindi' });
});

// ============ SATIŞLAR ============

export const istatistik = sarmala('E-ticaret istatistik hatası:', async (_req, res) => {
  res.json(await servis.istatistik(pool));
});

export const satislariListele = sarmala('E-ticaret listeleme hatası:', async (_req, res) => {
  res.json(await servis.satislariListele(pool));
});

export const satisDetay = sarmala('E-ticaret detay hatası:', async (req, res) => {
  res.json(await servis.satisDetay(pool, Number(req.params.id)));
});

export const satisOlustur = sarmala('E-ticaret satış hatası:', async (req, res) => {
  const govde = dogrula(satisGovdesi, req.body);
  const kayit = await servis.satisOlustur(pool, govde);
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.ETICARET_SATIS_OLUSTUR,
    islem_detay: `E-ticaret satış: ${govde.urun_adi} x${kayit.adet}`, hedef_tablo: 'eticaret_satislar', hedef_id: kayit.id,
  });
  res.status(201).json(kayit);
});

export const satisGuncelle = sarmala('E-ticaret satış güncelleme hatası:', async (req, res) => {
  const id = Number(req.params.id);
  const kayit = await servis.satisGuncelle(pool, id, dogrula(satisGovdesi, req.body));
  await logAktivite({
    kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.ETICARET_SATIS_GUNCELLE,
    islem_detay: `E-ticaret satış #${id} güncellendi`, hedef_tablo: 'eticaret_satislar', hedef_id: id,
  });
  res.json(kayit);
});

export const satisSil = sarmala('E-ticaret satış silme hatası:', async (req, res) => {
  const id = Number(req.params.id);
  if (await servis.satisSil(pool, id)) {
    await logAktivite({
      kullanici_id: req.user.id, kullanici_adi: req.user.kullanici_adi, islem_tipi: ISLEM_TIPLERI.ETICARET_SATIS_SIL,
      islem_detay: `E-ticaret satış #${id} silindi`, hedef_tablo: 'eticaret_satislar', hedef_id: id,
    });
  }
  res.json({ message: 'E-ticaret satışı silindi' });
});
